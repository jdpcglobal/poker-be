import mongoose, { Schema, Document } from 'mongoose';
import PokerDesk from './pokerDesk';
import { IPokerTable } from './pokerDesk';
import {evaluateSidePots,evaluateHands} from '../utils/pokerHand';

// Define types for player status, actions, and card suits/ranks
type PlayerStatus = 'active' | 'all-in' | 'folded' | 'sitting-out';
type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in' | 'small-blind' |"big-blind";

 
interface ICard {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
}

interface IPlayerActionRecord {
  userId: mongoose.Types.ObjectId;
  action: PlayerAction;
  amount: number; // Only for actions that require an amount, like 'raise' or 'bet'
  timestamp: Date;
}

interface IRound {
  name: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
  bettingRoundStartedAt: Date;
  actions: IPlayerActionRecord[]; // New property to record player actions
}

interface IPlayer {
  userId: mongoose.Types.ObjectId;
  balanceAtTable: number;
  status: PlayerStatus;
  totalBet: number;
  holeCards: ICard[];
  role: 'sb' | 'bb' | 'player';
}

interface ISidePot {
  amount: number;
  players: mongoose.Types.ObjectId[];
}

interface IPokerGame extends Document {
  pokerDeskId: mongoose.Types.ObjectId;
  players: IPlayer[];
  currentTurnPlayer: mongoose.Types.ObjectId | null;
  pot: number;
  status: 'waiting' | 'in-progress' | 'finished';
  rounds: IRound[];
  communityCards: ICard[];
  sidePots: ISidePot[];
  createdAt: Date;
  updatedAt: Date;

