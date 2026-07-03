/**
 * @fileoverview Config for the non-cash credit mechanics (daily-login streak,
 * ad-reward). Deliberately kept OUT of config/constants.ts — that file is
 * FROZEN (Level 1 per KEEP.md, requires written justification + ripple plan
 * to edit) and these values are still-tunable game-design numbers, not core
 * money infrastructure. If these get locked down later, migrate them into
 * constants.ts as a deliberate act, per ARCHITECTURE.md's process.
 *
 * All amounts are integer minor units (paise), same convention as
 * constants.ts. This reuses Wallet.balance as a generic "spendable chips"
 * ledger — SIGNUP_BONUS_MINOR (constants.ts), the daily bonus, and ad
 * rewards are the only ways balance is credited going forward. No route
 * exists that lets this balance leave the platform as real money; the
 * bank-withdrawal UI is removed while the underlying API stays in place
 * for possible future real-money mode (see comments at the withdrawal
 * route itself).
 */

// -----------------------------------------------------------------------------
// Daily login bonus
// -----------------------------------------------------------------------------

/** Chips credited per day for streak days 1–6 (minor units). */
export const DAILY_BONUS_BASE_MINOR = 5000;

/** Chips added per completed 7-day streak block, on top of the base. */
export const DAILY_BONUS_STEP_MINOR = 5000;

/** Hard ceiling — reward never exceeds this regardless of streak length. */
export const DAILY_BONUS_MAX_MINOR = 50000;

/** Streak length (days) that completes one "block" and triggers a bump. */
export const DAILY_BONUS_STREAK_BLOCK_DAYS = 7;

/**
 * Computes the daily-login-bonus amount for a given streak day
 * (1-indexed: day 1 = first-ever claim or first claim after a broken streak).
 *
 * Days 1–6:   DAILY_BONUS_BASE_MINOR (flat)
 * Day 7–13:   +1 step   (first completed 7-day block)
 * Day 14–20:  +2 steps  (second completed block)
 * ...capped at DAILY_BONUS_MAX_MINOR so the reward can't grow indefinitely.
 */
export function computeDailyBonusAmount(streakDay: number): number {
  if (!Number.isInteger(streakDay) || streakDay < 1) {
    throw new Error(`streakDay must be a positive integer; got ${streakDay}`);
  }
  const completedBlocks = Math.floor((streakDay - 1) / DAILY_BONUS_STREAK_BLOCK_DAYS);
  const amount = DAILY_BONUS_BASE_MINOR + completedBlocks * DAILY_BONUS_STEP_MINOR;
  return Math.min(amount, DAILY_BONUS_MAX_MINOR);
}

// -----------------------------------------------------------------------------
// Ad reward
// -----------------------------------------------------------------------------

/** Fixed chips credited per verified rewarded-ad view (minor units). */
export const AD_REWARD_FIXED_MINOR = 2000;

/** Abuse ceiling — max ad-reward claims a single user can be credited per UTC calendar day. */
export const AD_REWARD_DAILY_CAP = 20;
