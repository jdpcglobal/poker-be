// import dbConnect from '@/config/dbConnect';
// import Otp from '@/models/otp';
// import User from '@/models/user';
// import { signToken } from '@/utils/jwt';
// import {generateGamerName} from '../../../utils/helpers'
// export default async function handler(req, res) {
//   await dbConnect();

//   const { mobileNumber, otp } = req.body;

//   if (!mobileNumber || !otp) {
//     return res.status(400).json({ message: 'Mobile number and OTP are required' });
//   }
 

//   const otpRecord = await Otp.findOne({ mobileNumber });

//   if (!otpRecord || otpRecord.otp !== otp || otpRecord.expiresAt < new Date()) {
//     return res.status(400).json({ message: 'Invalid or expired OTP' });
//   }

//   let user = await User.findOne({ mobileNumber });

//   if (!user) {
//     const username = generateGamerName();
//     user = new User({ mobileNumber, username });
//     await user.save();
//   } else {
//     if (user.status !== 'active') {
//       return res.status(403).json({ message: `Your account is ${user.status}. Please contact support.` });
//     }
//     await user.updateLastLogin();
//   }

//   const token = signToken({ userId: user._id });

//   await Otp.deleteOne({ mobileNumber }); // Delete OTP after verification

//   return res.status(200).json({ message: 'Login successful', token, userName: user.username, userId:user._id});
// }

import dbConnect from '@/config/dbConnect';
import Otp from '@/models/otp';
import User from '@/models/user';
import { signToken } from '@/utils/jwt';
import { generateGamerName } from '../../../utils/helpers';

export default async function handler(req, res) {
  await dbConnect();

  const { mobileNumber, otp } = req.body;

  // Validate request parameters
  if (!mobileNumber || !otp) {
    return res.status(400).json({ message: 'Mobile number and OTP are required' });
  }

  // Find OTP record
  const otpRecord = await Otp.findOne({ mobileNumber });
  if (!otpRecord || otpRecord.otp !== otp || otpRecord.expiresAt < new Date()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  // Find user by mobile number
  let user = await User.findOne({ mobileNumber });

  // If user does not exist, create a new user
  if (!user) {
    const username = generateGamerName();
    
    // Create a new user with a default wallet and an initial transaction
    const initialTransaction = {
      createdOn: new Date(), // Automatically set to the current date/time
      completedOn: null, // Will be set when the transaction is completed
      status: 'successful', // Status of the transaction
      amount: 10, // Amount being added as a bonus
      type: 'bonus', // Type of transaction
      remark: 'game join bonus', // Custom remark if needed, otherwise uses default
      DeskId: null, // Can be null
      BankTransactionId: null, // Can be null
    };

    user = new User({
      mobileNumber,
      username,
      wallet: {
        balance: 0,      // Initial balance
        bonus: 10,       // Default bonus amount
        coins: 0,        // Initial coins
        transactions: [initialTransaction], // Add the initial transaction
      },
    });
    await user.save();
  } else {
    // Check if user status is active
    if (user.status !== 'active') {
      return res.status(403).json({ message: `Your account is ${user.status}. Please contact support.` });
    }
    // Update last login
    await user.updateLastLogin();
  }

  // Sign token for authentication
  const token = signToken({ userId: user._id });

  // Delete OTP after successful verification
  await Otp.deleteOne({ mobileNumber });

  // Respond with success message and user details
  return res.status(200).json({ message: 'Login successful', token, userName: user.username, userId: user._id, userWallet :user.wallet });
}
