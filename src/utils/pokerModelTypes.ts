import mongoose from 'mongoose';

// Seat interface
export interface ISeat {
  seatNumber: number;
  userId?: mongoose.Types.ObjectId;
  buyInAmount: number;
  balanceAtTable: number;
  isSittingOut: boolean;
}

 
export interface IPot {
  amount: number; // The total amount in the pot
  contributors: {
    playerId: string; // The ID of the player contributing to the pot
    contribution: number; // The amount contributed by the player
  }[];
  winners: { 
    playerId: string; // The ID of the winning player
    amount: number;   // The amount the player won from this pot
  }[];
}  


// Define types for player status and actions
export type PlayerStatus = 'active' | 'all-in' | 'folded' | 'sitting-out';
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in' | 'small-blind' | 'big-blind';

// Card interface
export interface ICard {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
}

// Player action record interface
export interface IPlayerActionRecord {
  userId: mongoose.Types.ObjectId;
  action: PlayerAction;
  amount: number; // Only for actions that require an amount, like 'raise' or 'bet'
  timestamp: Date;
}

// Round interface
export interface IRound {
  name: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
  bettingRoundStartedAt: Date;
  actions: IPlayerActionRecord[]; // Array of player actions in this round
}

// Player interface
export interface IPlayer {
  userId: mongoose.Types.ObjectId;
  balanceAtTable: number;
  status: PlayerStatus;
  totalBet: number;
  holeCards: ICard[];
  role: 'sb' | 'bb' | 'player';
}

// SidePot interface
export interface ISidePot {
  amount: number;
  players: mongoose.Types.ObjectId[];
}

// PokerGame interface, merged into PokerDesk later
export interface IPokerGame {
  players: IPlayer[];
  currentTurnPlayer: mongoose.Types.ObjectId | null;
  pot: number;
  status: 'waiting' | 'in-progress' | 'finished';
  rounds: IRound[];
  communityCards: ICard[];
  pots: IPot[] | null; // Updated field
  createdAt: Date;
  updatedAt: Date;

  // PokerGame methods transferred to PokerDesk
  createGameFromTable(pokerDeskId: mongoose.Types.ObjectId): Promise<void>;
  dealCards(count: number, cardType?: 'hole' | 'community'): ICard[];
  getNextActivePlayer(currentUserId: mongoose.Types.ObjectId): mongoose.Types.ObjectId | null;
  getFirstActivePlayer(): mongoose.Types.ObjectId | null;
  startNextRound(roundName?: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown'): Promise<void>;
  handlePlayerAction(userId: mongoose.Types.ObjectId, action: PlayerAction, amount?: number): Promise<void>;
  showdown(): Promise<void>;
  createPots(): void; // You may want to implement or rename this to reflect the new logic
}


// PokerDesk interface
export interface IPokerTable extends mongoose.Document {
  pokerModeId: mongoose.Types.ObjectId;
  tableName: string;
  maxSeats: number;
  seats: ISeat[];
  observers: mongoose.Types.ObjectId[];
  currentGame: IPokerGame;
  currentGameStatus: 'waiting' | 'in-progress' | 'finished';
  totalBuyIns: number;
  createdAt: Date;
  updatedAt: Date;

  // PokerDesk methods
  addUserToSeat(userId: mongoose.Types.ObjectId, buyInAmount: number): Promise<ISeat>;
  userLeavesSeat(userId: mongoose.Types.ObjectId): Promise<number>;
  addObserver(userId: mongoose.Types.ObjectId): Promise<void>;
  removeObserver(userId: mongoose.Types.ObjectId): Promise<void>;

  
}
