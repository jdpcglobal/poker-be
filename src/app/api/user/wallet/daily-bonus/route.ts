import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

import dbConnect from '@/config/dbConnect';
import { requireUser } from '@/lib/auth/requireUser';
import { AuthError, successResponse, errorResponse } from '@/lib/api/errors';
import { serializeMoney } from '@/lib/api/money';
import Wallet from '@/models/wallet';
import WalletTransaction from '@/models/walletTransaction';
import DailyBonusState from '@/models/dailyBonusState';
import { computeDailyBonusAmount } from '@/config/creditsConfig';

/**
 * UTC calendar-day key ('YYYY-MM-DD') for a Date. We compare by calendar
 * day rather than a rolling 24h window so a user who claims at 11:58pm one
 * day and 12:02am the next isn't penalized for a 4-minute gap.
 */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    await dbConnect();

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw new AuthError('NOT_FOUND', 'Wallet not found for this user');
    }

    const now = new Date();
    let state = await DailyBonusState.findOne({ userId });
    if (!state) {
      state = new DailyBonusState({ userId, streak: 0, lastClaimedAt: null });
    }

    if (state.lastClaimedAt) {
      const lastKey = dayKey(state.lastClaimedAt);
      const todayKey = dayKey(now);

      if (lastKey === todayKey) {
        throw new AuthError('ALREADY_CLAIMED_TODAY', 'Daily bonus already claimed today');
      }

      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const isConsecutive = lastKey === dayKey(yesterday);

      // Any gap larger than one day breaks the streak back to day 1.
      state.streak = isConsecutive ? state.streak + 1 : 1;
    } else {
      state.streak = 1;
    }

    const amount = computeDailyBonusAmount(state.streak);
    state.lastClaimedAt = now;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
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
              remark: `dailyLoginBonus:streak${state.streak}`,
              completedAt: now,
            },
          ],
          { session }
        );

        await state.save({ session });
      });
    } finally {
      await session.endSession();
    }

    const updatedWallet = await Wallet.findOne({ userId });

    return successResponse({
      message: 'Daily bonus claimed',
      streak: state.streak,
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
