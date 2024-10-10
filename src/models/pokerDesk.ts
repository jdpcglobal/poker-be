
import mongoose, { Schema, Document } from 'mongoose';
import User from './user'; // Adjust the path if necessary
import {
  IPokerTable,
  ISeat,
  PlayerAction,
  ICard,
  IPokerGame,
  ISidePot,
  IPlayer,
  IRound
} from '../utils/pokerModelTypes'; // Adjust the path based on your folder structure
import {evaluateSidePots,evaluateHands} from '../utils/pokerHand';
// Define your Seat schema
const SeatSchema = new Schema<ISeat>({
  seatNumber: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  buyInAmount: { type: Number, default: 0 },
  balanceAtTable: { type: Number, default: 0 },
  isSittingOut: { type: Boolean, default: false }
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

// Define SidePot schema
const SidePotSchema = new Schema<ISidePot>({
  amount: { type: Number, default: 0 },
  players: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

// Define the PokerGame schema embedded within PokerDesk
const PokerGameSchema = new Schema<IPokerGame>({
  players: [PlayerSchema],
  currentTurnPlayer: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  pot: { type: Number, default: 0 },
  status: { type: String, enum: ['waiting', 'in-progress', 'finished'], default: 'waiting' },
  rounds: [RoundSchema],
  communityCards: [{
    suit: { type: String, enum: ['hearts', 'diamonds', 'clubs', 'spades'] },
    rank: { type: String, enum: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] }
  }],
  sidePots: [SidePotSchema],
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
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
// Define the PokerDesk schema and methods
PokerDeskSchema.methods.createGameFromTable = async function (): Promise<IPokerGame> {
  // Check if a current game already exists and if it's finished
  if (this.currentGame && this.currentGame.status !== 'finished' ) {
    throw new Error('There is already an active game.');
  }

  // Filter and set up active players from seats
  const activePlayers = this.seats
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
  activePlayers[0].balanceAtTable -= smallBlindAmount;
  activePlayers[1].balanceAtTable -= bigBlindAmount;

  // Initialize the pot with SB and BB
  const initialPot = smallBlindAmount + bigBlindAmount;
  const deck: ICard[] = generateDeck();

  // Deal hole cards to each player
  activePlayers.forEach(player => {
    player.holeCards = [deck.pop()!, deck.pop()!]; // Deal 2 cards to each player
  });

  // Create a new game object
  const newGame = {
    players: activePlayers,
    currentTurnPlayer: activePlayers[2]?.userId || activePlayers[0].userId, // Set next player
    pot: initialPot,
    status: 'in-progress',
    rounds: [{
      name: 'pre-flop',
      bettingRoundStartedAt: new Date(),
      actions: [
        { userId: activePlayers[0].userId, action: 'small-blind', amount: smallBlindAmount },
        { userId: activePlayers[1].userId, action: 'big-blind', amount: bigBlindAmount },
      ],
    }],
    communityCards: [],
    sidePots: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Update the poker desk with the new game
  this.currentGame = newGame;  // Set the current game
  this.currentGameStatus = 'in-progress';  // Update the status

  // Deduct balances in seats
  this.seats.forEach(seat => {
    const matchingPlayer = activePlayers.find(player => player.userId.equals(seat.userId));
    if (matchingPlayer) {
      seat.balanceAtTable = matchingPlayer.balanceAtTable; // Update the seat balance
    }
  });

  await this.save();  // Save the updated poker desk
  return newGame; // Return the new game
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

// PokerGameSchema.methods.handlePlayerAction = async function (userId: mongoose.Types.ObjectId, action: PlayerAction, amount: number = 0) {
 
//   if (!this.currentTurnPlayer.equals(userId)) {
//     throw new Error("It's not this player's turn");
//   }

//   const player = this.players.find(p => p.userId.equals(userId));
//   if (!player) throw new Error('Player not found.');

//   const currentRound = this.rounds[this.rounds.length - 1];

//   if (!currentRound && currentRound.name == "showdown") {
//     throw new Error('No round in progress');
//   }
 
//   let playerTotalBet;
//   let maxBet;
//   let totalBet;

//   if(currentRound.actions && currentRound.actions.length > 0){
//     totalBet = currentRound.actions.reduce((total, action) => total + action.amount, 0);
//     playerTotalBet = currentRound.actions.filter(action => action.userId.equals(userId)).reduce((total, action) => total + action.amount, 0);
//     maxBet = Math.max(...currentRound.actions.map(action => action.amount));
//   }else{
//     playerTotalBet = 0;
//     maxBet = 0;
//     totalBet = 0;
//   }
  
//   const callAmount = maxBet - playerTotalBet;

//   const timestamp = new Date(); // Extract timestamp once
  
//   let newAction = {
//     userId: userId,
//     timestamp: timestamp,
//     action: '', // Initialize action as an empty string
//     amount: 0   // Initialize amount to 0
//   };
  
//   if (action === 'fold') {
//     player.status = 'folded';
//     newAction.action = 'fold';
//   } else if (action === 'check') {
//     if (totalBet === 0) {
//       newAction.action = 'check';
//       // amount remains 0
//     }
//   } else if (action === 'call') {
//     // Player matches the current highest bet
//     if (callAmount == 0 ) {
//       newAction.action = 'check';
//     }
//     if (player.balanceAtTable < callAmount) throw new Error('Insufficient balance to call.');
   
//     player.balanceAtTable -= callAmount;
//     player.totalBet += callAmount;
//     this.pot += callAmount;
  
//     newAction.action = 'call';
//     newAction.amount = callAmount; // Set the amount for call
  
//   } else if (action === 'raise') {
//     // Set the default raise amount to 25% of the current pot
//     const minRaiseAmount =  Math.ceil(this.pot * 0.25);
//     console.log('minimum raise amount is this',minRaiseAmount)
//     if ( amount <= callAmount || amount < minRaiseAmount) {
//       throw new Error(`Raise amount must be greater than or equal to ${minRaiseAmount}.`);
//     }
  
//     if (player.balanceAtTable < amount) throw new Error('Insufficient balance to raise.');
  
//     player.balanceAtTable -= amount;
//     player.totalBet += amount;
//     this.pot += amount;
  
//     newAction.action = 'raise';
//     newAction.amount = amount; // Set the amount for raise
  
//   } else if (action === 'all-in') {
//     // Player goes all-in with whatever balance they have left
//     const allInAmount = player.balanceAtTable;
//     player.status = 'all-in';
//     player.balanceAtTable = 0;
//     player.totalBet += allInAmount;
//     this.pot += allInAmount;
  
//     newAction.action = 'all-in';
//     newAction.amount = allInAmount; // Set the amount for all-in
  
//   } else {
//     throw new Error('Invalid action.');
//   }
//   currentRound.actions.push(newAction);
//   //Save the updated game statenpm
//   await this.save();
//    console.log("we called first save action successfully");
//   const activePlayers = this.players.filter(p => p.status === 'active'); // Assuming players are stored in this.players

//   if (activePlayers.length <= 1) {
//     // Handle the situation where there's one or no active players
//       await this.showdown();
//      console.log('Game will end, as there are one or no active players.');
//      return;
//    // Add any additional logic needed here (e.g., end the game, announce the winner, etc.)
//   } else {

//    // Convert the user IDs in the actions to strings and store them in a Set
// const actionPlayerIds = new Set(
//   currentRound.actions.map(action => action.userId.toString())
// );
// console.log("actionPlayerIds", actionPlayerIds);

// // Get the next active player's ID
// const nextPlayerId = await this.getNextActivePlayer(userId);
// console.log("nextPlayerId", nextPlayerId);

// // Convert nextPlayerId to string for comparison
// const nextPlayerIdStr = nextPlayerId.toString();

// // Check if the next player has already placed an action
// const nextPlayerHasActed = actionPlayerIds.has(nextPlayerIdStr);
// console.log("nextPlayerHasActed", nextPlayerIdStr);
// console.log("nextPlayerHasActed", nextPlayerHasActed);
// console.log("actionPlayerIds", actionPlayerIds);

//     if (!nextPlayerHasActed) {
//       console.log('Round is not complete, waiting for all active players to act.');
//       // Continue with the game logic, wait for more actions
//        // Continue with the game logic
//        this.currentTurnPlayer = nextPlayerId;
//        await this.save();
//     }
//     else {
//       // Calculate the total bet amounts for each player
//       const totalBets = currentRound.actions.reduce((acc, action) => {
//         const { userId, amount } = action;
//         // Only consider actions with a positive amount
//         if (amount >= 0) {
//           acc[userId.toString()] = (acc[userId.toString()] || 0) + amount; // Initialize and sum the amounts for each user
//         }
//         return acc;
//       }, {} as Record<string, number>);

//      console.log("totalBets",totalBets);
//       // Get unique total bet values
//       const uniqueBets = new Set(Object.values(totalBets));
//       console.log("uniqueBets",uniqueBets);
//       // Get unique total bet values
//       // Check if all active players have bet the same amount
//       if (uniqueBets.size === 1) {
//         console.log("All players have equal total bets.");
    
//         // Create a unique set of players based on userId and their total bet
//         const uniquePlayers = Object.entries(totalBets).map(([userId, totalBet]) => {
//           // Find the last action of the player in the current round
//           const lastAction = currentRound.actions
//             .filter(action => action.userId.toString() === userId)
//             .pop()?.action || 'no-action'; // Fallback if no actions are found
    
//           return {
//             userId: new mongoose.Types.ObjectId(userId), // Ensure ObjectId format
//             totalBet,
//             lastAction
//           };
//         });
//         console.log("uniquePlayers",uniquePlayers)
//         // Sort players by their total bets
//         const sortedPlayers = uniquePlayers.sort((a, b) => a.totalBet - b.totalBet);
//         console.log("sortedPlayers",sortedPlayers)

//         let remainingPlayers = [...sortedPlayers];
    
//         while (remainingPlayers.length > 0) {
//           const minBet = remainingPlayers[0].totalBet;
//           const playersWithMinBet = remainingPlayers.filter(
//             (player) => player.totalBet === minBet
//           );
//           const playersWithHigherBets = remainingPlayers.filter(
//             (player) => player.totalBet > minBet
//           );
    
//           // Find or create the side pot for the players with the minimum bet
//           let sidePot = this.sidePots.find((pot) => {
//             const potPlayers = pot.players.map((id) => id.toString());
//             const currentPlayers = playersWithMinBet.map((player) =>
//               player.userId.toString()
//             );
//             return (
//               potPlayers.length === currentPlayers.length &&
//               potPlayers.every((id) => currentPlayers.includes(id))
//             );
//           });
//           const contributionAmount = minBet * playersWithMinBet.length;
//           // Create a new side pot if none exists for the current set of players
//           if (!sidePot) {
//             sidePot = {
//               amount: contributionAmount,
//               players: Array.from(new Set(playersWithMinBet.map((player) => player.userId))), // Ensure unique players
//             };
//             this.sidePots.push(sidePot);
//           } else { 
//             // Update players in the existing side pot ensuring no duplicates
//             const uniquePlayers = new Set([
//               ...sidePot.players.map((id) => id.toString()),
//               ...playersWithMinBet.map((player) => player.userId.toString()),
//             ]);
//             sidePot.players = Array.from(uniquePlayers).map((id) => new mongoose.Types.ObjectId(id));
//             sidePot.amount += contributionAmount;
//           }
     
//           // Update remaining players' bets and remove those who have matched the minimum
//           remainingPlayers = playersWithHigherBets.map((player) => ({
//             ...player,
//             totalBet: player.totalBet - minBet,
//           }));
//         }
    
//         // Continue with the game logic
//         await this.startNextRound(currentRound.name);
//       } else {
//         console.log(
//           "Round is not complete, active players have different contributions."
//         );
//         // Handle the case when players' contributions differ
//         this.currentTurnPlayer = nextPlayerId;
//         await this.save();
//       }
//     }
//   } 

//  // await this.save();
//  //await this.constructor.findOneAndUpdate({ _id: this._id }, this, { new: true });

//   // Check if the round is complete after this action
//  // await this.checkIfRoundComplete();
// };

PokerDeskSchema.methods.handlePlayerAction = async function (userId: mongoose.Types.ObjectId, action: PlayerAction, amount: number = 0) {
  if (!this.currentGame.currentTurnPlayer.equals(userId)) {
    throw new Error("It's not this player's turn");
  }
   const player = this.seats.find(seat => seat.userId.equals(userId));
   const playerSeat = this.currentGame.players.find(p => p.userId.equals(userId));
  if (!player) throw new Error('Player not found.');

  const currentRound = this.currentGame.rounds[this.currentGame.rounds.length - 1];

  if (!currentRound || currentRound.name === "showdown") {
    throw new Error('No round in progress');
  }

  let playerTotalBet;
  let maxBet;
  let totalBet;

  if (currentRound.actions && currentRound.actions.length > 0) {
    totalBet = currentRound.actions.reduce((total, action) => total + action.amount, 0);
    playerTotalBet = currentRound.actions.filter(action => action.userId.equals(userId)).reduce((total, action) => total + action.amount, 0);
    maxBet = Math.max(...currentRound.actions.map(action => action.amount));
  } else {
    playerTotalBet = 0;
    maxBet = 0;
    totalBet = 0;
  }
  
 // const callAmount = maxBet - playerTotalBet;
  const callAmount = Math.max(0, maxBet - playerTotalBet); // Avoid negative call amounts
    
  // Calculate minimum raise amount (based on last raise or small blind)
  // Calculate minimum raise amount (25% of pot)
   
  let newAction = {
    userId: userId,
    timestamp: new Date(), // Extract timestamp once
    action: 'fold', // Initialize action as an empty string
    amount: 0   // Initialize amount to 0
  };

  if (action === 'fold') {
    player.status = 'folded';
    newAction.action = 'fold';
  } else if (action === 'check') {
    if (totalBet === 0) {
      newAction.action = 'check';
    }
  } else if (action === 'call' && callAmount > 0) {
    // Player matches the current highest bet
    if (callAmount === 0) {
      newAction.action = 'check';
    }
    if (player.balanceAtTable < callAmount) throw new Error('Insufficient balance to call.');

    player.balanceAtTable -= callAmount;
    playerSeat.balanceAtTable -= callAmount;
    player.totalBet += callAmount;
    this.currentGame.pot += callAmount;

    newAction.action = 'call';
    newAction.amount = callAmount; // Set the amount for call

  } else if (action === 'raise') {
    // Set the default raise amount to 25% of the current pot
    const minRaiseAm =  Math.ceil(this.currentGame.pot * 0.25);
    let minRaiseAmount =  callAmount + minRaiseAm;
    if (amount <= callAmount || amount <= minRaiseAmount) {
      throw new Error(`Raise amount must be greater than or equal to ${minRaiseAmount}.`);
       
    }

    if (player.balanceAtTable < amount) throw new Error('Insufficient balance to raise.');

    player.balanceAtTable -= amount;
    player.totalBet += amount;
    playerSeat.balanceAtTable -= amount;
    this.currentGame.pot += amount;

    newAction.action = 'raise';
    newAction.amount = amount; // Set the amount for raise

  } else if (action === 'all-in') {
    // Player goes all-in with whatever balance they have left
    const allInAmount = player.balanceAtTable;
    player.status = 'all-in';
    player.balanceAtTable = 0;
    player.totalBet += allInAmount;
    playerSeat.balanceAtTable -= allInAmount;
    this.currentGame.pot += allInAmount;

    newAction.action = 'all-in';
    newAction.amount = allInAmount; // Set the amount for all-in

  } else {
    throw new Error('Invalid action.');
  }

  currentRound.actions.push(newAction);

  const activePlayers = this.currentGame.players.filter(p => p.status === 'active');

  if (activePlayers.length <= 1) {
    // Handle the situation where there's one or no active players
    await this.showdown(); // Call showdown method on currentGame
    console.log('Game will end, as there are one or no active players.');
    return;
  } else {
    // Convert the user IDs in the actions to strings and store them in a Set
    const actionPlayerIds = new Set(currentRound.actions.map(action => action.userId.toString()));

    // Get the next active player's ID
    const nextPlayerId = await this.currentGame.getNextActivePlayer(userId); // Call getNextActivePlayer on currentGame

    // Convert nextPlayerId to string for comparison
    const nextPlayerIdStr = nextPlayerId.toString();

    // Check if the next player has already placed an action
    const nextPlayerHasActed = actionPlayerIds.has(nextPlayerIdStr);

    if (!nextPlayerHasActed) {
      console.log('Round is not complete, waiting for all active players to act.');
      this.currentGame.currentTurnPlayer = nextPlayerId;
    } else {
      // Calculate the total bet amounts for each player
      const totalBets = currentRound.actions.reduce((acc, action) => {
        const { userId, amount } = action;
        if (amount >= 0) {
          acc[userId.toString()] = (acc[userId.toString()] || 0) + amount; // Initialize and sum the amounts for each user
        }
        return acc;
      }, {} as Record<string, number>);

      // Get unique total bet values
      const uniqueBets = new Set(Object.values(totalBets));

      // Check if all active players have bet the same amount
      if (uniqueBets.size === 1) {
        console.log("All players have equal total bets.");
        
        const uniquePlayers = Object.entries(totalBets).map(([userId, totalBet]) => {
          const lastAction = currentRound.actions.filter(action => action.userId.toString() === userId).pop()?.action || 'no-action';
          return {
            userId: new mongoose.Types.ObjectId(userId),
            totalBet,
            lastAction
          };
        });

        const sortedPlayers = uniquePlayers.sort((a, b) => a.totalBet - b.totalBet);
        let remainingPlayers = [...sortedPlayers];

        while (remainingPlayers.length > 0) {
          const minBet = remainingPlayers[0].totalBet;
          const playersWithMinBet = remainingPlayers.filter(player => player.totalBet === minBet);
          const playersWithHigherBets = remainingPlayers.filter(player => player.totalBet > minBet);

          let sidePot = this.currentGame.sidePots.find((pot) => {
            const potPlayers = pot.players.map((id) => id.toString());
            const currentPlayers = playersWithMinBet.map((player) => player.userId.toString());
            return potPlayers.length === currentPlayers.length && potPlayers.every((id) => currentPlayers.includes(id));
          });
          
          const contributionAmount = minBet * playersWithMinBet.length;

          if (!sidePot) {
            sidePot = {
              amount: contributionAmount,
              players: Array.from(new Set(playersWithMinBet.map((player) => player.userId))),
            };
            this.currentGame.sidePots.push(sidePot);
          } else { 
            const uniquePlayers = new Set([...sidePot.players.map((id) => id.toString()), ...playersWithMinBet.map((player) => player.userId.toString())]);
            sidePot.players = Array.from(uniquePlayers).map((id) => new mongoose.Types.ObjectId(id));
            sidePot.amount += contributionAmount;
          }

          remainingPlayers = playersWithHigherBets.map((player) => ({
            ...player,
            totalBet: player.totalBet - minBet,
          }));
        }

        // Continue with the game logic
       // await this.currentGame.startNextRound(currentRound.name); // Call startNextRound on currentGame
      if(currentRound.name === 'river'){
          console.log("calling show down method",currentRound.name );
          await this.showdown();
       }else{
        console.log("the current round is",currentRound.name );
        await this.currentGame.startNextRound(currentRound.name);
       }
      } else {
        console.log('Not all players have bet the same amount, waiting for next actions.');
        this.currentGame.currentTurnPlayer = nextPlayerId;
      }
    }
  }

  // Save the parent document at the end of the method
  await this.save();
  console.log("Game state updated successfully");
};

PokerDeskSchema.methods.showdown = async function () {
  // Check if there is a current game in progress
  if (!this.currentGame || this.currentGame.status !== 'in-progress') {
    throw new Error('Game is not currently in progress.');
  }

  // Gather players who are still eligible (active or all-in)
  const eligiblePlayers = this.currentGame.players.filter(player => 
    player.status === 'active' || player.status === 'all-in'
  );

  // Evaluate hands for eligible players
  const playerHands = evaluateHands(eligiblePlayers, this.currentGame.communityCards);
  console.log(`playerHands`, playerHands);

  // Distribute winnings from each side pot
  const sidePotResults = evaluateSidePots(eligiblePlayers, this.currentGame.communityCards, this.currentGame.sidePots);
  console.log("Side Pot Results", sidePotResults);

  for (const sidePot of this.currentGame.sidePots) {
    const { winners, rankings } = sidePotResults[`SidePot ${sidePot.amount}`];

    // Log rankings for the current side pot
    console.log(`Rankings for SidePot ${sidePot.amount}:`, rankings);
    console.log(`Winners for SidePot ${sidePot.amount}:`, winners);

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
      const topWinners = rankings.filter(rank => 
        rank.handRank === topRanking.handRank && rank.highCard === topRanking.highCard
      );
      
      const individualShare = sidePot.amount / topWinners.length;
      console.log(`Individual Share:`, individualShare);

      // Update each winning player's balance
      for (const rank of topWinners) {
        // Find the player in the seats instead of the current game
        const playerSeat = this.seats.find(seat => seat.userId.equals(rank.playerId));
        if (playerSeat) {
          playerSeat.balanceAtTable += individualShare; // Distribute winnings
          console.log(`Updated balance for playerId ${rank.playerId}:`, playerSeat.balanceAtTable);
        }
      }
    }
  }

  // Set the current game to null and update the desk game status
  this.currentGame.status = 'finished';
  //this.currentGame = null; // Clear current game reference

  // Save the updated desk state to the database
  await this.save();
};


// PokerGameSchema.methods.showdown = async function () {
//   // Check if the game is in progress
//   if (this.status !== 'in-progress') {
//     throw new Error('Game is not currently in progress.');
//   }

//   // Gather players who are still eligible (active or all-in)
//   const eligiblePlayers = this.players.filter(player => 
//     player.status === 'active' || player.status === 'all-in'
//   );

//   // Evaluate hands for eligible players
//   const playerHands = evaluateHands(eligiblePlayers, this.communityCards);
//   console.log(`playerHands`, playerHands);

//   // Distribute winnings from each side pot
//   const sidePotResults = evaluateSidePots(eligiblePlayers, this.communityCards, this.sidePots);
//   console.log("Side Pot Results", sidePotResults);

//   for (const sidePot of this.sidePots) {
//     const { winners, rankings } = sidePotResults[`SidePot ${sidePot.amount}`];

//     // Log rankings for the current side pot
//     console.log(`Rankings for SidePot ${sidePot.amount}:`, rankings);
//     console.log(`winners for SidePot ${sidePot.amount}:`, winners);

//     // If there are winning players, determine the actual winner
//     if (rankings.length > 0) {
//       // Sort rankings to find the highest-ranked hand
//       rankings.sort((a, b) => {
//         if (a.handRank !== b.handRank) {
//           return b.handRank - a.handRank; // higher handRank is better
//         }
//         return b.highCard - a.highCard; // Higher highCard is better
//       });

//       const topRanking = rankings[0];
//       const topWinners = rankings.filter(rank => rank.handRank === topRanking.handRank && rank.highCard === topRanking.highCard);
      
//       const individualShare = sidePot.amount / topWinners.length;
//       console.log(`individualShare`, individualShare);

//       // Update each winning player's balance
//       for (const rank of topWinners) {
//         const player = this.players.find(p => p.userId.equals(rank.playerId));
//         if (player) {
//           player.balanceAtTable += individualShare; // Distribute winnings
//           console.log(`Updated balance for playerId ${rank.playerId}:`, player.balanceAtTable);
 
//         }
//       }
//     }
//   }

//   // Set the game status to finished
//   this.status = 'finished';

//   // Save the updated game state to the database
//   await this.save();
// };
 
const PokerDesk = mongoose.models.Pokerdesk || mongoose.model<IPokerTable>('Pokerdesk', PokerDeskSchema);
 
export default PokerDesk;
