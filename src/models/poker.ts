// models/Poker.ts
import mongoose, { Document, Schema } from 'mongoose';

interface IPoker extends Document {
  name: string;
  communityCardsCount: number;
  maxHoleCards: number;
  numberOfRounds: number;
  blindsOrAntes: 'Blinds' | 'Antes';
  objective: string;
  rules: Map<string, string>;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'maintenance' | 'disable';
}

const pokerSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  communityCardsCount: {
    type: Number,
    default: 0, // Default to 0 for games without community cards
  },
  maxHoleCards: {
    type: Number,
    required: true,
  },
  numberOfRounds: {
    type: Number,
    default: 0,
  },
  blindsOrAntes: {
    type: String, // 'Blinds' or 'Antes'
    default: 'Blinds',
  },
  objective: {
    type: String,
    default: 'Make the best 5-card hand',
  },
  rules: {
    type: Map,
    of: String,
    default: {},
  },
  description: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String, // 'active', 'maintenance', or 'notactive'
    enum: ['active', 'maintenance', 'disable'],
    default: 'active', // Default to 'active'
  },
});

// Middleware to update the 'updatedAt' field
pokerSchema.pre<IPoker>('save', function (next) {
  this.updatedAt = new Date(); // Convert to Date object
  next();
});

const Poker = mongoose.models.Poker || mongoose.model<IPoker>('Poker', pokerSchema);

export default Poker;
