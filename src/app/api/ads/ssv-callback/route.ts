import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

import dbConnect from '@/config/dbConnect';
import Wallet from '@/models/wallet';
import WalletTransaction from '@/models/walletTransaction';
import AdRewardReceipt from '@/models/adRewardReceipt';
import AdRewardGrant from '@/models/adRewardGrant';
import AdCallbackLog from '@/models/adCallbackLog';
import { verifyAdReward, AdVerificationError } from '@/lib/ads/verifyAdToken';
import { verifyGrant, GrantVerificationError } from '@/lib/ads/adRewardGrant';
import { AD_REWARD_FIXED_MINOR, AD_REWARD_DAILY_CAP } from '@/config/creditsConfig';

/**
 * DIAGNOSTIC AID — logs every hit to AdCallbackLog before anything else runs,
 * so callback delivery can be confirmed by querying MongoDB directly rather
 * than needing Azure Log Stream / platform log access. Never throws — a
 * failure here must never block the actual credit logic below.
 */
async function logCallback(rawQuery: string, outcome: string, userId: string | null) {
  try {
    await AdCallbackLog.create({
      rawQuery,
      outcome,
      userId: userId ?? null,
      receivedAt: new Date(),
    });
  } catch (e) {
    console.error('[ssv-callback] failed to write AdCallbackLog (non-fatal):', e);
  }
}

/**
 * PUBLIC — configure this exact URL in the AdMob console as the Rewarded Ad
 * Unit's SSV callback URL. Google calls this directly, server-to-server, as
 * a GET with everything in the query string. There is NO Authorization
 * header on this call — it cannot be authenticated the normal way.
 *
 * Instead:
 *   - Google's own signature (verifyAdReward) proves a real ad completed.
 *   - Our grant signature + the AdRewardGrant row (verifyGrant + the
 *     redeemedAt check below) prove WHICH authenticated user requested this
 *     specific ad, and that this grant hasn't already been redeemed.
 *
 * Crediting is driven ONLY by the userId embedded in the verified grant —
 * never by a raw user_id/custom_data value taken at face value, since that
 * would be trivially spoofable by any client.
 *
 * Always responds 200 "OK" — including on verification failures — so we
 * don't leak verification internals to whatever hit this public URL, and so
 * Google doesn't retry a call we've already logged and rejected. Real
 * failures go to server logs, not the response body.
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const rawQuery = req.nextUrl.search.replace(/^\?/, '');

    // Log receipt IMMEDIATELY, before verification — this line firing proves
    // Google (or anyone) actually reached this URL at all, independent of
    // whether verification below succeeds.
    await logCallback(rawQuery, 'received', null);

    let verifiedAd;
    try {
      verifiedAd = await verifyAdReward(rawQuery);
    } catch (e) {
      if (e instanceof AdVerificationError) {
        console.error('[ssv-callback] ad verification failed:', e.code, e.message);
        await logCallback(rawQuery, `rejected:${e.code}`, null);
        return new NextResponse('OK', { status: 200 });
      }
      throw e;
    }

    // AdMob's custom_data param name — confirm against your actual AdMob
    // console SSV setup and adjust if it differs.
    const customData = req.nextUrl.searchParams.get('custom_data');
    if (!customData) {
      console.error('[ssv-callback] missing custom_data on otherwise-valid callback');
      await logCallback(rawQuery, 'rejected:MISSING_CUSTOM_DATA', null);
      return new NextResponse('OK', { status: 200 });
    }

    let grant;
    try {
      grant = verifyGrant(customData);
    } catch (e) {
      if (e instanceof GrantVerificationError) {
        console.error('[ssv-callback] grant verification failed:', e.code, e.message);
        await logCallback(rawQuery, `rejected:${e.code}`, null);
        return new NextResponse('OK', { status: 200 });
      }
      throw e;
    }

    const userId = grant.userId;

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      console.error('[ssv-callback] no wallet for userId from grant:', userId);
      await logCallback(rawQuery, 'rejected:NO_WALLET', userId);
      return new NextResponse('OK', { status: 200 });
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const claimedToday = await AdRewardReceipt.countDocuments({
      userId,
      createdAt: { $gte: startOfDay },
    });
    if (claimedToday >= AD_REWARD_DAILY_CAP) {
      console.warn('[ssv-callback] daily cap reached for userId:', userId);
      await logCallback(rawQuery, 'rejected:DAILY_CAP_REACHED', userId);
      return new NextResponse('OK', { status: 200 });
    }

    const amount = AD_REWARD_FIXED_MINOR;
    const now = new Date();

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Single-use grant check + redemption, inside the transaction to
        // close the race between two concurrent callbacks for the same grant.
        const grantRow = await AdRewardGrant.findOneAndUpdate(
          { nonce: grant.nonce, redeemedAt: null },
          { redeemedAt: now },
          { session }
        );
        if (!grantRow) {
          throw new Error('GRANT_ALREADY_REDEEMED');
        }

        // Unique index on (network, adTransactionId) — replay guard for
        // Google's own transaction id, independent of the grant check above.
        await AdRewardReceipt.create(
          [
            {
              userId,
              network: 'admob',
              adUnitId: verifiedAd.adUnitId,
              adTransactionId: verifiedAd.adTransactionId,
              amountCredited: amount,
              verifiedAt: now,
            },
          ],
          { session }
        );

        await Wallet.findOneAndUpdate(
          { userId },
          { $inc: { balance: amount } },
          { session }
        );

        await WalletTransaction.create(
          [
            {
              walletId: wallet._id,
              type: 'bonus',
              status: 'completed',
              amount: {
                cashAmount: 0,
                instantBonus: amount,
                lockedBonus: 0,
                gst: 0,
                tds: 0,
                otherDeductions: 0,
                total: amount,
              },
              currency: wallet.currency,
              remark: `adReward:${verifiedAd.adTransactionId}`,
              completedAt: now,
            },
          ],
          { session }
        );
      });
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err?.code === 11000 || err?.message === 'GRANT_ALREADY_REDEEMED') {
        console.warn('[ssv-callback] duplicate/replay rejected:', err.message ?? err.code);
        await logCallback(rawQuery, 'rejected:DUPLICATE_OR_REPLAY', userId);
        return new NextResponse('OK', { status: 200 });
      }
      throw e;
    } finally {
      await session.endSession();
    }

    await logCallback(rawQuery, 'credited', userId);
    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[ssv-callback] unhandled error:', err);
    return new NextResponse('OK', { status: 200 });
  }
}
