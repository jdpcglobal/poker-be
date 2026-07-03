/**
 * @fileoverview DailyBonusState Model
 * Tracks each user's daily-login-bonus streak.
 *
 * Deliberately a SEPARATE model from User/Wallet (both FROZEN, Level 1 per
 * KEEP.md) rather than a field bolted onto either — this is new, additive,
 * still-evolving game-design state, not core money infrastructure. Keeping
 * it in its own model avoids the frozen-file unlock process entirely and
 * mirrors how PracticeSession was kept separate from the core wallet models.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyBonusState {
  userId: mongoose.Types.ObjectId;
  /** Consecutive days claimed. Resets to 1 when a day is missed. */
  streak: number;
  /** Timestamp of the most recent successful claim. Null before the first claim. */
  lastClaimedAt: Date | null;
}

export interface IDailyBonusStateDocument extends IDailyBonusState, Document {}

const DailyBonusStateSchema = new Schema<IDailyBonusStateDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true, // one streak record per user
      index: true,
    },
    streak: {
      type: Number,
      default: 0,
      min: [0, 'Streak cannot be negative'],
    },
    lastClaimedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const DailyBonusState: Model<IDailyBonusStateDocument> =
  mongoose.models.DailyBonusState ||
  mongoose.model<IDailyBonusStateDocument>('DailyBonusState', DailyBonusStateSchema);

export default DailyBonusState;
