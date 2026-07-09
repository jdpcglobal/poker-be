/**
 * @fileoverview Verifies signed ad-reward callbacks from the ad SDK.
 *
 * Written for AdMob-style Server-Side Verification (SSV): the rewarded-ad
 * SDK produces a callback URL with query params, the last two of which are
 * `signature` and `key_id`. Google publishes rotating ECDSA (P-256) public
 * keys at a known endpoint; we verify the signature over every preceding
 * query param (in the order sent) using the key referenced by `key_id`.
 *
 * Reference: https://developers.google.com/admob/android/rewarded-video-ssv
 *
 * IMPORTANT — if you're using a different ad network (Unity Ads, ironSource,
 * AppLovin, etc.), the callback shape and signature scheme differ. Keep the
 * verifyAdReward() input/output contract the same but swap out
 * fetchPublicKeys() and the verify step for that network's SSV spec.
 *
 * Anti-replay note: this file only checks the signature and staleness
 * window. The actual "can this transaction_id be credited only once" guard
 * lives in the unique index on AdRewardReceipt (network + adTransactionId)
 * — that's the authoritative replay defense, not this file's timestamp check.
 */

import crypto from 'crypto';

const KEY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — keys rotate infrequently
const PUBLIC_KEYS_URL =
  process.env.AD_SSV_PUBLIC_KEYS_URL ?? 'https://www.gstatic.com/admob/reward/verifier-keys.json';

/** Reject callbacks whose timestamp is older than this — narrows the replay window. */
const MAX_CALLBACK_AGE_MS = 5 * 60 * 1000;

interface CachedKeys {
  fetchedAt: number;
  keys: Map<string, string>; // keyId -> base64 DER public key
}

let keyCache: CachedKeys | null = null;

async function fetchPublicKeys(): Promise<Map<string, string>> {
  if (keyCache && Date.now() - keyCache.fetchedAt < KEY_CACHE_TTL_MS) {
    return keyCache.keys;
  }

  const res = await fetch(PUBLIC_KEYS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch ad SSV public keys: ${res.status}`);
  }
  const body: { keys?: Array<{ keyId: number | string; pem?: string; base64?: string }> } =
    await res.json();

  const keys = new Map<string, string>();
  for (const entry of body.keys ?? []) {
    const raw = entry.base64 ?? entry.pem;
    if (!raw) continue;
    keys.set(String(entry.keyId), raw);
  }

  keyCache = { fetchedAt: Date.now(), keys };
  return keys;
}

export interface VerifiedAdReward {
  adUnitId: string;
  adTransactionId: string;
  rewardAmount: number;
  rewardItem: string;
  timestamp: number;
}

export class AdVerificationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AdVerificationError';
    this.code = code;
  }
}

/**
 * Verifies a signed ad-reward callback query string — everything after `?`
 * in the SSV callback URL the ad network hits (forwarded to this route by
 * the client, or received directly server-side depending on your ad SDK
 * integration).
 *
 * IMPORTANT: per Google's spec, the content being verified is the RAW
 * substring of the original query string up to (not including) `&signature=`
 * — NOT a re-serialized/rebuilt string. Rebuilding via URLSearchParams.toString()
 * can change percent-encoding/ordering versus what Google actually signed,
 * which silently breaks verification for every genuine callback. This
 * function deliberately does substring extraction, not URLSearchParams,
 * for the signed-content portion.
 *
 * @throws AdVerificationError on any verification failure.
 */
export async function verifyAdReward(rawQuery: string): Promise<VerifiedAdReward> {
  const SIGNATURE_PARAM = 'signature=';
  const KEY_ID_PARAM = 'key_id=';

  const sigIndex = rawQuery.indexOf(SIGNATURE_PARAM);
  if (sigIndex === -1) {
    throw new AdVerificationError(
      'MISSING_SIGNATURE',
      'Ad reward callback is missing signature or key_id'
    );
  }

  // Everything before "&signature=" is the exact content Google signed.
  // sigIndex - 1 strips the preceding '&' (per Google's reference impl).
  const signedContent = rawQuery.substring(0, sigIndex - 1);

  const afterSig = rawQuery.substring(sigIndex + SIGNATURE_PARAM.length);
  const keyIdIndex = afterSig.indexOf(KEY_ID_PARAM);
  if (keyIdIndex === -1) {
    throw new AdVerificationError(
      'MISSING_SIGNATURE',
      'Ad reward callback is missing signature or key_id'
    );
  }

  // signature/key_id ARE percent-decoded — they weren't part of the signed
  // content, so decoding them for use here is safe and necessary (they
  // arrive URL-encoded like any other query value).
  const signature = decodeURIComponent(afterSig.substring(0, keyIdIndex - 1));
  const keyId = decodeURIComponent(afterSig.substring(keyIdIndex + KEY_ID_PARAM.length));

  const keys = await fetchPublicKeys();
  const publicKeyB64 = keys.get(keyId);
  if (!publicKeyB64) {
    throw new AdVerificationError('UNKNOWN_KEY_ID', `No known public key for key_id ${keyId}`);
  }

  const isValid = crypto.verify(
    'sha256',
    Buffer.from(signedContent),
    {
      key: Buffer.from(publicKeyB64, 'base64'),
      format: 'der',
      type: 'spki',
    },
    Buffer.from(signature, 'base64url')
  );

  if (!isValid) {
    throw new AdVerificationError('INVALID_SIGNATURE', 'Ad reward signature verification failed');
  }

  // Safe to use URLSearchParams for the remaining fields — decoding these
  // for reading doesn't affect the signature check above, which already
  // ran against the untouched raw substring.
  const params = new URLSearchParams(rawQuery);

  const timestamp = Number(params.get('timestamp'));
  if (!Number.isFinite(timestamp) || Date.now() - timestamp > MAX_CALLBACK_AGE_MS) {
    throw new AdVerificationError(
      'STALE_CALLBACK',
      'Ad reward callback is missing or has an expired timestamp'
    );
  }

  const adTransactionId = params.get('transaction_id');
  const adUnitId = params.get('ad_unit');
  if (!adTransactionId || !adUnitId) {
    throw new AdVerificationError(
      'MALFORMED_PAYLOAD',
      'Ad reward callback missing transaction_id or ad_unit'
    );
  }

  const rewardAmount = Number(params.get('reward_amount'));

  return {
    adUnitId,
    adTransactionId,
    rewardAmount: Number.isFinite(rewardAmount) ? rewardAmount : 0,
    rewardItem: params.get('reward_item') ?? '',
    timestamp,
  };
}
