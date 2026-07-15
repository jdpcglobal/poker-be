import { verifyFirebaseToken } from '@/lib/auth/firebaseVerify';

/**
 * Thin wrapper around verifyFirebaseToken for the Google sign-in route.
 * Maps firebaseUid -> googleUserId so the google route needs no changes.
 */
export async function verifyGoogleToken(
  idToken: string
): Promise<{ email: string; googleUserId: string; name?: string }> {
  const { email, firebaseUid, name } = await verifyFirebaseToken(idToken);
  return { email, googleUserId: firebaseUid, name };
}
