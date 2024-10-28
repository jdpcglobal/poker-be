import dbConnect from '@/config/dbConnect';
import User from '@/models/user'; // Import your User model
import { verifyToken } from '@/utils/jwt'; // Import your JWT verification function
import { IBankAccount } from '@/models/user'; // Import the IBankAccount interface

export default async function handler(req , res) {
  // Connect to the database
  await dbConnect();

  // Check if the request method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Get the token from headers
  const token = req.headers.authorization?.split(' ')[1]; // Bearer token

  // Validate token
  if (!token) {
    return res.status(401).json({ message: 'Authorization token is required' });
  }

  try {
    // Verify token and extract user ID
    const decoded = verifyToken(token);
    const userId = decoded?.userId; // Assuming your token includes userId
     if(!userId){
       return res.status(401).json({ message: 'Authorization token is not valid' });
     }
    // Destructure the request body
    const { accountNumber, bankName, ifscCode, accountHolderName } = req.body;

    // Validate request parameters
    if (!accountNumber || !bankName || !ifscCode || !accountHolderName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find user by userId
    const user = await User.findById(userId);

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a new bank account object
    const newBankAccount = {
      accountNumber,
      bankName,
      ifscCode,
      accountHolderName,
    };

    // Add the new bank account to the user's bankAccounts array
    user.bankAccounts.push(newBankAccount);

    // Save the updated user document
    await user.save();

    // Return success response
    return res.status(201).json({ message: 'Bank account added successfully', bankAccount: newBankAccount });
  } catch (error) {
    console.error('Error adding bank account:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
