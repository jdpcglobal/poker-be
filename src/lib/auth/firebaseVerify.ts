import admin from 'firebase-admin';
import { AuthError } from '@/lib/api/errors';

/**
 * Verifies a Firebase ID token (regardless of the sign-in method used —
 * Google, email/password, phone, etc.) and returns the stable Firebase uid
 * plus the email claim.
 *
 * This is the single verification function for all Firebase-backed auth
 * providers. Provider-specific routes import this and store the uid as
 * authProviders.providerId against the appropriate provider name.
 */
export async function verifyFirebaseToken(
  idToken: string
): Promise<{ email: string; firebaseUid: string; name?: string }> {
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    throw new AuthError(
      'INVALID_GOOGLE_TOKEN',
      'Firebase auth is not configured (missing env vars)'
    );
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // .env.local stores the key with literal \n -- convert to real newlines.
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    throw new AuthError('INVALID_GOOGLE_TOKEN', 'Firebase ID token is invalid or expired');
  }

  if (!decoded.uid || !decoded.email) {
    throw new AuthError('INVALID_GOOGLE_TOKEN', 'Firebase token payload is missing required fields');
  }

  return {
    email: decoded.email,
    firebaseUid: decoded.uid,
    name: decoded.name,
  };
}
