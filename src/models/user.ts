import mongoose, { Schema, Model, Document } from 'mongoose';

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
  updateLastLogin(): Promise<void>;
}

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
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  gamesPlayed: {
    type: Number,
    default: 0,
    min: 0,
  },
  gamesWon: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalWinnings: {
    type: Number,
    default: 0,
    min: 0,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
});

UserSchema.methods.updateLastLogin = async function (): Promise<void> {
  this.lastLogin = new Date();
  await this.save();
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
