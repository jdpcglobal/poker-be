export interface ICard {
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  }
  
  export interface IPlayer {
    userId: string; // Assuming string type for player ID, adjust as needed
    holeCards: ICard[];
    status: 'active' | 'folded'; // Player status to determine eligibility
  }
  
  export interface IPlayerHand {
    playerId: string;
    hand: string; // The evaluated hand as a string (e.g., "straight-flush")
    handRank: number; // The ranking of the hand
    highCard: number; // The highest card in the hand
  }
  
  export interface ISidePot {
    amount: number;
    players: string[]; // Array of player IDs participating in this side pot
  }
  