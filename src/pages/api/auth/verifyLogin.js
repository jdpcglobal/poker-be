import dbConnect from '@/config/dbConnect';
import Otp from '@/models/otp';
import User from '@/models/user';
import { signToken } from '@/utils/jwt';
import {generateGamerName} from '../../../utils/helpers'
export default async function handler(req, res) {
  await dbConnect();

  const { mobileNumber, otp } = req.body;

  if (!mobileNumber || !otp) {
    return res.status(400).json({ message: 'Mobile number and OTP are required' });
  }
 

  const otpRecord = await Otp.findOne({ mobileNumber });

  if (!otpRecord || otpRecord.otp !== otp || otpRecord.expiresAt < new Date()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  let user = await User.findOne({ mobileNumber });

  if (!user) {
    const username = generateGamerName();
    user = new User({ mobileNumber, username });
    await user.save();
  } else {
    if (user.status !== 'active') {
      return res.status(403).json({ message: `Your account is ${user.status}. Please contact support.` });
    }
    await user.updateLastLogin();
  }

  const token = signToken({ userId: user._id });

  await Otp.deleteOne({ mobileNumber }); // Delete OTP after verification

  return res.status(200).json({ message: 'Login successful', token, userName: user.username, userId:user._id});
}
