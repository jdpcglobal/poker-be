import mongoose, { Schema, Document } from 'mongoose';

// Interface for Seat document
interface ISeat {
  seatNumber: number;
  userId?: mongoose.Types.ObjectId;
  buyInAmount: number;
  balanceAtTable: number;
  isSittingOut: boolean;
}

// Interface for PokerTable document
interface IPokerTable extends Document {
  pokerModeId: mongoose.Types.ObjectId;
  tableName: string;
  maxSeats: number;
  seats: ISeat[];
  observers: mongoose.Types.ObjectId[];
  currentGameStatus: 'waiting' | 'in-progress' | 'finished';
  totalBuyIns: number;
  createdAt: Date;
  updatedAt: Date;

  addUserToSeat(userId: mongoose.Types.ObjectId, buyInAmount: number): Promise<ISeat>;
  userLeavesSeat(userId: mongoose.Types.ObjectId): Promise<number>;
}

// Seat schema to represent each seat at the table
const SeatSchema = new Schema<ISeat>({
  seatNumber: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  buyInAmount: { type: Number, default: 0 },
  balanceAtTable: { type: Number, default: 0 },
  isSittingOut: { type: Boolean, default: false },
}, { _id: false }); // Disabling the _id field for subdocuments

// PokerTable schema to represent a poker table
const PokerDeskSchema = new Schema<IPokerTable>({
  pokerModeId: { type: Schema.Types.ObjectId, ref: 'Pokermode', required: true },
  tableName: { type: String, required: true },
  maxSeats: { type: Number, required: true },
  seats: { type: [SeatSchema], default: [] },
  observers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  currentGameStatus: { type: String, enum: ['waiting', 'in-progress', 'finished'], default: 'waiting' },
  totalBuyIns: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save middleware to update the updatedAt field
PokerDeskSchema.pre<IPokerTable>('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to handle adding a user to a seat
PokerDeskSchema.methods.addUserToSeat = async function(userId: mongoose.Types.ObjectId, buyInAmount: number): Promise<ISeat> {
  if (this.seats.length >= this.maxSeats) {
    throw new Error('No available seats.');
  }

  // Find the next available seat number
  const seatNumber = this.seats.length + 1;

  // Create and push the new seat object
  const newSeat = {
    seatNumber,
    userId,
    buyInAmount,
    balanceAtTable: buyInAmount,
    isSittingOut: false,
  };

  this.seats.push(newSeat);

  // Update total buy-ins
  this.totalBuyIns += buyInAmount;

  // Save the updated table
  try {
    await this.save();
    return newSeat;
  } catch (error: any) {
    throw new Error('Error saving the updated table: ' + error.message);
  }
};

// Method for handling a user leaving a seat
PokerDeskSchema.methods.userLeavesSeat = async function(userId: mongoose.Types.ObjectId): Promise<number> {
  const seat = this.seats.find((seat:any) => seat.userId && seat.userId.equals(userId));

  if (!seat) {
    throw new Error('User is not seated at this table.');
  }

  const User = mongoose.model('User');
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  // Update the user's balance
  user.balance += seat.balanceAtTable;
  await user.save();

  // Reset the seat properties
  seat.userId = null;
  seat.buyInAmount = 0;
  seat.balanceAtTable = 0;
  seat.isSittingOut = false;

  // Save the updated table
  try {
    await this.save();
    return seat.seatNumber;
  } catch (error: any) {
    throw new Error('Error saving the updated table: ' + error.message);
  }
};

const PokerDesk = mongoose.models.Pokerdesk ||  mongoose.model<IPokerTable>('Pokerdesk', PokerDeskSchema);

export default PokerDesk;
