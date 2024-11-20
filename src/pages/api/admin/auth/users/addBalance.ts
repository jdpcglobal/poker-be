// pages/api/admin/users/[userId]/balance.ts

import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../../config/dbConnect';
import User from '../../../../../models/user';
import { verifyToken } from '../../../../../utils/jwt';
import cookie from 'cookie';
import { IWalletTransaction } from '@/utils/pokerModelTypes';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing or invalid' });
  }

  try {
    const payload: any = verifyToken(token);

    if (!payload.userId || payload.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { userId,bonusAmount, remark, action } = req.body;
    console.log("req.query",req.query);
    console.log("req.body",req.body);
    console.log("amount",bonusAmount);

    if (!bonusAmount || bonusAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount. Must be a positive number.' });
    }

    if (!remark || typeof remark !== 'string' || remark.trim().length === 0) {
      return res.status(400).json({ message: 'Remark is required and must be a non-empty string.' });
    }

    if (action !== 'add' && action !== 'remove') {
      return res.status(400).json({ message: 'Invalid action. Must be "add" or "remove".' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (action === 'add') {
      // Add amount to wallet balance and bonus
      user.wallet.balance += bonusAmount;
      user.wallet.bonus += bonusAmount;
    } else if (action === 'remove') {
      // Deduct amount from wallet balance and bonus, ensuring no negative balance
      if (user.wallet.balance < bonusAmount) {
        return res.status(400).json({ message: 'Insufficient balance to remove the specified amount.' });
      }
      user.wallet.balance -= bonusAmount;
      user.wallet.bonus = Math.max(0, user.wallet.bonus - bonusAmount);
    }

    // Create a wallet transaction
    const walletTransaction: IWalletTransaction = {
      status: 'completed',
      amount: action === 'add' ? bonusAmount : -bonusAmount,
      type: 'bonus',
      remark,
      createdOn: new Date(),
      completedOn: new Date(),
    };

    user.wallet.transactions.push(walletTransaction);
    await user.save();

    return res.status(200).json({ message: `Amount ${action}ed successfully`, user });
  } catch (error: any) {
    console.error('Error updating user balance:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
