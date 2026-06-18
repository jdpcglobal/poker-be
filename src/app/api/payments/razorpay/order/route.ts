import { NextRequest } from 'next/server';
import Razorpay from 'razorpay';

import dbConnect from '@/config/dbConnect';
import { DEFAULT_CURRENCY } from '@/config/constants';
import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/errors';
import { parseAmount } from '@/lib/api/money';
import { ServiceError } from '@/services/gameService';
import GatewayTransaction from '@/models/gatewayTransaction';

export async function POST(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    await dbConnect();

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new ServiceError('RAZORPAY_NOT_CONFIGURED', 'Payment gateway is not configured');
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const body = await req.json().catch(() => ({}));
    const parsedAmount = parseAmount((body as { amount?: unknown }).amount, DEFAULT_CURRENCY);

    // receipt must be ≤ 40 chars; ObjectId (24) + '-' + timestamp (13) = 38.
    const receipt = `${userId}-${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: parsedAmount,
      currency: DEFAULT_CURRENCY,
      receipt,
    });

    await GatewayTransaction.create({
      userId,
      gateway: 'razorpay',
      amount: parsedAmount,
      currency: DEFAULT_CURRENCY,
      status: 'created',
      gatewayOrderId: order.id,
    });

    return successResponse(
      {
        orderId: order.id,
        // Raw integer intentional: frontend passes this directly to the
        // Razorpay checkout SDK, which requires the minor-unit integer.
        amount: parsedAmount,
        currency: DEFAULT_CURRENCY,
        keyId: razorpayKeyId,
      },
      201
    );
  } catch (err) {
    return errorResponse(err);
  }
}
