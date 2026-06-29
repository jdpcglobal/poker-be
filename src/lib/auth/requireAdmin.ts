/**
 * @fileoverview Admin auth guard — cookie + role + active-status verifier for admin routes.
 *
 * Reads the `token` httpOnly cookie from the request, verifies the JWT, checks
 * the role is exactly 'admin', and confirms the admin's status is 'active' in
 * the database. Throws a typed AuthError on any failure.
 *
 * DB call caching
 * ---------------
 * The Admin.findById check is cached in memory for 30 seconds per token. The
 * JWT signature already guarantees the payload has not been tampered with; the
 * DB check exists solely for revocation (admin disabled mid-session). A 30s
 * cache window means revocation takes effect within 30 seconds — acceptable
 * for a small admin set. The cache is keyed by the raw token string so each
 * unique session gets its own entry, and entries are evicted automatically
 * when the TTL expires.
 *
 * Routes use this at the top of every protected admin handler:
 *
 *     try {
 *       const { adminId, admin } = await requireAdmin(req);
 *       // ... handler proceeds ...
 *     } catch (err) {
 *       return apiAuthErrorResponse(err);
 *     }
 *
 * The error-to-response translation lives in src/lib/api/errors.ts (task 1.5).
 * This file knows nothing about HTTP status codes — that's the route layer's
 * concern.
 */

import type { NextRequest } from 'next/server';
import { verifyToken } from '@/utils/jwt';
import type { IJwtPayload } from '@/utils/jwt';
import dbConnect from '@/config/dbConnect';
import Admin from '@/models/admin';
import type { IAdminDocument } from '@/models/admin';
import { AuthError } from '@/lib/api/errors';

const COOKIE_NAME = 'token';

// ---------------------------------------------------------------------------
// In-memory verification cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 30_000; // 30 seconds

interface CacheEntry {
  context: AdminAuthContext;
  expiresAt: number;
}

const verificationCache = new Map<string, CacheEntry>();

/**
 * Evicts all expired entries from the cache. Called on every cache write so
 * the map never grows unboundedly — with a small admin set (2–5 people) this
 * is effectively O(1) in practice.
 */
function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of verificationCache) {
    if (entry.expiresAt <= now) verificationCache.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The shape this guard returns. Carries both the id (most routes only need
 * this) and the full admin document (for routes that need to read name/email
 * for logging, or write `lastLogin` etc.).
 */
export interface AdminAuthContext {
  adminId: string;
  role: 'admin';
  /** The decoded JWT payload, for routes that need other claims. */
  payload: IJwtPayload;
  /** The full Admin document, freshly loaded from DB (or from cache). */
  admin: IAdminDocument;
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

/**
 * Verifies the admin's cookie, checks role, and confirms the admin is active
 * in the DB. Returns the auth context on success. Throws AuthError otherwise.
 *
 * The DB lookup is skipped on repeated calls within 30 seconds for the same
 * token — see file-level comment for the reasoning.
 *
 * Failure codes:
 *   - MISSING_AUTH_COOKIE — no `token` cookie on the request
 *   - INVALID_TOKEN       — verifyToken returned null (bad signature, expired, malformed)
 *   - MISSING_USER_ID     — token verified but payload had no userId
 *   - WRONG_ROLE          — token verified but role isn't 'admin'
 *   - ADMIN_NOT_FOUND     — token's userId doesn't resolve to an Admin record
 *   - ADMIN_NOT_ACTIVE    — admin exists but status is 'inactive'
 */
export async function requireAdmin(
  req: NextRequest
): Promise<AdminAuthContext> {
  // ── 1. Cookie ──────────────────────────────────────────────────────────────
  const cookie = req.cookies.get(COOKIE_NAME);
  if (!cookie || !cookie.value) {
    throw new AuthError(
      'MISSING_AUTH_COOKIE',
      'Authentication cookie is required'
    );
  }

  const rawToken = cookie.value;

  // ── 2. JWT verification (synchronous — no DB) ──────────────────────────────
  const payload = verifyToken(rawToken);
  if (!payload) {
    throw new AuthError(
      'INVALID_TOKEN',
      'Authentication token is invalid or expired'
    );
  }

  if (!payload.userId) {
    throw new AuthError(
      'MISSING_USER_ID',
      'Authentication token is missing userId'
    );
  }

  if (payload.role !== 'admin') {
    throw new AuthError(
      'WRONG_ROLE',
      'This endpoint requires an admin token'
    );
  }

  // ── 3. Cache check — skip DB if we verified this token recently ────────────
  const cached = verificationCache.get(rawToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.context;
  }

  // ── 4. DB verification ─────────────────────────────────────────────────────
  await dbConnect();
  const admin = await Admin.findById(payload.userId);
  if (!admin) {
    throw new AuthError(
      'ADMIN_NOT_FOUND',
      'Authenticated admin no longer exists'
    );
  }

  if (admin.status !== 'active') {
    // Do not cache failed verifications — status may flip back to active.
    throw new AuthError(
      'ADMIN_NOT_ACTIVE',
      'Admin account is not active'
    );
  }

  // ── 5. Populate cache ──────────────────────────────────────────────────────
  const context: AdminAuthContext = {
    adminId: payload.userId,
    role: 'admin',
    payload,
    admin,
  };

  evictExpired();
  verificationCache.set(rawToken, {
    context,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return context;
}
