// import mongoose, { Schema, Model, Document } from 'mongoose';

// export interface IUser extends Document {
//   mobileNumber: string;
//   username: string;
//   balance: number;
//   gamesPlayed: number;
//   gamesWon: number;
//   totalWinnings: number;
//   registrationDate: Date;
//   lastLogin: Date;
//   isActive: boolean;
//   status: string;
//   updateLastLogin(): Promise<void>;
// }

// const UserSchema: Schema<IUser> = new Schema({
//   mobileNumber: {
//     type: String,
//     required: true,
//     unique: true,
//     validate: {
//       validator: (v: string) => /^[0-9]{10}$/.test(v),
//       message: (props: { value: string }) => `${props.value} is not a valid mobile number!`,
//     },
//   },
//   username: {
//     type: String,
//     required: true,
//     unique: true,
//     minlength: 3,
//     maxlength: 30,
//   },
//   balance: {
//     type: Number,
//     default: 0,
//     min: 0,
//   },
//   gamesPlayed: {
//     type: Number,
//     default: 0,
//     min: 0,
//   },
//   gamesWon: {
//     type: Number,
//     default: 0,
//     min: 0,
//   },
//   totalWinnings: {
//     type: Number,
//     default: 0,
//     min: 0,
//   },
//   registrationDate: {
//     type: Date,
//     default: Date.now,
//   },
//   lastLogin: {
//     type: Date,
//     default: Date.now,
//   },
//   isActive: {
//     type: Boolean,
//     default: true,
//   },
//   status: {
//     type: String,
//     enum: ['active', 'inactive', 'suspended'],
//     default: 'active',
//   },
// });

// UserSchema.methods.updateLastLogin = async function (): Promise<void> {
//   this.lastLogin = new Date();
//   await this.save();
// };

// const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// export default User;

import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IBankAccount {
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  accountHolderName: string;
}

export interface IWalletTransaction {
  createdOn: Date;
  completedOn?: Date;
  status: 'failed' | 'completed' | 'successful';
  amount: number;
  type: 'deposit' | 'withdraw' | 'deskIn' | 'deskWithdraw' | 'bonus';
  remark?: string;
  DeskId?: mongoose.Types.ObjectId;
  BankTransactionId?: mongoose.Types.ObjectId;
}

export interface IWallet {
  balance: number;
  bonus: number;
  coins: number;
  transactions: IWalletTransaction[];
}

export interface IUser extends Document {
  mobileNumber: string;
  username: string;
  balance: number;
  gamesPlayed: number;
  gamesWon: number;
  totalWinnings: number;
  registrationDate: Date;
  lastLogin: Date;
  isActive: boolean;
  status: string;
  wallet: IWallet;
  bankAccounts: IBankAccount[];
  updateLastLogin(): Promise<void>;
}

const BankAccountSchema: Schema<IBankAccount> = new Schema({
  accountNumber: { type: String, required: true },
  bankName: { type: String, required: true },
  ifscCode: { type: String, required: true },
  accountHolderName: { type: String, required: true },
});

const WalletTransactionSchema: Schema<IWalletTransaction> = new Schema({
  createdOn: { type: Date, default: Date.now },
  completedOn: { type: Date },
  status: { type: String, enum: ['failed', 'completed', 'successful'], required: true },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: ['deposit', 'withdraw', 'deskIn', 'deskWithdraw', 'bonus'],
    required: true,
  },
  remark: { type: String },
  DeskId: { type: mongoose.Schema.Types.ObjectId, ref: 'PokerDesk' },
  BankTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankTransaction' },
});

const WalletSchema: Schema<IWallet> = new Schema({
  balance: { type: Number, default: 0, min: 0 },
  bonus: { type: Number, default: 0, min: 0 },
  coins: { type: Number, default: 0, min: 0 },
  transactions: [WalletTransactionSchema],
});

const UserSchema: Schema<IUser> = new Schema({
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v: string) => /^[0-9]{10}$/.test(v),
      message: (props: { value: string }) => `${props.value} is not a valid mobile number!`,
    },
  },
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 30,
  },
  balance: { type: Number, default: 0, min: 0 },
  gamesPlayed: { type: Number, default: 0, min: 0 },
  gamesWon: { type: Number, default: 0, min: 0 },
  totalWinnings: { type: Number, default: 0, min: 0 },
  registrationDate: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  wallet: { type: WalletSchema, default: () => ({}) },
  bankAccounts: [BankAccountSchema],
});

UserSchema.methods.updateLastLogin = async function (): Promise<void> {
  this.lastLogin = new Date();
  await this.save();
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

