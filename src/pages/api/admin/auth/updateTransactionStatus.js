import dbConnect from '../../../../config/dbConnect';
import BankTransaction from '../../../../models/bankTransaction';
import User from '../../../../models/user';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the token from cookies
    const { token } = cookie.parse(req.headers.cookie || '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify token
    const decodedToken = jwt.verify(token, JWT_SECRET);
    if (decodedToken.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { transactionId, newStatus } = req.body;

    // Validate inputs
    if (!transactionId || !newStatus) {
      return res.status(400).json({ error: 'Transaction ID and new status are required' });
    }

    // Find the transaction
    const transaction = await BankTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Retrieve user for wallet updates
    const user = await User.findById(transaction.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine wallet operation based on type and status change
    if (transaction.type === 'deposit') {
      // Deposit transaction mechanism
      if (['failed', 'waiting'].includes(transaction.status) && newStatus === 'completed') {
        user.wallet.balance += transaction.amount;
        user.wallet.transactions.push({
          amount: transaction.amount,
          status: 'completed',
          type: 'deposit',
          remark: 'Bank transaction completed',
        });
      } else if (transaction.status === 'completed' && ['failed', 'waiting'].includes(newStatus)) {
        if (user.wallet.balance >= transaction.amount) {
          user.wallet.balance -= transaction.amount;
          user.wallet.transactions.push({
            amount: transaction.amount,
            status: 'completed',
            type: 'withdraw',
            remark: 'Bank transaction reverted',
          });
        } else {
          return res.status(400).json({ error: 'Insufficient balance for this reversal' });
        }
      }
    } else if (transaction.type === 'withdraw') {
      // Withdraw transaction mechanism (reverse of deposit)
      if (['failed', 'waiting'].includes(transaction.status) && newStatus === 'completed') {
        if (user.wallet.balance >= transaction.amount) {
          user.wallet.balance -= transaction.amount;
          user.wallet.transactions.push({
            amount: transaction.amount,
            status: 'completed',
            type: 'withdraw',
            remark: 'Bank transaction completed',
          });
        } else {
          return res.status(400).json({ error: 'Insufficient balance for this transaction' });
        }
      } else if (transaction.status === 'completed' && ['failed', 'waiting'].includes(newStatus)) {
        user.wallet.balance += transaction.amount;
        user.wallet.transactions.push({
          amount: transaction.amount,
          status: 'completed',
          type: 'deposit',
          remark: 'Bank transaction reverted',
        });
      }
    }

    // Update transaction status
    transaction.status = newStatus;
    await transaction.save();
    await user.save();

    return res.status(200).json({ message: 'Transaction status updated successfully' });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
