/**
 * @fileoverview AdRewardGrant Model
 * One row per issued ad-reward grant (see lib/ads/adRewardGrant.ts for the
 * signing scheme). This row — specifically `redeemedAt` — is the
 * authoritative single-use check: the HMAC signature alone only proves a
 * token wasn't tampered with, not that it hasn't already been redeemed.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdRewardGrant {
  userId: mongoose.Types.ObjectId;
  nonce: string;
  expiresAt: Date;
  redeemedAt: Date | null;
}

export interface IAdRewardGrantDocument extends IAdRewardGrant, Document {}

const AdRewardGrantSchema = new Schema<IAdRewardGrantDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    nonce: {
      type: String,
      required: [true, 'Nonce is required'],
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    redeemedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Mongo auto-deletes a grant row some time after its expiresAt — expired,
// unredeemed grants are junk we don't need to keep around indefinitely.
AdRewardGrantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

const AdRewardGrant: Model<IAdRewardGrantDocument> =
  mongoose.models.AdRewardGrant ||
  mongoose.model<IAdRewardGrantDocument>('AdRewardGrant', AdRewardGrantSchema);

export default AdRewardGrant;
