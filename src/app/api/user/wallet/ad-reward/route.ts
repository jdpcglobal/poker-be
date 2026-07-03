import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

import dbConnect from '@/config/dbConnect';
import { requireUser } from '@/lib/auth/requireUser';
import { AuthError, successResponse, errorResponse } from '@/lib/api/errors';
import { serializeMoney } from '@/lib/api/money';
import Wallet from '@/models/wallet';
import WalletTransaction from '@/models/walletTransaction';
import AdRewardReceipt from '@/models/adRewardReceipt';
import { verifyAdReward, AdVerificationError } from '@/lib/ads/verifyAdToken';
import { AD_REWARD_FIXED_MINOR, AD_REWARD_DAILY_CAP } from '@/config/creditsConfig';

export async function POST(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    await dbConnect();

    const body = await req.json().catch(() => null);
    if (!body || typeof body.adCallback !== 'string') {
      throw new AuthError(
        'MISSING_AD_CALLBACK',
        'Request body must include adCallback (the signed SSV query string from the ad SDK)'
      );
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw new AuthError('NOT_FOUND', 'Wallet not found for this user');
    }

    // Verify the signature BEFORE any DB read — forged callbacks are
    // rejected without touching the database. Same pattern as the Razorpay
    // HMAC check in payments/razorpay/verify.
    let verified;
    try {
      verified = await verifyAdReward(body.adCallback);
    } catch (e) {
      if (e instanceof AdVerificationError) {
        throw new AuthError(e.code, e.message);
      }
      throw e;
    }

    // Daily abuse ceiling — count today's already-credited claims for this user.
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const claimedToday = await AdRewardReceipt.countDocuments({
      userId,
      createdAt: { $gte: startOfDay },
    });
    if (claimedToday >= AD_REWARD_DAILY_CAP) {
      throw new AuthError('AD_REWARD_DAILY_CAP_REACHED', 'Daily ad-reward limit reached');
    }

    const amount = AD_REWARD_FIXED_MINOR;
    const now = new Date();

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Unique index on (network, adTransactionId) is the real replay
        // guard: a duplicate signed callback throws E11000 here and the
        // whole transaction — including the wallet credit — rolls back.
        await AdRewardReceipt.create(
          [
            {
              userId,
              network: 'admob',
              adUnitId: verified.adUnitId,
              adTransactionId: verified.adTransactionId,
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
              remark: `adReward:${verified.adTransactionId}`,
              completedAt: now,
            },
          ],
          { session }
        );
      });
    } catch (e: unknown) {
      const mongoErr = e as { code?: number };
      if (mongoErr?.code === 11000) {
        throw new AuthError('DUPLICATE_AD_CLAIM', 'This ad reward has already been credited');
      }
      throw e;
    } finally {
      await session.endSession();
    }

    const updatedWallet = await Wallet.findOne({ userId });

    return successResponse({
      message: 'Ad reward credited',
      credited: serializeMoney(amount, wallet.currency),
      wallet: {
        balance: serializeMoney(updatedWallet!.balance, updatedWallet!.currency),
        currency: updatedWallet!.currency,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
