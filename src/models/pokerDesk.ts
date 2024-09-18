// import mongoose, { Schema, Document } from 'mongoose';
// import User from './user'; // Assuming your User model is in the same folder or adjust the path accordingly

// // Interface for Seat document
// interface ISeat {
//   seatNumber: number;
//   userId?: mongoose.Types.ObjectId;
//   buyInAmount: number;
//   balanceAtTable: number;
//   isSittingOut: boolean;
// }

// // Interface for PokerTable document
// interface IPokerTable extends Document {
//   pokerModeId: mongoose.Types.ObjectId;
//   tableName: string;
//   maxSeats: number;
//   seats: ISeat[];
//   observers: mongoose.Types.ObjectId[];
//   currentGameStatus: 'waiting' | 'in-progress' | 'finished';
//   totalBuyIns: number;
//   createdAt: Date;
//   updatedAt: Date;

//   addUserToSeat(userId: mongoose.Types.ObjectId, buyInAmount: number): Promise<ISeat>;
//   userLeavesSeat(userId: mongoose.Types.ObjectId): Promise<number>;
// }

// // Seat schema to represent each seat at the table
// const SeatSchema = new Schema<ISeat>({
//   seatNumber: { type: Number, required: true },
//   userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
//   buyInAmount: { type: Number, default: 0 },
//   balanceAtTable: { type: Number, default: 0 },
//   isSittingOut: { type: Boolean, default: false },
// }, { _id: false }); // Disabling the _id field for subdocuments

// // PokerTable schema to represent a poker table
// const PokerDeskSchema = new Schema<IPokerTable>({
//   pokerModeId: { type: Schema.Types.ObjectId, ref: 'Pokermode', required: true },
//   tableName: { type: String, required: true },
//   maxSeats: { type: Number, required: true },
//   seats: { type: [SeatSchema], default: [] },
//   observers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
//   currentGameStatus: { type: String, enum: ['waiting', 'in-progress', 'finished'], default: 'waiting' },
//   totalBuyIns: { type: Number, default: 0 },
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

// // Pre-save middleware to update the updatedAt field
// PokerDeskSchema.pre<IPokerTable>('save', function (next) {
//   this.updatedAt = new Date();
//   next();
// });

// // Method to handle adding a user to a seat
// PokerDeskSchema.methods.addUserToSeat = async function (userId: mongoose.Types.ObjectId, buyInAmount: number): Promise<ISeat> {
//   if (this.seats.length >= this.maxSeats) {
//     throw new Error('No available seats.');
//   }

//   const seatNumber = this.seats.length + 1;

//   const newSeat: ISeat = {
//     seatNumber,
//     userId,
//     buyInAmount,
//     balanceAtTable: buyInAmount,
//     isSittingOut: false,
//   };

//   this.seats.push(newSeat);
//   this.totalBuyIns += buyInAmount;

//   try {
//     await this.save();
//     return newSeat;
//   } catch (error: any) {
//     throw new Error('Error saving the updated table: ' + error.message);
//   }
// };

// // Method for handling a user leaving a seat
// PokerDeskSchema.methods.userLeavesSeat = async function (userId: mongoose.Types.ObjectId): Promise<number> {
//   const seat = this.seats.find((seat: ISeat) => seat.userId && seat.userId.equals(userId));

//   if (!seat) {
//     throw new Error('User is not seated at this table.');
//   }

//   const user = await User.findById(userId);
//   if (!user) {
//     throw new Error('User not found.');
//   }

//   // Update the user's balance
//   user.balance += seat.balanceAtTable;
//   await user.save();

//   // Reset the seat properties
//   seat.userId = null;
//   seat.buyInAmount = 0;
//   seat.balanceAtTable = 0;
//   seat.isSittingOut = false;

//   try {
//     await this.save();
//     return seat.seatNumber;
//   } catch (error: any) {
//     throw new Error('Error saving the updated table: ' + error.message);
//   }
// };

// const PokerDesk = mongoose.models.Pokerdesk || mongoose.model<IPokerTable>('Pokerdesk', PokerDeskSchema);

// export default PokerDesk;



import mongoose, { Schema, Document } from 'mongoose';
import User from './user'; // Adjust the path if necessary

// Interface for Seat document
export interface ISeat {
  seatNumber: number;
  userId?: mongoose.Types.ObjectId;
  buyInAmount: number;
  balanceAtTable: number;
  isSittingOut: boolean;
}

// Interface for PokerTable document
export interface IPokerTable extends Document {
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
  addObserver(userId: mongoose.Types.ObjectId): Promise<void>;
  removeObserver(userId: mongoose.Types.ObjectId): Promise<void>;
}

// Seat schema to represent each seat at the table
const SeatSchema = new Schema<ISeat>({
  seatNumber: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true},
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
PokerDeskSchema.pre<IPokerTable>('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Method to handle adding a user to a seat
PokerDeskSchema.methods.addUserToSeat = async function (userId: mongoose.Types.ObjectId, buyInAmount: number): Promise<ISeat> {
  
  if(userId && buyInAmount){
  if (this.seats.length >= this.maxSeats) {
    throw new Error('No available seats.');
  }

  const seatNumber = this.seats.length + 1;

  const newSeat: ISeat = {
    seatNumber,
    userId,
    buyInAmount,
    balanceAtTable: buyInAmount,
    isSittingOut: false,
  };

  this.seats.push(newSeat);
  this.totalBuyIns += buyInAmount;

  try {
    await this.save();
    return newSeat;
  } catch (error: any) {
    throw new Error('Error saving the updated table: ' + error.message);
  } 
}else{
  throw new Error('Error saving the updated table: userid is required');
}
};

// Method for handling a user leaving a seat
PokerDeskSchema.methods.userLeavesSeat = async function (userId: mongoose.Types.ObjectId): Promise<number> {
  // Find the seat occupied by the user
  const seatToRemove = this.seats.find((seat: ISeat) => seat.userId && seat.userId.equals(userId));

  if (!seatToRemove) {
    throw new Error('User is not seated at this table.');
  }

  // Update the user's balance directly
  await User.findByIdAndUpdate(userId, { $inc: { balance: seatToRemove.balanceAtTable } });

  // Filter out the seat from the array
  this.seats = this.seats.filter((seat: ISeat) => !seat.userId?.equals(userId));

  try {
    await this.save();
    return seatToRemove.seatNumber;
  } catch (error: any) {
    throw new Error('Error saving the updated table: ' + error.message);
  }
};


// Method to add a user as an observer
PokerDeskSchema.methods.addObserver = async function (userId: mongoose.Types.ObjectId): Promise<void> {
  if (!this.observers.includes(userId)) {
    this.observers.push(userId);
    await this.save();
  }
};

// Method to remove a user from observers
PokerDeskSchema.methods.removeObserver = async function (userId: mongoose.Types.ObjectId): Promise<void> {
  this.observers = this.observers.filter((id:any)  => !id.equals(userId));
  await this.save();
};

// Method to check if a user is already seated
PokerDeskSchema.methods.isUserSeated = function (userId: mongoose.Types.ObjectId): boolean {
  return this.seats.some((seat: ISeat) => seat.userId && seat.userId.equals(userId));
};


const PokerDesk = mongoose.models.Pokerdesk || mongoose.model<IPokerTable>('Pokerdesk', PokerDeskSchema);
 
export default PokerDesk;
