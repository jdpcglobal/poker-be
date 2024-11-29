
import mongoose, { Schema, Document } from 'mongoose';
import User from './user'; // Adjust the path if necessary
import PokerGameArchive from './pokerGameArchive';
import {
  IPokerTable,
  ISeat,
  PlayerAction,
  ICard,
  IPokerGame,
  ISidePot,
  IPlayer,
  IRound,
  IPlayerActionRecord,
  IPlayerBets,
  RPokerGame,
  IWalletTransaction
} from '../utils/pokerModelTypes'; // Adjust the path based on your folder structure
import {evaluateHands, evaluatePots} from '../utils/pokerHand';
import createPots from '@/utils/createPots';
 
// Define your Seat schema
const SeatSchema = new Schema<ISeat>({
  seatNumber: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  buyInAmount: { type: Number, default: 0 },
  balanceAtTable: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'disconnected', 'sittingOut'], default: 'active' },
}, { _id: false });

// Define your Player schema (embedded in game)
const PlayerSchema = new Schema<IPlayer>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  balanceAtTable: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'all-in', 'folded', 'sitting-out'], default: 'active' },
  totalBet: { type: Number, default: 0 },
  holeCards: [{
    suit: { type: String, enum: ['hearts', 'diamonds', 'clubs', 'spades'] },
    rank: { type: String, enum: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] }
  }],
  role: { type: String, enum: ['sb', 'bb', 'player'], default: 'player' }
}, { _id: false });

// Define Round schema
const RoundSchema = new Schema<IRound>({
  name: { type: String, enum: ['pre-flop', 'flop', 'turn', 'river', 'showdown'] },
  bettingRoundStartedAt: { type: Date, default: Date.now },
  actions: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, enum: ['fold', 'check', 'call', 'raise', 'all-in', 'small-blind', 'big-blind'] },
    amount: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
  }]
}, { _id: false });

