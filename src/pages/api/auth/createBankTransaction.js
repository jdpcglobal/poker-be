import dbConnect from '@/config/dbConnect';
import BankTransaction from '@/models/bankTransaction'; // Assuming this is your BankTransaction model
import BankAccount from '@/models/bankAccount'; // Import the BankAccount model
import User from '@/models/user'; // Assuming this is your User model
import { verifyToken } from '@/utils/jwt'; // Utility to verify token

export default async function handler(req, res) {
  // Connect to the database
  await dbConnect();

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Get the token from the Authorization header
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authorization token is required' });
  }

  try {
    // Verify the token and extract user ID
    const decoded = verifyToken(token);
    const userId = decoded.userId; // Assuming userId is stored in the token

    // Get parameters from request body
    const { bankId, amount, type, remark } = req.body;

    // Validate required fields
    if (!bankId || !amount || !type) {
      return res.status(400).json({ message: 'Bank ID, amount, and type are required' });
    }

    // Find the user to ensure the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the bank account by bankId and check if it belongs to the user
    const bankAccount = await BankAccount.findOne({ _id: bankId, userId });
    if (!bankAccount) {
      return res.status(400).json({ message: 'Invalid bank account ID. Please use a linked bank account.' });
    }

    // Create a new bank transaction
    const transaction = new BankTransaction({
      userId,
      bankId,
      amount,
      type,
      remark,
      createdOn: new Date(),
      status: 'waiting', // Set initial status
    });

    // Save the transaction to the database
    await transaction.save();

    // Respond with success
    return res.status(201).json({ message: 'Bank transaction created successfully', transaction });
  } catch (error) {
    // Handle errors
    console.error('Error creating bank transaction:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}
