import dbConnect from '../../../config/dbConnect';
import Otp from '../../../models/otp';
import { generateOtp } from '../../../utils/helpers';

const MAX_OTP_REQUESTS = 3;
const TIME_FRAME =  10 * 60 * 1000; // 1 hours
const BLOCK_DURATION = 10 * 60 * 1000; // Block duration of 30 minutes

export default async function handler(req, res) {
  await dbConnect();

  const { mobileNumber } = req.body;

  if (!mobileNumber) {
    return res.status(400).json({ message: 'Mobile number is required' });
  }

  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - TIME_FRAME);

  // Find the OTP document for this mobile number created within the last 6 hours
  let otpRecord = await Otp.findOne({
    mobileNumber,
    createdAt: { $gte: sixHoursAgo },
  });

  if (otpRecord) {
    if (otpRecord.blockedUntil && now < otpRecord.blockedUntil) {
      return res.status(429).json({ message: `OTP requests are blocked until ${otpRecord.blockedUntil}. Please try again later.` });
    }

    if (otpRecord.requestCount >= MAX_OTP_REQUESTS) {
      // Block the user and reset the request count
      otpRecord.blockedUntil = new Date(now.getTime() + BLOCK_DURATION);
      otpRecord.requestCount = 0;
      await otpRecord.save();

      return res.status(429).json({ message: `Too many OTP requests. You are blocked until ${otpRecord.blockedUntil}.` });
    }

    // Update the existing OTP record
    otpRecord.otp = generateOtp(); // Generate a new OTP
    otpRecord.expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // Extend the expiration time
    otpRecord.requestCount += 1; // Increment the request count
    otpRecord.blockedUntil = null; // Unblock if previously blocked
    await otpRecord.save();

    // Send the OTP to the user's mobile number (implement your SMS sending logic here)

    return res.status(200).json({ message: 'OTP sent successfully', otp: otpRecord.otp });
  } else {
    // Create a new OTP record if no record exists within the time frame
    const otp = generateOtp();

    otpRecord = await Otp.create({
      mobileNumber,
      otp,
      expiresAt: new Date(now.getTime() + 10 * 60 * 1000), // OTP expires in 10 minutes
    });

    // Send the OTP to the user's mobile number (implement your SMS sending logic here)

    return res.status(200).json({ message: 'OTP sent successfully', otp });
  }
}
