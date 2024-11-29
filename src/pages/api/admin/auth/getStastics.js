import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import User from '../../../../models/user'; // Adjust according to your actual model path
import BankTransaction from '../../../../models/bankTransaction';
import PokerGameArchive from '../../../../models/pokerGameArchive';
import dbConnect from '../../../../config/dbConnect';
// Connect to MongoDB
import cookie from 'cookie';

// Aggregate all statistics
const getStatistics = async () => {
  await dbConnect();

  // 1. User Statistics
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ status: 'active' });
  const inactiveUsers = await User.countDocuments({ status: 'inactive' });
  const suspendedUsers = await User.countDocuments({ status: 'suspended' });
  const totalGamesPlayed = await User.aggregate([{ $group: { _id: null, total: { $sum: '$gamesPlayed' } } }]);
  const totalGamesWon = await User.aggregate([{ $group: { _id: null, total: { $sum: '$gamesWon' } } }]);
  const totalWinnings = await User.aggregate([{ $group: { _id: null, total: { $sum: '$totalWinnings' } } }]);
  const usersRegisteredToday = await User.countDocuments({
    registrationDate: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lt: new Date(new Date().setHours(23, 59, 59, 999)),
    },
  });

  // 2. Bank Transaction Statistics
  const totalDepositSuccessful = await BankTransaction.aggregate([
    { $match: { type: 'deposit', status: 'successful' } },
    { $group: { _id: null, totalDeposit: { $sum: '$amount' } } }
  ]);
  const totalDepositFailed = await BankTransaction.aggregate([
    { $match: { type: 'deposit', status: 'failed' } },
    { $group: { _id: null, totalDeposit: { $sum: '$amount' } } }
  ]);
  const totalWithdrawSuccessful = await BankTransaction.aggregate([
    { $match: { type: 'withdraw', status: 'successful' } },
    { $group: { _id: null, totalWithdraw: { $sum: '$amount' } } }
  ]);
  const totalWithdrawFailed = await BankTransaction.aggregate([
    { $match: { type: 'withdraw', status: 'failed' } },
    { $group: { _id: null, totalWithdraw: { $sum: '$amount' } } }
  ]);
  const todaysDepositSuccessful = await BankTransaction.aggregate([
    { $match: { type: 'deposit', status: 'successful', createdOn: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lt: new Date(new Date().setHours(23, 59, 59, 999)) } } },
    { $group: { _id: null, todaysDeposit: { $sum: '$amount' } } }
  ]);
  const todaysWithdrawSuccessful = await BankTransaction.aggregate([
    { $match: { type: 'withdraw', status: 'successful', createdOn: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lt: new Date(new Date().setHours(23, 59, 59, 999)) } } },
    { $group: { _id: null, todaysWithdraw: { $sum: '$amount' } } }
  ]);
  const todaysDepositFailed = await BankTransaction.aggregate([
    { $match: { type: 'deposit', status: 'failed', createdOn: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lt: new Date(new Date().setHours(23, 59, 59, 999)) } } },
    { $group: { _id: null, todaysDeposit: { $sum: '$amount' } } }
  ]);
  const todaysWithdrawFailed = await BankTransaction.aggregate([
    { $match: { type: 'withdraw', status: 'failed', createdOn: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lt: new Date(new Date().setHours(23, 59, 59, 999)) } } },
    { $group: { _id: null, todaysWithdraw: { $sum: '$amount' } } }
  ]);

  // 3. Poker Game Archive Statistics
  const totalActivePokerGames = await PokerGameArchive.countDocuments({ status: 'in-progress' });
  const totalFinishedPokerGames = await PokerGameArchive.countDocuments({ status: 'finished' });
  const totalPotInActiveGames = await PokerGameArchive.aggregate([
    { $match: { status: 'in-progress' } },
    { $group: { _id: null, totalPot: { $sum: '$totalBet' } } }
  ]);
  const totalPotInFinishedGames = await PokerGameArchive.aggregate([
    { $match: { status: 'finished' } },
    { $group: { _id: null, totalPot: { $sum: '$totalBet' } } }
  ]);
  const mostPlayedPokerDesk = await PokerGameArchive.aggregate([
    { $group: { _id: '$deskId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);
  const topPlayersByTotalBet = await PokerGameArchive.aggregate([
    { $unwind: '$players' },
    { $group: { _id: '$players.userId', totalBet: { $sum: '$players.totalBet' } } },
    { $sort: { totalBet: -1 } },
    { $limit: 10 }
  ]);

  return {
    userStats: {
      totalUsers,
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      totalGamesPlayed: totalGamesPlayed[0]?.total || 0,
      totalGamesWon: totalGamesWon[0]?.total || 0,
      totalWinnings: totalWinnings[0]?.total || 0,
      usersRegisteredToday
    },
    bankTransactionStats: {
      totalDepositSuccessful: totalDepositSuccessful[0]?.totalDeposit || 0,
      totalDepositFailed: totalDepositFailed[0]?.totalDeposit || 0,
      totalWithdrawSuccessful: totalWithdrawSuccessful[0]?.totalWithdraw || 0,
      totalWithdrawFailed: totalWithdrawFailed[0]?.totalWithdraw || 0,
      todaysDepositSuccessful: todaysDepositSuccessful[0]?.todaysDeposit || 0,
      todaysWithdrawSuccessful: todaysWithdrawSuccessful[0]?.todaysWithdraw || 0,
      todaysDepositFailed: todaysDepositFailed[0]?.todaysDeposit || 0,
      todaysWithdrawFailed: todaysWithdrawFailed[0]?.todaysWithdraw || 0
    },
    pokerGameStats: {
      totalActivePokerGames,
      totalFinishedPokerGames,
      totalPotInActiveGames: totalPotInActiveGames[0]?.totalPot || 0,
      totalPotInFinishedGames: totalPotInFinishedGames[0]?.totalPot || 0,
      mostPlayedPokerDesk: mostPlayedPokerDesk[0]?._id || null,
      topPlayersByTotalBet
    }
  };
};

// API handler
export default async function handler(req, res) {
  if (req.method === 'GET') {

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;
      
    if (!token) {
        return res.status(401).json({ message: 'Authentication token is missing or invalid' });
    }
    try {
      const stats = await getStatistics();
      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
}
