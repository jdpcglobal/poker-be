// // pages/api/admin/users.ts
// import { NextApiRequest, NextApiResponse } from 'next';
// import dbConnect from '../../../../config/dbConnect'; 
// import User from '../../../../models/user';
// import { verifyToken } from '../../../../utils/jwt';
// import cookie from 'cookie';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   await dbConnect();

//   const cookies = cookie.parse(req.headers.cookie || '');
//   const token = cookies.token;

//   if (!token) {
//     return res.status(401).json({ message: 'Authentication token is missing or invalid' });
//   }

//   try {
//     const payload : any = await verifyToken(token);
//     if (!payload.userId || payload.role !== 'superadmin') {
//       return res.status(403).json({ message: 'Unauthorized access' });
//     }

//     const { page = 1, limit = 10, status, startDate, endDate, minGamesPlayed } = req.query;

//     // Set default startDate as '1/1/2000' and default endDate as today
//     const defaultStartDate = new Date('2000-01-01');
//     const defaultEndDate = new Date();

//     // Convert to Date objects if not provided, otherwise use the provided values
//     const finalStartDate = startDate ? new Date(startDate as string) : defaultStartDate;
//     const finalEndDate = endDate ? new Date(endDate as string) : defaultEndDate;

//     const filters: any = {};
//     if (status) filters.status = status;
//     filters.registrationDate = { $gte: finalStartDate, $lte: finalEndDate };
//     if (minGamesPlayed) filters.gamesPlayed = { $gte: Number(minGamesPlayed) };

//     const users = await User.find(filters)
//       .skip((Number(page) - 1) * Number(limit))
//       .limit(Number(limit))
//       .sort({ registrationDate: -1 }) // Sort by registration date descending
//       .select('-password'); // Exclude password

//     const totalUsers = await User.countDocuments(filters);

//     return res.status(200).json({
//       users,
//       totalUsers,
//       totalPages: Math.ceil(totalUsers / Number(limit)),
//       currentPage: Number(page),
//     });
//   } catch (error:any) {
//     return res.status(500).json({ message: 'Internal server error', error: error.message });
//   }
// }


// pages/api/admin/users.ts 

import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../config/dbConnect';
import User from '../../../../models/user';
import PokerGameArchive from '../../../../models/pokerGameArchive';
import { verifyToken } from '../../../../utils/jwt';
import cookie from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;
 
  console.log("hi how are you",14546786542356);
 
  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing or invalid' });
  }

  try {
    const payload: any = await verifyToken(token);

    if (!payload.userId || payload.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    // Default date range
    const defaultStartDate = new Date('2000-01-01');
    const defaultEndDate = new Date();

    const finalStartDate = startDate ? new Date(startDate as string) : defaultStartDate;
    const finalEndDate = endDate ? new Date(endDate as string) : defaultEndDate;

    // Prepare query for User model
    const userQuery: any = {};
    if (status) userQuery.status = status;

    // Pagination
    const users = await User.find(userQuery)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Prepare user data with additional info
    const userDataPromises = users.map(async (user) => {
      // Calculate total deposit and withdrawal using wallet transactions
      const totalDeposit = user.wallet.transactions
        .filter((txn: any) => txn.type === 'deposit')
        .reduce((total: number, txn: any) => total + txn.amount, 0);

      const totalWithdraw = user.wallet.transactions
        .filter((txn: any) => txn.type === 'withdraw')
        .reduce((total: number, txn: any) => total + txn.amount, 0);

      // Get total games played and total games won
      const gamesPlayed = await PokerGameArchive.countDocuments({
        'players.userId': user._id,
        createdAt: { $gte: finalStartDate, $lte: finalEndDate }
      });

      const gamesWon = await PokerGameArchive.countDocuments({
        'players.userId': user._id,
        'pots.winners.playerId': user._id,
        createdAt: { $gte: finalStartDate, $lte: finalEndDate }
      });

      // Calculate total bet
      const totalBet = await PokerGameArchive.aggregate([
        { $match: { 'players.userId': user._id, createdAt: { $gte: finalStartDate, $lte: finalEndDate } } },
        { $unwind: '$players' },
        { $match: { 'players.userId': user._id } },
        { $group: { _id: null, totalBet: { $sum: '$players.totalBet' } } }
      ]);

      return {
        _id: user._id,
        username: user.username,
        mobileNumber: user.mobileNumber,
        walletBalance: user.wallet.balance, // Directly use wallet balance
        totalDeposit, // Calculated from wallet transactions
        totalWithdraw, // Calculated from wallet transactions
        gamesPlayed,
        gamesWon,
        totalBet: totalBet[0]?.totalBet || 0,
      };
    });

    const userData = await Promise.all(userDataPromises);

    // Count total users
    const totalUsers = await User.countDocuments(userQuery);

    res.status(200).json({
      users: userData,
      totalUsers,
      currentPage: Number(page),
      totalPages: Math.ceil(totalUsers / Number(limit)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
