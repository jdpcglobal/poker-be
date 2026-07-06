/**
 * @fileoverview AdCallbackLog Model
 * Diagnostic audit trail — one row per HTTP hit to /api/ads/ssv-callback,
 * regardless of outcome (success, rejected, malformed, or completely bogus).
 *
 * This exists purely so callback delivery can be verified by querying
 * MongoDB directly, without needing access to server/platform logs (Azure
 * Log Stream, etc.). Safe to prune periodically — see the TTL index below.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdCallbackLog {
  rawQuery: string;
  outcome: string; // 'credited' | 'rejected:<reason>' | 'error:<message>'
  userId: mongoose.Types.ObjectId | null;
  receivedAt: Date;
}

export interface IAdCallbackLogDocument extends IAdCallbackLog, Document {}

const AdCallbackLogSchema = new Schema<IAdCallbackLogDocument>(
  {
    rawQuery: { type: String, required: true },
    outcome: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    receivedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-prune after 30 days — this is a debug trail, not a durable record
// (AdRewardReceipt/WalletTransaction remain the durable, permanent records).
AdCallbackLogSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const AdCallbackLog: Model<IAdCallbackLogDocument> =
  mongoose.models.AdCallbackLog ||
  mongoose.model<IAdCallbackLogDocument>('AdCallbackLog', AdCallbackLogSchema);

export default AdCallbackLog;