  createGameFromTable(pokerDeskId: mongoose.Types.ObjectId): Promise<IPokerGame>;
  dealCards(count: number, cardType?: 'hole' | 'community'): ICard[];
  getNextActivePlayer(currentUserId: mongoose.Types.ObjectId): mongoose.Types.ObjectId | null;
  getFirstActivePlayer(): mongoose.Types.ObjectId | null;
  startNextRound(roundName?: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown'): Promise<void>;
  handlePlayerAction(userId: mongoose.Types.ObjectId, action: PlayerAction, amount?: number): Promise<void>;
  showdown(): Promise<void>;
  createSidePots(): void;
}


// Schema definition for PokerGame
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
  currentTurnPlayer: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  pot: { type: Number, default: 0 },
  status: { type: String, enum: ['waiting', 'in-progress', 'finished'], default: 'in-progress' },
  rounds: [{
    name: { type: String, enum: ['pre-flop', 'flop', 'turn', 'river', 'showdown'] },
    bettingRoundStartedAt: { type: Date, default: Date.now },
    actions: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      action: { type: String, enum: ['fold', 'check', 'call', 'raise', 'all-in', 'small-blind', 'big-blind'] },
      amount: { type: Number, default: 0 },
    }]
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


// Static method to create a new poker game from a poker desk
PokerGameSchema.statics.createGameFromTable = async function (pokerDeskId: mongoose.Types.ObjectId): Promise<IPokerGame> {
  const pokerDesk: IPokerTable | null = await PokerDesk.findById(pokerDeskId);

  if (!pokerDesk) {
    throw new Error('Poker desk not found.');
  }

  // Filter and set up active players
  const activePlayers = pokerDesk.seats
    .filter(seat => seat.userId && !seat.isSittingOut)
    .map(seat => ({
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

  // Deduct from their balance
  activePlayers[0].balanceAtTable -= smallBlindAmount;
  activePlayers[1].balanceAtTable -= bigBlindAmount;

  // Initial pot contains SB and BB
  const initialPot = smallBlindAmount + bigBlindAmount;

  // Initialize and shuffle the deck
  const deck: ICard[] = generateDeck();

  // Deal hole cards to each player
  activePlayers.forEach(player => {
    player.holeCards = [deck.pop()!, deck.pop()!];  // Deal 2 cards to each player
  });

  const newGame = new this({
    pokerDeskId,
    players: activePlayers,
    status: 'in-progress',
    pot: initialPot,  // Start pot with the SB + BB
    currentTurnPlayer: activePlayers[2]?.userId || activePlayers[0].userId,  // Set to next player after BB, or fallback to SB if only 2 players
    sidePots: [],
    rounds: [{
      name: 'pre-flop',
      bettingRoundStartedAt: new Date(),
      actions: [
        { userId: activePlayers[0].userId, action: 'small-blind', amount: smallBlindAmount },  // SB action
        { userId: activePlayers[1].userId, action: 'big-blind', amount: bigBlindAmount },     // BB action
      ],
    }],
    communityCards: [],  // No community cards at the start
     
  });

  await newGame.save();

  pokerDesk.seats.forEach(seat => {
    const matchingPlayer = activePlayers.find(player => player.userId.equals(seat.userId));
    if (matchingPlayer) {
      seat.balanceAtTable = 0;  // Deducted balance
    }
  });

  await pokerDesk.save();

  return newGame;
};

PokerGameSchema.methods.dealCards = function (
  count: number,
  cardType: 'hole' | 'community' = 'community'
): ICard[] {
  // Get all cards already dealt (hole cards and community cards)
  const usedCards = new Set<string>(
    this.players
      .flatMap(player => player.holeCards) // Collect hole cards of all players
      .concat(this.communityCards) // Combine with community cards
      .map(card => `${card.rank}${card.suit}`) // Convert to a string representation for easy comparison
  );

  // Generate a full shuffled deck and filter out already dealt cards
  let deck = generateDeck().filter(
    card => !usedCards.has(`${card.rank}${card.suit}`)
  );

  const dealtCards: ICard[] = [];

  // Deal the required number of cards
  while (dealtCards.length < count) {
    dealtCards.push(deck.pop()!); // Get the top card from the shuffled and filtered deck
  }

  // Do not automatically push cards to `communityCards` or `holeCards`.
  // This will be handled explicitly in `startNextRound` or other game methods.

  // Save the updated game state if necessary here
  // await this.save();
  return dealtCards;
};


PokerGameSchema.methods.getNextActivePlayer = function (currentUserId: mongoose.Types.ObjectId): mongoose.Types.ObjectId | null {
  // Get the index of the current player
  const currentIndex = this.players.findIndex(player => player.userId.equals(currentUserId));
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

// PokerGameSchema.methods.startRound = async function (roundName: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown') {
//   // Check if the round has already started
//   if (this.rounds.some(round => round.name === roundName)) {
//     throw new Error('Round already started.');
//   }

//   // Add the new round to the rounds array
//   const newRound: IRound = {
//     name: roundName,
//     bettingRoundStartedAt: new Date(),
//     actions:[],
//   };
//   this.rounds.push(newRound);

//   // Handle card dealing based on the round name
//   switch (roundName) {
//     case 'pre-flop':
//       // Deal hole cards at the start of the pre-flop round
//       this.dealCards(this.players.length * 2, 'hole'); // 2 cards per player
//       break;
//     case 'flop':
//       // Deal 3 community cards
//       this.communityCards.push(...this.dealCards(3, 'community'));
//       break;
//     case 'turn':
//     case 'river':
//       // Deal 1 community card (turn or river)
//       this.communityCards.push(...this.dealCards(1, 'community'));
//       break;
//     case 'showdown':
//       // No community cards dealt during the showdown; just prepare for the showdown phase
//       this.showdown();
//       return; 
//     default:
//       throw new Error('Invalid round name.');
//   }
    
//   this.currentT
//   // Reset players' total bet for the new round
//   // this.players.forEach(player => {
//   //   player.totalBet = 0;
//   // });

//   // Save the updated game state
//   await this.save();
// };


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
  if (this.rounds.some(round => round.name === roundName)) {
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
        await this.showdown();
      return;
    default:
      throw new Error('Invalid round name.');
  }

  // Reset players' total bet for the new roun
   this.currentTurnPlayer = await this.getFirstActivePlayer();
  // Save the updated game state
  await this.save();
};

PokerGameSchema.methods.handlePlayerAction = async function (userId: mongoose.Types.ObjectId, action: PlayerAction, amount: number = 0) {
 
  if (!this.currentTurnPlayer.equals(userId)) {
    throw new Error("It's not this player's turn");
  }

  const player = this.players.find(p => p.userId.equals(userId));
  if (!player) throw new Error('Player not found.');

  const currentRound = this.rounds[this.rounds.length - 1];

  if (!currentRound && currentRound.name == "showdown") {
    throw new Error('No round in progress');
  }
 
  let playerTotalBet;
  let maxBet;
  let totalBet;

  if(currentRound.actions && currentRound.actions.length > 0){
    totalBet = currentRound.actions.reduce((total, action) => total + action.amount, 0);
    playerTotalBet = currentRound.actions.filter(action => action.userId.equals(userId)).reduce((total, action) => total + action.amount, 0);
    maxBet = Math.max(...currentRound.actions.map(action => action.amount));
  }else{
    playerTotalBet = 0;
    maxBet = 0;
    totalBet = 0;
  }
  
  const callAmount = maxBet - playerTotalBet;

  const timestamp = new Date(); // Extract timestamp once
  
  let newAction = {
    userId: userId,
    timestamp: timestamp,
    action: '', // Initialize action as an empty string
    amount: 0   // Initialize amount to 0
  };
  
  if (action === 'fold') {
    player.status = 'folded';
    newAction.action = 'fold';
  } else if (action === 'check') {
    if (totalBet === 0) {
      newAction.action = 'check';
      // amount remains 0
    }
  } else if (action === 'call') {
    // Player matches the current highest bet
    if (callAmount == 0 ) {
      newAction.action = 'check';
    }
    if (player.balanceAtTable < callAmount) throw new Error('Insufficient balance to call.');
   
    player.balanceAtTable -= callAmount;
    player.totalBet += callAmount;
    this.pot += callAmount;
  
    newAction.action = 'call';
    newAction.amount = callAmount; // Set the amount for call
  
  } else if (action === 'raise') {
    // Set the default raise amount to 25% of the current pot
    const minRaiseAmount =  Math.ceil(this.pot * 0.25);
  
    if ( amount <= callAmount || amount < minRaiseAmount) {
      throw new Error(`Raise amount must be greater than or equal to ${minRaiseAmount}.`);
    }
  
    if (player.balanceAtTable < amount) throw new Error('Insufficient balance to raise.');
  
    player.balanceAtTable -= amount;
    player.totalBet += amount;
    this.pot += amount;
  
    newAction.action = 'raise';
    newAction.amount = amount; // Set the amount for raise
  
  } else if (action === 'all-in') {
    // Player goes all-in with whatever balance they have left
    const allInAmount = player.balanceAtTable;
    player.status = 'all-in';
    player.balanceAtTable = 0;
    player.totalBet += allInAmount;
    this.pot += allInAmount;
  
    newAction.action = 'all-in';
    newAction.amount = allInAmount; // Set the amount for all-in
  
  } else {
    throw new Error('Invalid action.');
  }
  currentRound.actions.push(newAction);
  //Save the updated game statenpm
  await this.save();
   console.log("we called first save action successfully");
  const activePlayers = this.players.filter(p => p.status === 'active'); // Assuming players are stored in this.players

  if (activePlayers.length <= 1) {
    // Handle the situation where there's one or no active players
      await this.showdown();
     console.log('Game will end, as there are one or no active players.');
     return;
   // Add any additional logic needed here (e.g., end the game, announce the winner, etc.)
  } else {

   // Convert the user IDs in the actions to strings and store them in a Set
const actionPlayerIds = new Set(
  currentRound.actions.map(action => action.userId.toString())
);
console.log("actionPlayerIds", actionPlayerIds);

// Get the next active player's ID
const nextPlayerId = await this.getNextActivePlayer(userId);
console.log("nextPlayerId", nextPlayerId);

// Convert nextPlayerId to string for comparison
const nextPlayerIdStr = nextPlayerId.toString();

// Check if the next player has already placed an action
const nextPlayerHasActed = actionPlayerIds.has(nextPlayerIdStr);
console.log("nextPlayerHasActed", nextPlayerIdStr);
console.log("nextPlayerHasActed", nextPlayerHasActed);
console.log("actionPlayerIds", actionPlayerIds);

    if (!nextPlayerHasActed) {
      console.log('Round is not complete, waiting for all active players to act.');
      // Continue with the game logic, wait for more actions
       // Continue with the game logic
       this.currentTurnPlayer = nextPlayerId;
       await this.save();
    }
    else {
      // Calculate the total bet amounts for each player
      const totalBets = currentRound.actions.reduce((acc, action) => {
        const { userId, amount } = action;
        // Only consider actions with a positive amount
        if (amount >= 0) {
          acc[userId.toString()] = (acc[userId.toString()] || 0) + amount; // Initialize and sum the amounts for each user
        }
        return acc;
      }, {} as Record<string, number>);

     console.log("totalBets",totalBets);
      // Get unique total bet values
      const uniqueBets = new Set(Object.values(totalBets));
      console.log("uniqueBets",uniqueBets);
      // Get unique total bet values
      // Check if all active players have bet the same amount
      if (uniqueBets.size === 1) {
        console.log("All players have equal total bets.");
    
        // Create a unique set of players based on userId and their total bet
        const uniquePlayers = Object.entries(totalBets).map(([userId, totalBet]) => {
          // Find the last action of the player in the current round
          const lastAction = currentRound.actions
            .filter(action => action.userId.toString() === userId)
            .pop()?.action || 'no-action'; // Fallback if no actions are found
    
          return {
            userId: new mongoose.Types.ObjectId(userId), // Ensure ObjectId format
            totalBet,
            lastAction
          };
        });
        console.log("uniquePlayers",uniquePlayers)
        // Sort players by their total bets
        const sortedPlayers = uniquePlayers.sort((a, b) => a.totalBet - b.totalBet);
        console.log("sortedPlayers",sortedPlayers)

        let remainingPlayers = [...sortedPlayers];
    
        while (remainingPlayers.length > 0) {
          const minBet = remainingPlayers[0].totalBet;
          const playersWithMinBet = remainingPlayers.filter(
            (player) => player.totalBet === minBet
          );
          const playersWithHigherBets = remainingPlayers.filter(
            (player) => player.totalBet > minBet
          );
    
          // Find or create the side pot for the players with the minimum bet
          let sidePot = this.sidePots.find((pot) => {
            const potPlayers = pot.players.map((id) => id.toString());
            const currentPlayers = playersWithMinBet.map((player) =>
              player.userId.toString()
            );
            return (
              potPlayers.length === currentPlayers.length &&
              potPlayers.every((id) => currentPlayers.includes(id))
            );
          });
          const contributionAmount = minBet * playersWithMinBet.length;
          // Create a new side pot if none exists for the current set of players
          if (!sidePot) {
            sidePot = {
              amount: contributionAmount,
              players: Array.from(new Set(playersWithMinBet.map((player) => player.userId))), // Ensure unique players
            };
            this.sidePots.push(sidePot);
          } else { 
            // Update players in the existing side pot ensuring no duplicates
            const uniquePlayers = new Set([
              ...sidePot.players.map((id) => id.toString()),
              ...playersWithMinBet.map((player) => player.userId.toString()),
            ]);
            sidePot.players = Array.from(uniquePlayers).map((id) => new mongoose.Types.ObjectId(id));
            sidePot.amount += contributionAmount;
          }
     
          // Update remaining players' bets and remove those who have matched the minimum
          remainingPlayers = playersWithHigherBets.map((player) => ({
            ...player,
            totalBet: player.totalBet - minBet,
          }));
        }
    
        // Continue with the game logic
        await this.startNextRound(currentRound.name);
      } else {
        console.log(
          "Round is not complete, active players have different contributions."
        );
        // Handle the case when players' contributions differ
        this.currentTurnPlayer = nextPlayerId;
      }
    }
  } 

 // await this.save();
 //await this.constructor.findOneAndUpdate({ _id: this._id }, this, { new: true });

  // Check if the round is complete after this action
 // await this.checkIfRoundComplete();
};


// PokerGameSchema.methods.determineWinners = function () {
//   const communityCards = this.communityCards; // The community cards on the table

//   // Filter out players who folded
//   const activePlayers = this.players.filter(player => player.status === 'active' || player.status === 'all-in');

//   // Prepare player hands
//   const playerHands = activePlayers.map(player => {
//     const cards = [...communityCards, ...player.holeCards].map(card => `${card.rank}${card.suit[0]}`);
//     return {
//       userId: player.userId,
//       hand: Hand.solve(cards)
//     };
//   });

//   // Determine the best hand
//   const bestHand = Hand.winners(playerHands.map(player => player.hand));

//   // Return the winning player(s)
//   const winners = playerHands.filter(player => bestHand.includes(player.hand));
//   return winners.map(winner => ({ userId: winner.userId, hand: winner.hand }));
// };

// PokerGameSchema.methods.updatePotAndPlayerBalances = async function (userId: mongoose.Types.ObjectId, betAmount: number) {
//   const player = this.players.find(p => p.userId.equals(userId));

//   if (!player) {
//     throw new Error('Player not found.');
//   }

//   if (player.balanceAtTable < betAmount) {
//     throw new Error('Insufficient balance to make this bet.');
//   }

//   // Deduct the bet amount from the player's balance
//   player.balanceAtTable -= betAmount;

//   // Add the bet amount to the player's total bet for the round
//   player.totalBet += betAmount;

//   // Add the bet amount to the pot
//   this.pot += betAmount;

//   await this.save(); // Save the updated state of the game

// };

// // Method to check if the round is complete and move to next round
// PokerGameSchema.methods.checkIfRoundComplete = async function () {
//   const activePlayers = this.players.filter(player => player.status === 'active' || player.status === 'all-in');
//   const highestBet = Math.max(...this.players.map(player => player.totalBet));

//   // Check if all active players have either matched the highest bet or are all-in
//   const allBetsMatched = activePlayers.every(player => 
//     player.totalBet === highestBet || player.status === 'all-in' || player.status === 'folded'
//   );

//   // Only start the next round when all bets are matched, or if all but one player folded
//   if (allBetsMatched && activePlayers.length > 1) {
//     // Move to the next round only when all conditions are met
//     await this.startNextRound();
//   } else {
//     // Otherwise, move to the next player's turn
//     this.currentTurnPlayer = this.getNextActivePlayer(this.currentTurnPlayer);
//   }

//   await this.save();
// };

// // Method to start the next round
// PokerGameSchema.methods.startNextRound = async function () {
//   const currentRound = this.rounds[this.rounds.length - 1].name;
//   const roundMap: { [key: string]: 'flop' | 'turn' | 'river' | 'showdown' } = {
//     'pre-flop': 'flop',
//     'flop': 'turn',
//     'turn': 'river',
//     'river': 'showdown',
//   };

//   const nextRound = roundMap[currentRound];
//   if (nextRound === 'showdown') {
//     await this.showdown();
//   } else {
//     await this.startRound(nextRound);
//   }
// };

// // Method to calculate side pots if players go all-in
// PokerGameSchema.methods.createSidePots = function () {
//   const sortedBets = this.players
//     .filter(p => p.status === 'active' || p.status === 'all-in')
//     .map(p => p.totalBet)
//     .sort((a, b) => a - b);

//   this.sidePots = [];

//   sortedBets.forEach((bet, index) => {
//     const playersInvolved = this.players
//       .filter(p => (p.totalBet >= bet && (p.status === 'active' || p.status === 'all-in')))
//       .map(p => p.userId);

//     const sidePotAmount = bet * playersInvolved.length;

//     this.sidePots.push({
//       amount: sidePotAmount,
//       players: playersInvolved,
//     });
//   });
// };


PokerGameSchema.methods.showdown = async function () {
  // Check if the game is in progress
  if (this.status !== 'in-progress') {
    throw new Error('Game is not currently in progress.');
  }

  // Gather players who are still eligible (active or all-in)
  const eligiblePlayers = this.players.filter(player => 
    player.status === 'active' || player.status === 'all-in'
  );

  // Evaluate hands for eligible players
  const playerHands = evaluateHands(eligiblePlayers, this.communityCards);
  console.log(`playerHands`, playerHands);

  // Distribute winnings from each side pot
  const sidePotResults = evaluateSidePots(eligiblePlayers, this.communityCards, this.sidePots);
  console.log("Side Pot Results", sidePotResults);

  for (const sidePot of this.sidePots) {
    const { winners, rankings } = sidePotResults[`SidePot ${sidePot.amount}`];

    // Log rankings for the current side pot
    console.log(`Rankings for SidePot ${sidePot.amount}:`, rankings);
    console.log(`winners for SidePot ${sidePot.amount}:`, winners);

    // If there are winning players, determine the actual winner
    if (rankings.length > 0) {
      // Sort rankings to find the highest-ranked hand
      rankings.sort((a, b) => {
        if (a.handRank !== b.handRank) {
          return b.handRank - a.handRank; // higher handRank is better
        }
        return b.highCard - a.highCard; // Higher highCard is better
      });

      const topRanking = rankings[0];
      const topWinners = rankings.filter(rank => rank.handRank === topRanking.handRank && rank.highCard === topRanking.highCard);
      
      const individualShare = sidePot.amount / topWinners.length;
      console.log(`individualShare`, individualShare);

      // Update each winning player's balance
      for (const rank of topWinners) {
        const player = this.players.find(p => p.userId.equals(rank.playerId));
        if (player) {
          player.balanceAtTable += individualShare; // Distribute winnings
          console.log(`Updated balance for playerId ${rank.playerId}:`, player.balanceAtTable);
        }
      }
    }
  }

  // Set the game status to finished
  this.status = 'finished';

  // Save the updated game state to the database
  await this.save();
};
 

const PokerGame = mongoose.model<IPokerGame>('PokerGame', PokerGameSchema);

 export default PokerGame;
