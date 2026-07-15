import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { successResponse, errorResponse } from '@/lib/api/errors';
import { verifyToken } from '@/utils/jwt';
import dbConnect from '@/config/dbConnect';
import User from '@/models/user';
import Wallet from '@/models/wallet';
import WalletTransaction from '@/models/walletTransaction';
import BankAccount from '@/models/bankAccount';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return errorResponse(
        Object.assign(new Error('Deletion token is missing. Please request a new link.'), { code: 'MISSING_ID_TOKEN' })
      );
    }

    // Verify the JWT and check the purpose claim.
    const payload = verifyToken(token) as (ReturnType<typeof verifyToken> & { purpose?: string }) | null;

    if (!payload || !payload.userId || (payload as { purpose?: string }).purpose !== 'account-deletion') {
      return errorResponse(
        Object.assign(new Error('This link is invalid or has expired. Please request a new one.'), { code: 'INVALID_GOOGLE_TOKEN' })
      );
    }

    await dbConnect();

    const userId = new mongoose.Types.ObjectId(payload.userId);

    // Confirm user still exists before starting the transaction.
    const user = await User.findById(userId).select('_id').lean();
    if (!user) {
      // Already deleted — treat as success so the confirm page shows cleanly.
      return successResponse({ message: 'Your account has been deleted successfully.' });
    }

    // Find the wallet so we can cascade-delete its transactions.
    const wallet = await Wallet.findOne({ userId }).select('_id').lean();

    // Delete everything inside a single Mongo session/transaction.
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (wallet) {
          await WalletTransaction.deleteMany({ walletId: wallet._id }, { session });
          await Wallet.deleteOne({ _id: wallet._id }, { session });
        }
        await BankAccount.deleteMany({ userId }, { session });
        await User.deleteOne({ _id: userId }, { session });
      });
    } finally {
      await session.endSession();
    }

    return successResponse({ message: 'Your account has been deleted successfully.' });
  } catch (err) {
    return errorResponse(err);
  }
}
