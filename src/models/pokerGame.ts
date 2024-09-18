import mongoose, { Schema, Document } from 'mongoose';
import PokerDesk from './pokerDesk';
import { IPokerTable } from './pokerDesk';

// Define types for player status and actions
type PlayerStatus = 'active' | 'all-in' | 'folded' | 'sitting-out';
type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

// Define interfaces for cards and rounds
interface ICard {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
}

interface IRound {
  name: 'pre-flop' | 'flop' | 'turn' | 'river';
  bettingRoundStartedAt: Date;
}

interface IPlayer {
  userId: mongoose.Types.ObjectId;
  balanceAtTable: number;
  status: PlayerStatus;
  totalBet: number;
  holeCards: ICard[];
  role: 'sb' | 'bb' | 'player'; // Role as small blind, big blind, or regular player
}

interface ISidePot {
  amount: number;
  players: mongoose.Types.ObjectId[];
}

interface IPokerGame extends Document {
  pokerDeskId: mongoose.Types.ObjectId;
  players: IPlayer[];
  currentTurnPlayer: mongoose.Types.ObjectId;
  pot: number;
  minimumBet: number;
  actions: PlayerAction[];
  status: 'waiting' | 'in-progress' | 'finished';
  rounds: IRound[];
  communityCards: ICard[];
  sidePots: ISidePot[];
  createdAt: Date;
  updatedAt: Date;

  createGameFromTable(pokerDeskId: mongoose.Types.ObjectId): Promise<IPokerGame>;
  startRound(roundName: 'pre-flop' | 'flop' | 'turn' | 'river'): Promise<void>;
  dealCards(count: number): ICard[];
  dealHoleCards(): void;
  handlePlayerAction(userId: mongoose.Types.ObjectId, action: PlayerAction, amount?: number): Promise<void>;
  createSidePots(): void;
  distributeWinnings(): void;
}

// PokerGame schema
const PokerGameSchema = new Schema<IPokerGame>({
  pokerDeskId: { type: Schema.Types.ObjectId, ref: 'Pokerdesk', required: true },
  players: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    balanceAtTable: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'all-in', 'folded', 'sitting-out'], default: 'active' },
    totalBet: { type: Number, default: 0 },
    holeCards: [{
      suit: { type: String, enum: ['hearts', 'diamonds', 'clubs', 'spades'] },
      rank: { type: String, enum: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] }
    }],
    role: { type: String, enum: ['sb', 'bb', 'player'], default: 'player' }
  }],
  currentTurnPlayer: { type: Schema.Types.ObjectId, ref: 'User' },
  pot: { type: Number, default: 0 },
  minimumBet: { type: Number, default: 0 },
  actions: [{ type: String, enum: ['fold', 'check', 'call', 'raise', 'all-in'] }],
  status: { type: String, enum: ['waiting', 'in-progress', 'finished'], default: 'in-progress' },
  rounds: [{
    name: { type: String, enum: ['pre-flop', 'flop', 'turn', 'river'] },
    bettingRoundStartedAt: { type: Date }
  }],
  communityCards: [{
    suit: { type: String, enum: ['hearts', 'diamonds', 'clubs', 'spades'] },
    rank: { type: String, enum: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] }
  }],
  sidePots: [{
    amount: { type: Number, default: 0 },
    players: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save hook to update updatedAt
PokerGameSchema.pre<IPokerGame>('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Static method to create a new poker game from a poker desk
PokerGameSchema.statics.createGameFromTable = async function (pokerDeskId: mongoose.Types.ObjectId): Promise<IPokerGame> {
  const pokerDesk: IPokerTable | null = await PokerDesk.findById(pokerDeskId);
  
  if (!pokerDesk) {
    throw new Error('Poker desk not found.');
  }

  const activePlayers = pokerDesk.seats
    .filter(seat => seat.userId && !seat.isSittingOut)
    .map(seat => ({
      userId: seat.userId!,
      balanceAtTable: seat.balanceAtTable,
      status: 'active',
      totalBet: 0,
      holeCards: [],
      role: 'player' // Default role for all players
    }));

  if (activePlayers.length < 2) {
    throw new Error('Not enough active players to start a game.');
  }

  // Assign roles for SB and BB
  if (activePlayers.length > 1) {
    activePlayers[0].role = 'sb'; // First player as SB 
    activePlayers[1].role = 'bb'; // Second player as BB
  }

  const newGame = new this({
    pokerDeskId,
    players: activePlayers,
    status: 'in-progress',
    minimumBet: 0,
    pot: 0,
    currentTurnPlayer: activePlayers[0].userId,
    sidePots: []
  });

  await newGame.save();
  return newGame;
};

// Method to start a round
PokerGameSchema.methods.startRound = async function (roundName: 'pre-flop' | 'flop' | 'turn' | 'river') {
  if (this.rounds.some( (round:any ) => round.name === roundName)) {
    throw new Error('Round already started.');
  }

  const newRound: IRound = {
    name: roundName,
    bettingRoundStartedAt: new Date()
  };

  this.rounds.push(newRound);

  // Deal community cards for flop, turn, and river
  if (roundName === 'pre-flop') {
    this.dealHoleCards(); // Deal hole cards at the start
  } else if (roundName === 'flop') {
    this.communityCards.push(...this.dealCards(3));
  } else if (roundName === 'turn') {
    this.communityCards.push(this.dealCards(1)[0]);
  } else if (roundName === 'river') {
    this.communityCards.push(this.dealCards(1)[0]);
  }

  await this.save();
};

// Method to deal cards
PokerGameSchema.methods.dealCards = function (count: number): ICard[] {
  const suits: ICard['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: ICard['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  const deck: ICard[] = [];
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({ suit, rank });
    });
  });

  // Shuffle the deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck.slice(0, count);
};

