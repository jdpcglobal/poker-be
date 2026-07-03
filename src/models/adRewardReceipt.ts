/**
 * @fileoverview AdRewardReceipt Model
 * One document per verified, credited ad-view reward.
 *
 * The unique index on (network, adTransactionId) IS the replay guard: the
 * same signed ad-SDK callback can never be credited twice, even under
 * concurrent requests — the second insert throws E11000 and the route
 * rolls back the whole transaction (wallet credit included).
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdRewardReceipt {
  userId: mongoose.Types.ObjectId;
  /** Ad network identifier, e.g. 'admob'. Lets us support multiple networks later. */
  network: string;
  adUnitId: string;
  /** The ad network's transaction id from the signed SSV payload — the replay key. */
  adTransactionId: string;
  /** Chips credited to Wallet.balance for this claim, minor units. */
  amountCredited: number;
  /** When the signature was verified (not necessarily when the ad played). */
  verifiedAt: Date;
}

export interface IAdRewardReceiptDocument extends IAdRewardReceipt, Document {}

const AdRewardReceiptSchema = new Schema<IAdRewardReceiptDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    network: {
      type: String,
      required: [true, 'Ad network is required'],
      trim: true,
    },
    adUnitId: {
      type: String,
      required: [true, 'Ad unit ID is required'],
      trim: true,
    },
    adTransactionId: {
      type: String,
      required: [true, 'Ad transaction ID is required'],
      trim: true,
    },
    amountCredited: {
      type: Number,
      required: true,
      min: [0, 'Amount credited cannot be negative'],
    },
    verifiedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/** Replay protection: the same ad network transaction can only ever be credited once. */
AdRewardReceiptSchema.index({ network: 1, adTransactionId: 1 }, { unique: true });

/** Used by the daily-cap check in the ad-reward route. */
AdRewardReceiptSchema.index({ userId: 1, createdAt: -1 });

const AdRewardReceipt: Model<IAdRewardReceiptDocument> =
  mongoose.models.AdRewardReceipt ||
  mongoose.model<IAdRewardReceiptDocument>('AdRewardReceipt', AdRewardReceiptSchema);

export default AdRewardReceipt;
