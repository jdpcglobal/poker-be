// bankAccount.ts (Bank Account Model)
import mongoose, { Schema, Document } from 'mongoose';

export interface IBankAccount extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  accountHolderName: string;
}

const BankAccountSchema: Schema<IBankAccount> = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accountNumber: { type: String, required: true },
  bankName: { type: String, required: true },
  ifscCode: { type: String, required: true },
  accountHolderName: { type: String, required: true },
});

const BankAccount = mongoose.models.BankAccount || mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);

export default BankAccount;