const PotSchema = new Schema({
  amount: { type: Number, required: true, default: 0 }, // Total amount in the pot
  contributors: [
    {
      playerId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // The ID of the player contributing to the pot
      contribution: { type: Number, required: true, default: 0 }, // The amount contributed by the player
    },
  ],
  winners: [ {
    playerId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // The ID of the player contributing to the pot
    amount: { type: Number, required: true, default: 0 },// Each winner's ID maps to the amount they won from this pot
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
 
// Define the PokerGame schema embedded within PokerDesk
const PokerGameSchema = new Schema<IPokerGame>({
  players: [PlayerSchema],
  currentTurnPlayer: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  totalBet: { type: Number, default: 0 },
  status: { type: String, enum: ['waiting', 'in-progress', 'finished'], default: 'waiting' },
  rounds: [RoundSchema],
  communityCards: [{
    suit: { type: String, enum: ['hearts', 'diamonds', 'clubs', 'spades'] },
    rank: { type: String, enum: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] }
  }],
  pots: { type: [PotSchema], default: null }, // Updated field
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Define your PokerDesk schema
const PokerDeskSchema = new Schema<IPokerTable>({
  pokerModeId: { type: Schema.Types.ObjectId, ref: 'PokerMode', required: true },
  tableName: { type: String, required: true },
  maxSeats: { type: Number, required: true },
  seats: { type: [SeatSchema], default: [] },
  observers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  // Embed current game with its own _id
  currentGame: {
    type: PokerGameSchema,  // Embedded schema
    default: null,  // Set default to null
  }, // Embedded poker game schema
  currentGameStatus: { type: String, enum: ['waiting', 'in-progress', 'finished'], default: 'waiting' },
  totalBuyIns: { type: Number, default: 0 },
  stake: {
    type: Number,
    default : 0,
  },
  minBuyIn: {
    type: Number,
    required: true,
  },
  maxBuyIn: {
    type: Number,
    required: true,
  },
  minPlayerCount: {
    type: Number,
    default:2,
    required: true,
  },
  bType: {
    type: String,
    enum: ['blinds', 'antes','both'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'disable'],
    default: 'active',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}); 

// Pre-save middleware to update the updatedAt field
PokerDeskSchema.pre<IPokerTable>('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Method to handle adding a user to a seat
// PokerDeskSchema.methods.addUserToSeat = async function (userId: mongoose.Types.ObjectId, buyInAmount: number): Promise<ISeat> {
  
//   if(userId && buyInAmount){
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
// }else{
//   throw new Error('Error saving the updated table: userid is required');
// }
// };

PokerDeskSchema.methods.addUserToSeat = async function (userId: mongoose.Types.ObjectId, buyInAmount: number): Promise<ISeat> {
  // Validate input parameters
  if (!userId || !buyInAmount) {
    throw new Error('User ID and buy-in amount are required.');
  }

  // Check for available seats
  if (this.seats.length >= this.maxSeats) {
    throw new Error('No available seats.');
  }

  // Fetch user information
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  // Check if user has sufficient balance
  if (user.wallet.balance < buyInAmount) {
    console.log("userWallet Balnce is ",user.wallet.balance)
    throw new Error('Insufficient balance to join the table.');
  }

  // Update user's balance
  user.wallet.balance -= buyInAmount;

  // Create the new seat
  const seatNumber = this.seats.length + 1;

  const newSeat: ISeat = {
    seatNumber,
    userId,
    buyInAmount,
    balanceAtTable: buyInAmount,
    status: 'active',
  };

  // Add the new seat to the table
  this.seats.push(newSeat);
  this.totalBuyIns += buyInAmount;

  // Create a wallet transaction for the buy-in
  const transaction: IWalletTransaction = {
    createdOn: new Date(),
    completedOn: new Date(),  // Will be set when completed
    status: 'successful',  // Assuming it is successful immediately
    amount: {
      cashAmount: buyInAmount,
      instantBonus: 0,
      lockedBonus: 0,
      gst: 0,
      tds: 0,
      otherDeductions: 0,
      total: buyInAmount,  // Total is equal to the buy-in amount in this case
    },
    type: 'deskIn',  // Transaction type indicating user joined the table
    remark: `User joined the table with seat number ${seatNumber}`,
    DeskId: this._id,  // Assuming `this._id` is the current desk's ID
  };

  // Add the transaction to the user's wallet
  user.wallet.transactions.push(transaction);


  // Save the updated user and PokerDesk instances
  try {
    await user.save(); // Save user with updated balance and transaction
    const activePlayersCount = this.seats.filter((seat: ISeat) => seat.status === 'active').length;

    if (activePlayersCount >= this.minPlayerCount && this.currentGameStatus === 'finished') {
      console.log('Min player count reached and game finished. Creating a new game...');
      await this.createGameFromTable();
    }

    await this.save(); // Save PokerDesk with the new seat
    return newSeat; // Return the newly created seat
  } catch (error: any) {
    throw new Error('Error saving the updated table or user: ' + error.message);
  }
};

// Method for handling a user leaving a seat
// PokerDeskSchema.methods.userLeavesSeat = async function (userId: mongoose.Types.ObjectId): Promise<number> {
//   // Find the seat occupied by the user
//   const seatToRemove = this.seats.find((seat: ISeat) => seat.userId && seat.userId.equals(userId));

//   if (!seatToRemove) {
//     throw new Error('User is not seated at this table.');
//   }

//   // Update the user's balance directly
//   await User.findByIdAndUpdate(userId, { $inc: { balance: seatToRemove.balanceAtTable } });

//   // Filter out the seat from the array
//   this.seats = this.seats.filter((seat: ISeat) => !seat.userId?.equals(userId));

//   try {
//     await this.save();
//     return seatToRemove.seatNumber;
//   } catch (error: any) {
//     throw new Error('Error saving the updated table: ' + error.message);
//   }
// };

PokerDeskSchema.methods.userLeavesSeat = async function (userId: mongoose.Types.ObjectId): Promise<number> {
  // Find the seat occupied by the user
  const seatToRemove = this.seats.find((seat: ISeat) => seat.userId && seat.userId.equals(userId));

  if (!seatToRemove) {
    throw new Error('User is not seated at this table.');
  }

  // Fetch the user from the database
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  // Update the user's balance and create a wallet transaction
  const amountToAdd = seatToRemove.balanceAtTable;

  // Create a wallet transaction for the balance being returned to the user
  const transaction: IWalletTransaction = {
    createdOn: new Date(),                 // Current timestamp for creation
    completedOn: new Date(),               // Timestamp when the transaction is completed
    status: 'successful',                  // Status of the transaction
    amount: {                              // Updated amount structure
      cashAmount: amountToAdd,             // Cash portion of the transaction
      instantBonus: 0,                     // No instant bonus applied here
      lockedBonus: 0,                      // No locked bonus applied here
      gst: 0,                              // Assuming no GST for this transaction
      tds: 0,                              // Assuming no TDS deductions
      otherDeductions: 0,                  // Assuming no other deductions
      total: amountToAdd,                  // Total amount matches cashAmount
    },
    type: 'deskWithdraw',                  // Type indicating user leaving the table
    remark: `User left the table and withdrew ${amountToAdd}`, // Remark for clarity
    DeskId: this._id,                      // Reference to this PokerDesk
  };
  

  // Update the user's wallet balance
  user.wallet.balance += amountToAdd;
  user.wallet.transactions.push(transaction);

  // Filter out the seat from the array
  this.seats = this.seats.filter((seat: ISeat) => !seat.userId?.equals(userId));

  try {
    // Save the updated user and PokerDesk instances
    await user.save(); // Save user with updated balance and transaction
    await this.save(); // Save PokerDesk with the updated seats
    return seatToRemove.seatNumber; // Return the seat number that was removed
  } catch (error: any) {
    throw new Error('Error saving the updated table or user: ' + error.message);
  }
};

PokerDeskSchema.methods.updateSeatStatus = async function (
  userId: mongoose.Types.ObjectId,
  status: 'active' | 'disconnected' | 'sittingOut'
): Promise<void> {
  try {
    // Check if there is an ongoing game on this table
    const isGameActive = this.currentGame && this.currentGame.status === 'playing';

    if (status === 'disconnected') {
      if (isGameActive) {
        // If a game is active, just set the user's seat status to disconnected
        const seat = this.seats.find((seat: ISeat) => seat.userId?.equals(userId));
        if (seat) {
          seat.status = 'disconnected';
          console.log(`User ${userId} status updated to 'disconnected' at table ${this._id}`);
        }
      } else {
        // If no game is active, remove the user from the seat and return their balance
        await this.userLeavesSeat(userId);
        console.log(`User ${userId} has left the seat as there is no active game at table ${this._id}`);
      }
    } else if (status === 'active' || status === 'sittingOut') {
      // Set the user's seat status to active
      const seat = this.seats.find((seat: ISeat) => seat.userId?.equals(userId));
      if (seat) {
        seat.status = 'active';
        console.log(`User ${userId} status updated to 'active' at table ${this._id}`);
      }
    } 

    // Save changes to the desk instance
    await this.save();
  } catch (error: any) {
    console.error(`Failed to update seat status for user ${userId} at table ${this._id}: ${error.message}`);
    throw new Error(`Error updating seat status: ${error.message}`);
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

const generateDeck = (): ICard[] => {
  const suits: ICard['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: ICard['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  // Generate a deck of 52 cards
  const deck: ICard[] = suits.flatMap(suit => 
    ranks.map(rank => ({ suit, rank }))
  );

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap cards
  }

  return deck;
};

PokerDeskSchema.methods.createGameFromTable = async function (): Promise<RPokerGame> {
  // Check if a current game already exists and if it's finished
  if (this.currentGame && this.currentGame.status !== 'finished') {
    throw new Error('There is already an active game.');
  }

  // Filter and set up active players from seats, ensuring they meet the min buy-in
  const activePlayers = this.seats
    .filter((seat: ISeat) => seat.userId && seat.status === 'active' && seat.balanceAtTable >= this.minBuyIn)
    .map((seat:ISeat) => ({
      userId: seat.userId!,
      balanceAtTable: seat.balanceAtTable,
      status: 'active',
      totalBet: 0,
      holeCards: [],
      role: 'player',
    }));

  if (activePlayers.length < 2) {
    throw new Error('Not enough active players to start a game.');
  }

  // Assign roles: small blind (SB) and big blind (BB)
  activePlayers[0].role = 'sb';
  activePlayers[1].role = 'bb';

  // Set SB and BB bet amounts
  const smallBlindAmount = 1;
  const bigBlindAmount = 2;
  activePlayers[0].totalBet = smallBlindAmount;
  activePlayers[1].totalBet = bigBlindAmount;
  activePlayers[0].balanceAtTable -= smallBlindAmount;
  activePlayers[1].balanceAtTable -= bigBlindAmount;

  // Initialize the pot with SB and BB
  const initialPotAmount = smallBlindAmount + bigBlindAmount;
  const deck: ICard[] = generateDeck();

  // Deal hole cards to each player
  activePlayers.forEach((player : IPlayer) => {
    player.holeCards = [deck.pop()!, deck.pop()!];
  });

  // Create a new game object
  const newGame : RPokerGame  = {
    players: activePlayers,
    currentTurnPlayer: activePlayers[2]?.userId || activePlayers[0].userId,
    totalBet: initialPotAmount,
    pots: null,
    status: 'in-progress',
    rounds: [{
      name: 'pre-flop',
      bettingRoundStartedAt: new Date(),
      actions: [
        { userId: activePlayers[0].userId, action: 'small-blind', amount: smallBlindAmount, timestamp: new Date()},
        { userId: activePlayers[1].userId, action: 'big-blind', amount: bigBlindAmount, timestamp: new Date() },
      ],
    }],
    communityCards: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Update the poker desk with the new game
  this.currentGame = newGame;
  this.currentGameStatus = 'in-progress';

  // Deduct balances in seats and remove players below the minimum buy-in
  this.seats.forEach((seat: ISeat, index: number) => {
    const matchingPlayer = activePlayers.find((player:IPlayer) => player.userId.equals(seat.userId));
    if (matchingPlayer) {
      seat.balanceAtTable = matchingPlayer.balanceAtTable;
    } else if (seat.balanceAtTable < this.minBuyIn) {
      this.seats.splice(index, 1); // Remove player from the seat
    }
  });

  await this.save();
  return newGame;
};


PokerGameSchema.methods.dealCards = function (
  count: number,
  cardType: 'hole' | 'community' = 'community'
): ICard[] {
  // Get all cards already dealt (hole cards and community cards)
  const usedCards = new Set<string>(
    this.players
      .flatMap((player : IPlayer) => player.holeCards) // Collect hole cards of all players
      .concat(this.communityCards) // Combine with community cards
      .map((card :ICard)=> `${card.rank}${card.suit}`) // Convert to a string representation for easy comparison
  );

  // Generate a full shuffled deck and filter out already dealt cards
  let deck = generateDeck().filter(
    card => !usedCards.has(`${card.rank}${card.suit}`)
  );

  // Fisher-Yates shuffle (to ensure a truly random shuffle)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const dealtCards: ICard[] = [];

  // Deal the required number of cards
  while (dealtCards.length < count && deck.length > 0) {
    dealtCards.push(deck.pop()!); // Get the top card from the shuffled and filtered deck
  }

  return dealtCards;
};

PokerGameSchema.methods.getNextActivePlayer = function (currentUserId: mongoose.Types.ObjectId): mongoose.Types.ObjectId | null {
  // Get the index of the current player
  const currentIndex = this.players.findIndex((player:IPlayer) => player.userId.equals(currentUserId));
  if (currentIndex === -1) {
    return null; // Current user not found in the players array
  }

  // Find the next active player
  let nextIndex = (currentIndex + 1) % this.players.length;
  for (let i = 0; i < this.players.length; i++) {
    const nextPlayer = this.players[nextIndex];
    if (nextPlayer.status === 'active' ) {
      return nextPlayer.userId; // Return the next active player's userId
    }
    nextIndex = (nextIndex + 1) % this.players.length; // Move to the next player
  }

  return null; // No active players found
};

PokerGameSchema.methods.getFirstActivePlayer = function (): mongoose.Types.ObjectId | null {
  for (const player of this.players) {
    if (player.status === 'active') {
      return player.userId; // Return the first active player's userId
    }
  }
  return null; // No active players found
};

PokerGameSchema.methods.startNextRound = async function (prevRoundName?: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown') {
  // Define the round order
  console.log("new round started intiate ")
  const roundOrder = ['pre-flop', 'flop', 'turn', 'river', 'showdown'];
  let roundName;
  // Determine the next round based on prevRoundName
  if (prevRoundName) {
    const currentRoundIndex = roundOrder.indexOf(prevRoundName);
    const nextRoundIndex = currentRoundIndex + 1;

    if (nextRoundIndex >= roundOrder.length) {
      throw new Error('All rounds have been completed.');
    }

    // Set roundName based on the next index
    roundName = roundOrder[nextRoundIndex] as 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
  } else {
    // If no prevRoundName is provided, determine the next round from the last round played
    const lastRound = this.rounds.length ? this.rounds[this.rounds.length - 1].name : null;
    const nextRoundIndex = lastRound ? roundOrder.indexOf(lastRound) + 1 : 0;

    if (nextRoundIndex >= roundOrder.length) {
      throw new Error('All rounds have been completed.');
    }

    roundName = roundOrder[nextRoundIndex] as 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
  }

  // Check if the round has already started
  if (this.rounds.some((round:IRound) => round.name === roundName)) {
    throw new Error(`Round "${roundName}" already started.`);
  }

  // Add the new round to the rounds array
  const newRound: IRound = {
    name: roundName,
    bettingRoundStartedAt: new Date(),
    actions: [],
  };
  this.rounds.push(newRound);

  // Handle card dealing based on the round name
  switch (roundName) {
    case 'pre-flop':
      // Deal hole cards at the start of the pre-flop round
      this.dealCards(this.players.length * 2, 'hole'); // 2 cards per player
      break;
    case 'flop':
      // Deal 3 community cards
      this.communityCards.push(...this.dealCards(3, 'community'));
      break;
    case 'turn':
      this.communityCards.push(...this.dealCards(1, 'community'));
      break;
    case 'river':
      // Deal 1 community card (turn or river)
      this.communityCards.push(...this.dealCards(1, 'community'));
      break;
    case 'showdown':
       // await this.showdown();
      return;
    default:
      throw new Error('Invalid round name.');
  }

  // Reset players' total bet for the new roun
   this.currentTurnPlayer = await this.getFirstActivePlayer();
  // Save the updated game state
  await this.save();
};

// PokerDeskSchema.methods.handlePlayerAction = async function (userId: mongoose.Types.ObjectId, action: PlayerAction, amount: number = 0) {
//   if (!this.currentGame.currentTurnPlayer.equals(userId)) {
//     throw new Error("It's not this player's turn");
//   }

//   const player = this.seats.find(seat => seat.userId.equals(userId));
//   const playerSeat = this.currentGame.players.find(p => p.userId.equals(userId));
//   if (!player) throw new Error('Player not found.');

//   const currentRound = this.currentGame.rounds[this.currentGame.rounds.length - 1];
//   if (!currentRound || currentRound.name === "showdown") {
//     throw new Error('No round in progress');
//   }

//   let playerTotalBet = 0; // Total bet of the current player
//   let maxBet = 0; // Maximum bet from any player

//   // Check if currentRound exists and has actions
//   if (currentRound?.actions?.length) {
//     // Step 1: Map player bets and calculate total bets in a single pass
//     const playerBets = currentRound.actions.reduce((acc, action) => {
//       // Aggregate each player's bets
//       acc[action.userId] = (acc[action.userId] || 0) + action.amount;
//       // Update maxBet directly during the reduction
//       maxBet = Math.max(maxBet, acc[action.userId]);
//       return acc;
//     }, {});

//     // Get the current player's total bet
//     playerTotalBet = playerBets[userId] || 0; // Default to 0 if the user has no bets
//     console.log("Player Bets:", playerBets); // Debugging player bets
//   }

//   const callAmount = Math.max(0, maxBet - playerTotalBet); // Avoid negative call amounts
//   let newAction = {
//     userId: userId,
//     timestamp: new Date(),
//     action: 'fold',
//     amount: 0
//   };

//   if (action === 'fold') {
//     playerSeat.status = 'folded';
//     newAction.action = 'fold';

//   } else if (action === 'check') {
//     if (callAmount === 0) {
//       newAction.action = 'check';
//     }
//   } else if (action === 'call' && callAmount > 0) {
//     // Player matches the current highest bet
//     if (callAmount === 0) {
//       newAction.action = 'check';
//     }
//     if (player.balanceAtTable < callAmount) throw new Error('Insufficient balance to call.');

//     player.balanceAtTable -= callAmount;
//     playerSeat.balanceAtTable -= callAmount;
//     playerSeat.totalBet += callAmount;
//     this.currentGame.pot += callAmount;

//     newAction.action = 'call';
//     newAction.amount = callAmount;

//   } else if (action === 'raise') {
//     const minRaiseAm = Math.ceil(this.currentGame.pot * 0.25);
//     let minRaiseAmount = callAmount + minRaiseAm;
//     console.log(minRaiseAmount);
//     if (amount < minRaiseAmount || amount < callAmount) {
//       throw new Error(`Raise amount must be greater than or equal to ${minRaiseAmount}.`);
//     }

//     if (player.balanceAtTable < amount) throw new Error('Insufficient balance to raise.');

//     player.balanceAtTable -= amount;
//     playerSeat.totalBet += amount;
//     playerSeat.balanceAtTable -= amount;
//     this.currentGame.pot += amount;

//     newAction.action = 'raise';
//     newAction.amount = amount;

//   } else if (action === 'all-in') {
//     const allInAmount = player.balanceAtTable;
//     playerSeat.status = 'all-in';
//     player.balanceAtTable = 0;
//     playerSeat.totalBet += allInAmount;
//     playerSeat.balanceAtTable -= allInAmount;
//     this.currentGame.pot += allInAmount;

//     newAction.action = 'all-in';
//     newAction.amount = allInAmount;

//   } else {
//     throw new Error('Invalid action.');
//   }

//   currentRound.actions.push(newAction);
//   const activePlayers = this.currentGame.players.filter(p => p.status === 'active');
//   console.log("activePlayers length", activePlayers.length);
//   console.log("activePlayers", activePlayers);
  
//   if (activePlayers.length <= 1) {
//     await this.showdown();
//     console.log('Game will end, as there are one or no active players.');
//     return;
//   } else {
//     const actionPlayerIds = new Set(currentRound.actions.map(action => action.userId.toString()));
//     const nextPlayerId = await this.currentGame.getNextActivePlayer(userId);
//     const nextPlayerIdStr = nextPlayerId.toString();
//     const nextPlayerHasActed = actionPlayerIds.has(nextPlayerIdStr);

//     if (!nextPlayerHasActed) {
//       console.log('Round is not complete, waiting for all active players to act.');
//       this.currentGame.currentTurnPlayer = nextPlayerId;
//     } else {
//       // Calculate the total bet amounts for each player
//       const totalBets = currentRound.actions.reduce((acc, action) => {
//         const { userId, amount } = action;
//         if (amount >= 0) {
//           acc[userId.toString()] = (acc[userId.toString()] || 0) + amount;
//         }
//         return acc;
//       }, {} as Record<string, number>);

//       const uniqueBets = new Set(Object.values(totalBets));

//       if (uniqueBets.size === 1) {
//         console.log("All players have equal total bets.");
//         if (currentRound.name === 'river') {
//           console.log("calling showdown method", currentRound.name);
//           await this.showdown();
//         } else {
//           console.log("the current round is", currentRound.name);
//           await this.currentGame.startNextRound(currentRound.name);
//         }
//       } else {
//         console.log('Not all players have bet the same amount, waiting for next actions.');
//         this.currentGame.currentTurnPlayer = nextPlayerId;
//       }
//     }
//   }

//   // Save the parent document at the end of the method
//   await this.save();
//   console.log("Game state updated successfully");
// };
 


PokerDeskSchema.methods.handlePlayerAction = async function (userId: mongoose.Types.ObjectId, action: PlayerAction, amount: number = 0) {
  if (!this.currentGame.currentTurnPlayer.equals(userId)) {
    throw new Error("It's not this player's turn");
  }

  const player = this.seats.find((seat:ISeat) => seat.userId.equals(userId));
  const playerSeat = this.currentGame.players.find((p : IPlayer) => p.userId.equals(userId));
  if (!player) throw new Error('Player not found.');

  const currentRound = this.currentGame.rounds[this.currentGame.rounds.length - 1];
  if (!currentRound || currentRound.name === "showdown") {
    throw new Error('No round in progress');
  }

  // Reduce actions to get player total bets and max bet
  let playerTotalBet = 0;
  let maxBet = 0;
  const playerBets : IPlayerBets  = currentRound?.actions?.reduce((acc:any, action:any) => {
    acc[action.userId] = (acc[action.userId] || 0) + action.amount;
    maxBet = Math.max(maxBet, acc[action.userId]);
    return acc;
  }, {}) || {};
  playerTotalBet = playerBets[userId.toString()] || 0;

  const callAmount : number = Math.max(0, maxBet - playerTotalBet); // To avoid negative values
  let newAction: IPlayerActionRecord = { userId, timestamp: new Date(), action: 'fold', amount: 0 };

  // Handle actions
  if (action === 'fold') {
    playerSeat.status = 'folded';
    newAction.action = 'fold';

  } else if (action === 'check' && callAmount === 0) {
    newAction.action = 'check';

  } else if (action === 'call' || action === 'raise' || "all-in") {
    const isRaise = action === 'raise';
    let finalAmount = isRaise ? amount : callAmount;
    console.log("here we are 123 ... ", amount);
    if(action !== "all-in"){
    // Handle all-in condition
    if (finalAmount >= player.balanceAtTable) {
      console.log("here we are 323 ... ", amount);
      console.log("here we are 323 ... ", finalAmount);
      finalAmount = player.balanceAtTable;
      newAction.action = 'all-in';
      playerSeat.status = 'all-in';

    } else if (finalAmount < player.balanceAtTable) {
      console.log("here we are 423 ... ", amount);
      console.log("here we are 423 ... ", finalAmount);
      // If final amount is less, auto-check or all-in
      if (finalAmount === callAmount) {
        console.log("here we are 523 ... ", amount);
        console.log("here we are 523 ... ", finalAmount);
        newAction.action = 'call';
      }
      //  else {
      //   newAction.action = callAmount === 0 ? 'check' : 'all-in';
      //   finalAmount = player.balanceAtTable;
        
      //   console.log("here we are 623 ... ", amount);
      //   console.log("here we are 623 ... ", finalAmount);
      // }
    }
   }else{
       newAction.action = callAmount === 0 ? 'check' : 'all-in';
        finalAmount = player.balanceAtTable;
        
        console.log("here we are 623 ... ", amount);
        console.log("here we are 623 ... ", finalAmount);
   }

    // Adjust balances
    player.balanceAtTable -= finalAmount;
    playerSeat.totalBet += finalAmount;
    playerSeat.balanceAtTable -= finalAmount;
    this.currentGame.totalBet += finalAmount;
    newAction.amount = finalAmount;

  } else {
    throw new Error('Invalid action.');
  }

  currentRound.actions.push(newAction);

  // Check remaining active players
  const activePlayers = this.currentGame.players.filter((p : IPlayer) => p.status === 'active' ||  p.status === 'all-in' );
 
  if (activePlayers.length <= 1) {
    await this.showdown();
  } else {
    const actionPlayerIds = new Set(currentRound.actions.map((a:IPlayerActionRecord) => a.userId.toString()));
    const nextPlayerId = await this.currentGame.getNextActivePlayer(userId);
    const nextPlayerHasActed = actionPlayerIds.has(nextPlayerId.toString());
    const activeCount = activePlayers.filter((p:IPlayer) => p.status === 'active').length;
    if (!nextPlayerHasActed) {
      this.currentGame.currentTurnPlayer = nextPlayerId;
    } else {
      interface ITotalBets {
        [userId: string]: number; // Allow string keys for user IDs
    }
    
    const totalBets = currentRound.actions.reduce((acc: ITotalBets, action: IPlayerActionRecord) => {
        acc[action.userId.toString()] = (acc[action.userId.toString()] || 0) + action.amount;
        return acc;
    }, {} as ITotalBets); // Type assertion for the initial value
    
      const uniqueBets = new Set(Object.values(totalBets));
      console.log("we are here there active count is ", activeCount);
      console.log("f1",uniqueBets.size === 1 && activeCount <= 1);
      console.log("f2",uniqueBets.size === 1 && currentRound.name === 'river' );
      console.log("f3",uniqueBets.size === 1);
      if (uniqueBets.size === 1 && currentRound.name === 'river' || uniqueBets.size === 1 && activeCount === 1 || activeCount <= 0 ) {
        console.log("we are here there active count is loop ", activeCount)
        await this.showdown();
      } else if (uniqueBets.size === 1) {
        await this.currentGame.startNextRound(currentRound.name);
      } 
      else {
        this.currentGame.currentTurnPlayer = nextPlayerId;
      }
    }
  }

  // Save state and return the player's action
  await this.save();
  return newAction;
};



PokerDeskSchema.methods.showdown = async function () {
  // Check if there is a current game in progress

  console.log("we are here in show down mathod"); 

  if (!this.currentGame || this.currentGame.status !== 'in-progress') {
    throw new Error('Game is not currently in progress.');
  }

  for (const player of this.currentGame.players) {
    if (player.status === 'disconnected') {
      console.log(`Player ${player.userId} is disconnected, removing from seat`);
      await this.userLeavesSeat(player.userId);
    }
  }
  
  // Gather players who are still eligible (active or all-in)
  const eligiblePlayers = this.currentGame.players.filter((player : IPlayer) => 
    player.status === 'active' || player.status === 'all-in'
  );

  // Evaluate hands for eligible players
  const playerHands = evaluateHands(eligiblePlayers, this.currentGame.communityCards);
  console.log(`playerHands`, playerHands);

  console.log("we are here in show down mathod with player hands"); 
  const gamePots = createPots(this.currentGame.rounds)
  
  console.log("gamePots", gamePots);
  // Evaluate pots and determine winners
  const potResults = evaluatePots(this.currentGame.players, this.currentGame.communityCards, gamePots);
  console.log("we are here in show down mathod with player hands after pot results");

  console.log("Pot Results", potResults);

  // Save the evaluated pot results to the current game
  this.currentGame.pots = potResults;

  // Process each pot to distribute winnings
 // Process each pot to distribute winnings
for (const pot of potResults) {
  const winners = pot.winners;

  // Log winners for the current pot
  console.log(`Winners for Pot ${pot.amount}:`, winners);

  // If there are winning players, distribute the winnings
  if (winners.length > 0) {
    // Update each winning player's balance using the winning amounts from evaluatePots
    for (const winner of winners) {
      const { playerId, amount } = winner; // Extract playerId and winning amount
      console.log("playerId",playerId)
      const playerSeat = this.seats.find((seat:ISeat) => seat.userId.toString() === playerId.toString());
      console.log(playerSeat);
      if (playerSeat) {
        // Use the winning amount directly from the winners array
        playerSeat.balanceAtTable += amount; // Distribute winnings
        console.log(`Updated balance for playerId ${playerId}:`, playerSeat.balanceAtTable);
      }
    }
  }
}

  const archivedGame = new PokerGameArchive({
    deskId: this._id, // Assuming this is the desk's ID
    players: this.currentGame.players,
    currentTurnPlayer: this.currentGame.currentTurnPlayer,
    pot: this.currentGame.pot,
    status: this.currentGame.status,
    rounds: this.currentGame.rounds,
    communityCards: this.currentGame.communityCards,
    pots: potResults,
  });
  
  await archivedGame.save();

  // Set the current game status to finished
  this.currentGame.status = 'finished';
   
  // Save the updated desk state to the database
  await this.save();
};


const PokerDesk = mongoose.models.PokerDesk || mongoose.model<IPokerTable>('PokerDesk', PokerDeskSchema);
 
export default PokerDesk;
