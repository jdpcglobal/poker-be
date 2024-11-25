// pages/api/admin/users/[userId]/balance.ts

import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../../config/dbConnect';
import User from '../../../../../models/user';
import { verifyToken } from '../../../../../utils/jwt';
import cookie from 'cookie';
import { IWalletTransaction } from '@/utils/pokerModelTypes';
import BankTransaction from '@/models/bankTransaction';
import PokerGameArchive from '@/models/pokerGameArchive';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;
  const { userId} = req.body;
  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing or invalid' });
  }

  try {
    // Fetch user data from MongoDB
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch bank transaction data for the user
    const bankTransactions = await BankTransaction.find({ userId }).exec();

    // Fetch game statistics for the user
    const gameStats = await PokerGameArchive.aggregate([
      { $unwind: "$players" },
      { $match: { "players.userId": new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$players.userId",
          totalBet: { $sum: "$players.totalBet" },
          totalWinAmount: { $sum: { $sum: "$pots.winners.amount" } }
        }
      }
    ]);

    const userGameStats = gameStats[0] || { totalBet: 0, totalWinAmount: 0 };

    // Return all details in a single response
    return res.status(201).json({
      user,
      bankTransactions,
      userGameStats,
      walletTransactions: user.wallet.transactions || []
    });

} catch (error: any) {
    console.error('Error updating user balance:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