// Method to deal hole cards
PokerGameSchema.methods.dealHoleCards = function () {
  const holeCardsPerPlayer = 2;

  this.players.forEach((player:any) => {
    player.holeCards = this.dealCards(holeCardsPerPlayer);
  });

  this.save();
};

// Method to handle player actions
PokerGameSchema.methods.handlePlayerAction = async function (userId: mongoose.Types.ObjectId, action: PlayerAction, amount?: number) {
  const player = this.players.find((p:any) => p.userId.equals(userId));
  if (!player) {
    throw new Error('Player not found.');
  }

  if (player.status === 'folded') {
    throw new Error('Player has folded.');
  }

  const currentBet = player.totalBet;
  let totalBet = amount ?? 0;

  switch (action) {
    case 'fold':
      player.status = 'folded';
      break;
    case 'check':
      if (totalBet < this.minimumBet) {
        throw new Error('Cannot check if bet is not matched.');
      }
      break;
    case 'call':
      if (totalBet < this.minimumBet) {
        totalBet = this.minimumBet - currentBet;
        if (player.balanceAtTable < totalBet) {
          throw new Error('Insufficient balance to call.');
        }
        player.balanceAtTable -= totalBet;
        this.pot += totalBet;
      }
      break;
    case 'raise':
      if (!amount || amount <= this.minimumBet) {
        throw new Error('Raise amount must be greater than the minimum bet.');
      }
      if (player.balanceAtTable < amount) {
        throw new Error('Insufficient balance to raise.');
      }
      player.balanceAtTable -= amount;
      this.pot += amount;
      player.totalBet += amount;
      this.minimumBet = amount;
      break;
    case 'all-in':
      totalBet = player.balanceAtTable;
      player.balanceAtTable = 0;
      this.pot += totalBet;
      player.totalBet += totalBet;
      player.status = 'all-in';
      break;
    default:
      throw new Error('Invalid action.');
  }

  player.totalBet += totalBet;
  this.currentTurnPlayer = this.players.find((p:any) => p.status === 'active' && p.userId.toString() !== userId.toString())?.userId || null;

  await this.save();
  this.createSidePots();
};

// Method to create side pots
PokerGameSchema.methods.createSidePots = function () {
  const sidePots: ISidePot[] = [];

  // Create side pots for each distinct bet amount
  const betGroups = this.players.reduce((groups : any, player:any) => {
    if (player.status === 'folded') return groups;

    if (!groups[player.totalBet]) {
      groups[player.totalBet] = [];
    }

    groups[player.totalBet].push(player.userId);
    return groups;
  }, {} as { [key: number]: mongoose.Types.ObjectId[] });

  Object.keys(betGroups).forEach(betAmount => {
    sidePots.push({
      amount: Number(betAmount),
      players: betGroups[betAmount]
    });
  });

  this.sidePots = sidePots;
  this.save();
};

// Method to distribute winnings
PokerGameSchema.methods.distributeWinnings = function () {
  // Simplified winnings distribution for demonstration purposes
  // In reality, you would need to evaluate hand rankings and determine winners
  
  const winningPlayers = this.players.filter((p:any) => p.status !== 'folded');

  // Each winning player gets an equal share of the pot
  const share = this.pot / winningPlayers.length;
  winningPlayers.forEach((player:any) => {
    player.balanceAtTable += share;
  });

  // Reset pot
  this.pot = 0;

  // Mark game as finished
  this.status = 'finished';

  this.save();
};

export default mongoose.model<IPokerGame>('PokerGame', PokerGameSchema);
