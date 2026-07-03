import { NextRequest } from 'next/server';

import dbConnect from '@/config/dbConnect';
import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/errors';
import { issueGrant } from '@/lib/ads/adRewardGrant';
import AdRewardGrant from '@/models/adRewardGrant';

/**
 * Authenticated. Call this right before showing a rewarded ad. Returns a
 * short-lived signed grant token — pass it as the ad SDK's `custom_data`
 * when loading/showing the ad. Google's SSV callback echoes it back to
 * GET /api/ads/ssv-callback, which is how that unauthenticated,
 * server-to-server endpoint knows which user to credit.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    await dbConnect();

    const { token, nonce, expiresAt } = issueGrant(userId);

    await AdRewardGrant.create({
      userId,
      nonce,
      expiresAt,
      redeemedAt: null,
    });

    return successResponse({
      message: 'Ad reward grant issued',
      grantToken: token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
