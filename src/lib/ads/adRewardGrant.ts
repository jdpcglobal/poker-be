/**
 * @fileoverview Signs and verifies short-lived "ad reward grants" — the
 * bridge between an authenticated user session and AdMob's unauthenticated,
 * server-to-server SSV callback.
 *
 * Why this exists: AdMob's SSV callback is Google calling OUR backend
 * directly (GET, no Authorization header possible — Google has no user
 * session to send). Crediting based on a raw `user_id`/`custom_data` value
 * taken at face value would let any client claim to be any user. Instead:
 *
 *   1. Authenticated client calls POST /api/user/wallet/ad-reward/request.
 *      We mint a grant — { userId, nonce, exp } — HMAC-signed, and persist
 *      a matching AdRewardGrant row (unredeemed).
 *   2. Client passes the returned token as the rewarded ad's `custom_data`.
 *   3. Google calls GET /api/ads/ssv-callback and echoes `custom_data` back.
 *      We verify OUR signature (proves the grant wasn't tampered with) and
 *      check the AdRewardGrant row (proves it hasn't expired or already
 *      been redeemed) before crediting the userId embedded IN THE GRANT —
 *      never a client-supplied user_id.
 */

import crypto from 'crypto';

const SECRET = process.env.AD_REWARD_GRANT_SECRET;

/** Generous window for ad load + watch time. */
const GRANT_TTL_MS = 10 * 60 * 1000;

export interface GrantPayload {
  userId: string;
  nonce: string;
  exp: number; // epoch ms
}

function getSecret(): string {
  if (!SECRET) {
    throw new Error(
      'AD_REWARD_GRANT_SECRET is not set — required to sign ad-reward grants.'
    );
  }
  return SECRET;
}

function sign(payloadB64: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
}

/**
 * Mints a new signed grant token for the given user. Returns the token
 * (opaque to the client — pass straight through to the ad SDK's
 * custom_data) plus the raw fields so the route can persist the matching
 * AdRewardGrant row.
 */
export function issueGrant(userId: string): { token: string; nonce: string; expiresAt: Date } {
  const nonce = crypto.randomBytes(16).toString('base64url');
  const exp = Date.now() + GRANT_TTL_MS;
  const payload: GrantPayload = { userId, nonce, exp };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(payloadB64);
  return { token: `${payloadB64}.${signature}`, nonce, expiresAt: new Date(exp) };
}

export class GrantVerificationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'GrantVerificationError';
    this.code = code;
  }
}

/**
 * Verifies a grant token's signature and expiry. Does NOT check redemption
 * state — the caller checks/marks that against the AdRewardGrant row inside
 * a DB transaction, to close the race between two concurrent callbacks for
 * the same grant.
 */
export function verifyGrant(token: string): GrantPayload {
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new GrantVerificationError('MALFORMED_GRANT', 'Grant token is malformed');
  }
  const [payloadB64, signature] = parts;

  const expected = Buffer.from(sign(payloadB64));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new GrantVerificationError('INVALID_GRANT_SIGNATURE', 'Grant signature is invalid');
  }

  let payload: GrantPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new GrantVerificationError('MALFORMED_GRANT', 'Grant payload is not valid JSON');
  }

  if (!payload.userId || !payload.nonce || !payload.exp) {
    throw new GrantVerificationError('MALFORMED_GRANT', 'Grant payload missing required fields');
  }
  if (Date.now() > payload.exp) {
    throw new GrantVerificationError('EXPIRED_GRANT', 'Grant token has expired');
  }

  return payload;
}
