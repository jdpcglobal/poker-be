/**
 * POST /api/admin/pokerDesks/[id]/force-close
 *
 * Admin emergency action: immediately closes a desk regardless of its current
 * state. Intended for desks that are stuck showing players seated or a game
 * in progress when the desk is actually empty (disconnected players, ghost
 * sessions, etc.).
 *
 * What this does:
 *   1. Refunds every seated player's balanceAtTable back to their wallet
 *      (cash desks only; practice desks have no real money).
 *   2. Clears all seats and the current game.
 *   3. Sets desk status -> 'closed', currentGameStatus -> 'finished'.
 *   4. Deletes any Bot records for this desk.
 *   5. Clears the in-memory deskRuntime entry (timers, caches).
 *   6. Emits 'desk:closed' to the socket room so any still-connected clients
 *      receive the event and can navigate away.
 *
 * This does NOT delete the desk document — use DELETE /api/admin/pokerDesks/[id]
 * after force-closing if you want to remove it entirely.
 */

import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

import dbConnect from '@/config/dbConnect';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { AuthError, successResponse, errorResponse } from '@/lib/api/errors';

import PokerDesk from '@/models/pokerDesk';
import Wallet from '@/models/wallet';
import WalletTransaction from '@/models/walletTransaction';
import Bot from '@/models/bot';
import { getIO, getDeskRuntime } from '@/socketServer';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AuthError('NOT_FOUND', 'Poker desk not found');
    }

    await dbConnect();

    const desk = await PokerDesk.findById(id);
    if (!desk) {
      throw new AuthError('NOT_FOUND', 'Poker desk not found');
    }

    if (desk.status === 'closed' && desk.seats.length === 0) {
      // Already clean — nothing to do.
      return successResponse({ message: 'Desk is already closed and empty' });
    }

    const isCash = desk.mode === 'cash';
    const refundSummary: { userId: string; refunded: number }[] = [];

    // ------------------------------------------------------------------
    // Refund seated players (cash desks only) inside a Mongo transaction.
    // ------------------------------------------------------------------
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (isCash) {
          for (const seat of desk.seats) {
            const balance = seat.balanceAtTable;
            if (balance <= 0) continue;

            const wallet = await Wallet.findOne({ userId: seat.userId }).session(session);
            if (!wallet) continue;

            wallet.balance += balance;
            await wallet.save({ session });

            await WalletTransaction.create(
              [
                {
                  userId:       seat.userId,
                  walletId:     wallet._id,
                  type:         'deskWithdraw',
                  amount:       balance,
                  currency:     desk.currency,
                  balanceAfter: wallet.balance,
                  remark:       'adminForceClose',
                  deskId:       desk._id,
                },
              ],
              { session }
            );

            refundSummary.push({
              userId:   seat.userId.toString(),
              refunded: balance,
            });
          }
        }

        // Wipe desk state atomically with the refunds.
        desk.seats             = [] as unknown as typeof desk.seats;
        desk.currentGame       = null;
        desk.status            = 'closed';
        desk.currentGameStatus = 'finished';
        await desk.save({ session });
      });
    } finally {
      await session.endSession();
    }

    // ------------------------------------------------------------------
    // Delete bot records (no wallet impact, outside the transaction).
    // ------------------------------------------------------------------
    await Bot.deleteMany({ deskId: desk._id });

    // ------------------------------------------------------------------
    // Clean up in-memory runtime: cancel timers, drop cache.
    // ------------------------------------------------------------------
    const runtime = getDeskRuntime().get(id);
    if (runtime) {
      if (runtime.turnTimer) {
        clearTimeout(runtime.turnTimer);
        runtime.turnTimer = null;
      }
      if (runtime.autoStartTimer) {
        clearTimeout(runtime.autoStartTimer);
        runtime.autoStartTimer = null;
      }
      getDeskRuntime().delete(id);
    }

    // ------------------------------------------------------------------
    // Notify any still-connected clients so they can navigate away.
    // ------------------------------------------------------------------
    try {
      getIO().to(id).emit('desk:closed', { reason: 'adminForceClose' });
    } catch {
      // Socket server not initialised (e.g. during tests) — not fatal.
    }

    return successResponse({
      message: 'Desk force-closed successfully',
      deskId:  id,
      refunds: refundSummary,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
