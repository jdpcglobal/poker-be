import { NextResponse } from 'next/server';

/**
 * DEPRECATED — this endpoint assumed a client could forward AdMob's SSV
 * callback to an authenticated route. That's not how AdMob SSV works:
 * Google calls the backend directly, server-to-server, with no user auth
 * token available on that call. Replaced by a two-step flow:
 *
 *   1. POST /api/user/wallet/ad-reward/request  (authenticated — mints a grant)
 *   2. GET  /api/ads/ssv-callback                (public — Google calls this)
 *
 * See credits-endpoints.md for the full flow and required env vars.
 * Left as a stub (not deleted) so any stray client build still calling the
 * old shape gets a clear, actionable error instead of a silent 404.
 */
export async function POST() {
  return NextResponse.json(
    {
      message:
        'This endpoint is deprecated. Call POST /api/user/wallet/ad-reward/request first, ' +
        'then configure GET /api/ads/ssv-callback as your AdMob SSV callback URL.',
      code: 'ENDPOINT_DEPRECATED',
    },
    { status: 410 }
  );
}
