import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../config/dbConnect';
import BankTransaction from '../../../../models/bankTransaction';
import User from '../../../../models/user';
import BankAccount from '../../../../models/bankAccount';
import mongoose from 'mongoose';
import { verifyToken } from '../../../../utils/jwt';
import cookie from 'cookie';

export default async function handler(req, res) {
  await dbConnect();

  const { page = 1, limit = 10, userId, bankId } = req.body;
  
  const { token } = cookie.parse(req.headers.cookie || '');
 
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Extract cookies from the request headers using the 'cookie' package
 // const token = req.cookies.get('token')?.value
  console.log("token", token);
  
  // Check if token is missing or invalid
  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing or invalid' });
  }

  try {
    // Verify JWT token
    const payload = verifyToken(token);
    if (!payload.userId || !payload.role || payload.role !== 'superadmin' ) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const pageNumber = parseInt(page);
    const pageLimit = parseInt(limit);

    // Construct filters based on query parameters
    const filters = {};
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid userId format' });
      }
      filters.userId = userId;
    }

    if (bankId) {
      if (!mongoose.Types.ObjectId.isValid(bankId)) {
        return res.status(400).json({ message: 'Invalid bankId format' });
      }
      filters.bankId = bankId;
    }

    // Fetch transactions with pagination and populate referenced fields
    const transactions = await BankTransaction.find(filters)
      .skip((pageNumber - 1) * pageLimit)
      .limit(pageLimit)
      .populate({ path: 'userId', model: User, select: 'username mobileNumber' })
      .populate({ path: 'bankId', model: BankAccount, select: 'accountNumber bankName' })
      .lean();

    return res.status(200).json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error.message || error);
    return res.status(500).json({ message: `Failed to fetch transactions: ${error.message || 'Unknown error'}` });
  }
};
 
