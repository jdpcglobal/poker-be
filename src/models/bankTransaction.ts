import mongoose, { Schema, Model, Document } from 'mongoose';

// Define the interface for Bank Transaction
export interface IBankTransaction extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User
  bankId: mongoose.Types.ObjectId; // Reference to BankAccount
  createdOn: Date;
  completedOn?: Date;
  status: 'failed' | 'completed' | 'successful' | 'waiting';
  amount: number;
  type: 'deposit' | 'withdraw';
  remark?: string;
}

// Define the Bank Transaction Schema
const BankTransactionSchema: Schema<IBankTransaction> = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  createdOn: { type: Date, default: Date.now },
  completedOn: { type: Date },
  status: {
    type: String,
    enum: ['failed', 'completed', 'successful', 'waiting'],
    required: true,
  },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: ['deposit', 'withdraw'],
    required: true,
  },
  remark: { type: String },
});

// Create the Bank Transaction Model
const BankTransaction: Model<IBankTransaction> = mongoose.models.BankTransaction || mongoose.model<IBankTransaction>('BankTransaction', BankTransactionSchema);

export default BankTransaction;
