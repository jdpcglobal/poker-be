import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import PokerDesk from "../../models/pokerDesk";
import User from "../../models/user"; // Adjust path if needed
import PokerGame from "../../models/pokerGame";
const socketRegistry = {};

// Add a socket to the registry
const addSocket = (userId, socketId) => {
  if (!userId) throw new Error("User ID is required to add socket");
  if (!socketRegistry[userId]) socketRegistry[userId] = [];
  if (!socketRegistry[userId].includes(socketId)) {
    socketRegistry[userId].push(socketId);
    console.log(`Socket ${socketId} added for user ${userId}`);
  }
};

// Remove a socket from the registry
const removeSocket = (socketId) => {
  for (const userId in socketRegistry) {
    socketRegistry[userId] = socketRegistry[userId].filter(
      (id) => id !== socketId
    );
    if (socketRegistry[userId].length === 0) {
      delete socketRegistry[userId];
      console.log(`All sockets removed for user ${userId}`);
    }
  }
  console.log(`Socket ${socketId} removed from registry`);
};

// Update table data and broadcast to room
// const updateTableForRoom = async (io, tableId) => {
//     try {
//       const pokerTable = await PokerDesk.findById(tableId)
//         .populate('observers', 'username')
//         .populate('seats.userId', 'username'); // Only populate userId and username

//       if (!pokerTable) throw new Error('Poker table not found');

//       // Convert seats to include only userId and username (if the seat is occupied)
//       const formattedSeats = pokerTable.seats.map(seat => {
//         if (seat.userId) {
//           return {
//             userId: seat.userId._id,
//             username: seat.userId.username,
//             buyInAmount: seat.buyInAmount,
//           };
//         } else {
//           return null; // If the seat is not occupied
//         }
//       }).filter(seat => seat !== null); // Filter out any unoccupied seats

//       // Emit the table data to the room
//       io.to(`table-${tableId}`).emit('tableData', {
//         tableId: pokerTable._id,
//         tableName: pokerTable.tableName,
//         maxSeats: pokerTable.maxSeats,
//         currentGameStatus: pokerTable.currentGameStatus,
//         seats: formattedSeats,
//       });

//       console.log(`Table ${tableId} data sent to room`);
//     } catch (error) {
//       console.error(`Error updating table: ${error.message}`);
//     }
//   };

//   const updateGameForRoom = async (io, gameId) => {
//     try {
//       const pokerGame = await PokerGame.findById(gameId)
//         .populate('players.userId', 'username');

//       if (!pokerGame) throw new Error('Poker game not found');

//       io.to(`table-${pokerGame.pokerDeskId}`).emit('gameData', {
//         gameId: pokerGame._id,
//         players: pokerGame.players.map(player => ({
//           userId: player.userId._id,
//           username: player.userId.username,
//           balanceAtTable: player.balanceAtTable,
//           totalBet: player.totalBet,
//           holeCards: player.holeCards,
//           role: player.role,
//         })),
//         communityCards: pokerGame.communityCards,
//         pot: pokerGame.pot,
//         sidePots: pokerGame.sidePots,
//         status: pokerGame.status,
//         currentTurnPlayer: pokerGame.currentTurnPlayer,
//         currentRound: pokerGame.rounds[pokerGame.rounds.length - 1]
//       });

//       console.log(`Game ${gameId} data sent to room`);
//     } catch (error) {
//       console.error(`Error updating game: ${error.message}`);
//     }
//   };

// Utility to update table data and broadcast to room
const updateTableForRoom = async (io, tableId) => {
  try {
    const pokerTable = await PokerDesk.findById(tableId)
      .populate("observers", "username")
      .populate("seats.userId", "username"); // Only populate userId and username

    if (!pokerTable) throw new Error("Poker table not found");

    // Convert seats to include only userId and username (if the seat is occupied)
    const formattedSeats = pokerTable.seats
      .map((seat) => {
        if (seat.userId) {
          return {
            userId: seat.userId._id,
            username: seat.userId.username,
            buyInAmount: seat.buyInAmount,
          };
        } else {
          return null; // If the seat is not occupied
        }
      })
      .filter((seat) => seat !== null); // Filter out any unoccupied seats

    // Emit the table data to the room
    io.to(`table-${tableId}`).emit("tableData", {
      tableId: pokerTable._id,
      tableName: pokerTable.tableName,
      maxSeats: pokerTable.maxSeats,
      currentGameStatus: pokerTable.currentGameStatus,
      seats: formattedSeats,
    });

    console.log(`Table ${tableId} data sent to room`);
  } catch (error) {
    console.error(`Error updating table: ${error.message}`);
  }
};
// Utility to update game data and broadcast to room
// const updateGameForRoom = async (io, tableId) => {
//   try {
//     const pokerTable = await PokerDesk.findById(tableId).populate(
//       "currentGame.players.userId",
//       "username"
//     ); // Populate player usernames

//     const pokerGame = pokerTable.currentGame;
//     if (!pokerGame) throw new Error("Poker game not found");

//     // Emit game data to the room
//     io.to(`table-${tableId}`).emit("gameData", {
//       gameId: pokerGame._id,
//       players: pokerGame.players.map((player) => ({
//         userId: player.userId._id,
//         username: player.userId.username,
//         balanceAtTable: player.balanceAtTable,
//         totalBet: player.totalBet,
//         holeCards: player.holeCards,
//         role: player.role,
//       })),
//       communityCards: pokerGame.communityCards,
//       pot: pokerGame.pot,
//       sidePots: pokerGame.sidePots,
//       status: pokerGame.status,
//       currentTurnPlayer: pokerGame.currentTurnPlayer,
//       currentRound: pokerGame.rounds[pokerGame.rounds.length - 1],
//     });

//     console.log(`Game data for table ${tableId} sent to room`);
//   } catch (error) {
//     console.error(`Error updating game: ${error.message}`);
//   }
// };

const sendNecessaryData = async (io, tableId) => {
  try {
    const pokerTable = await PokerDesk.findById(tableId)
      .populate("seats.userId", "username") // Only populate username for seats
      .populate("observers", "username");   // Populate observers as well

    if (!pokerTable) throw new Error("Poker table not found");

    const pokerGame = pokerTable.currentGame;

    // Create a map of userId to their game-specific details (if they are playing in the current game)
    const gamePlayersMap = {};
    if (pokerGame) {
      pokerGame.players.forEach((player) => {
        gamePlayersMap[player.userId.toString()] = {
          totalBet: player.totalBet,
          holeCards: player.holeCards,
          role: player.role,
        };
      });
    }

    // Convert seats to include userId, username, buy-in amount, and game-specific data if the seat member is playing
    const formattedSeats = pokerTable.seats
      .map((seat) => {
        if (seat.userId) {
          const userIdStr = seat.userId._id.toString();

          // Add game-specific details only if the user is part of the current game
          const gameDataForUser = gamePlayersMap[userIdStr] || {
            totalBet: null,
            holeCards: null,
            role: null,
          };

          return {
            userId: seat.userId._id,
            username: seat.userId.username,
            buyInAmount: seat.buyInAmount,
            balanceAtTable: seat.balanceAtTable,
            ...gameDataForUser, // Spread the game-specific data here
          };
        } else {
          return null; // If the seat is not occupied
        }
      })
      .filter((seat) => seat !== null); // Filter out any unoccupied seats

    // Prepare game data if a game is active
    let currentGameData = null;
    if (pokerGame) {
      currentGameData = {
        gameId: pokerGame._id,
        communityCards: pokerGame.communityCards,
        pot: pokerGame.pot,
        sidePots: pokerGame.sidePots,
        status: pokerGame.status,
        currentTurnPlayer: pokerGame.currentTurnPlayer,
        currentRound: pokerGame.rounds[pokerGame.rounds.length - 1],
        rounds : pokerGame.rounds
      };
    }

    // Emit the combined table and game data to the room
    io.to(`table-${tableId}`).emit("tableData", {
      tableId: pokerTable._id,
      tableName: pokerTable.tableName,
      maxSeats: pokerTable.maxSeats,
      currentGameStatus: pokerTable.currentGameStatus,
      seats: formattedSeats, // Include the updated seat information with game-specific details
      currentGame: currentGameData, // Include the current game data if a game is active
    });

    console.log(`Data for table ${tableId} (table and game) sent to room`);
  } catch (error) {
    console.error(`Error sending necessary data: ${error.message}`);
  }
};


const updateGameForRoom = async (io, tableId) => {
  try {
    const pokerTable = await PokerDesk.findById(tableId)
      .populate("currentGame.players.userId", "username"); // Populate player usernames

    const pokerGame = pokerTable.currentGame;
    if (!pokerGame) throw new Error("Poker game not found");

    // Create a mapping of userId to balanceAtTable from the seats
    const seatsBalanceMap = {};
    pokerTable.seats.forEach(seat => {
      if (seat.userId) {
        seatsBalanceMap[seat.userId.toString()] = seat.balanceAtTable;
      }
    });

    // Emit game data to the room
    io.to(`table-${tableId}`).emit("gameData", {
      gameId: pokerGame._id,
      players: pokerGame.players.map((player) => ({
        userId: player.userId._id,
        username: player.userId.username,
        balanceAtTable: seatsBalanceMap[player.userId._id.toString()] || 0, // Get balance from seats
        totalBet: player.totalBet,
        holeCards: player.holeCards,
        role: player.role,
      })),
      communityCards: pokerGame.communityCards,
      pot: pokerGame.pot,
      sidePots: pokerGame.sidePots,
      status: pokerGame.status,
      currentTurnPlayer: pokerGame.currentTurnPlayer,
      currentRound: pokerGame.rounds[pokerGame.rounds.length - 1],
    });

    console.log(`Game data for table ${tableId} sent to room`);
  } catch (error) {
    console.error(`Error updating game: ${error.message}`);
  }
};


const checkAndUpdateGameForRoom = async (io, tableId) => {
  try {
    // Find an active game for the given tableId
    const activeGame = await PokerGame.findOne({
      pokerDeskId: tableId,
      status: "in-progress",
    });

    if (activeGame) {
      // Emit game data to the room
      io.to(`table-${tableId}`).emit("gameData", {
        gameId: activeGame._id,
        players: activeGame.players.map((player) => ({
          userId: player.userId._id,
          username: player.userId.username,
          balanceAtTable: player.balanceAtTable,
          totalBet: player.totalBet,
          holeCards: player.holeCards,
          role: player.role,
        })),
        communityCards: activeGame.communityCards,
        pot: activeGame.pot,
        minimumBet: activeGame.minimumBet,
        status: activeGame.status,
        rounds: activeGame.rounds,
      });

      console.log(`Game ${activeGame._id} data sent to table room ${tableId}`);
    } else {
      console.log(`No active game found for table ${tableId}`);
    }
  } catch (error) {
    console.error(
      `Error checking and updating game for table ${tableId}: ${error.message}`
    );
  }
};

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log("Initializing new Socket.io server...");
    const io = new Server(res.socket.server, {
      path: "/api/socket",
      cors: {
        origin: ["http://localhost:8081", "http://192.168.1.9:3000"], // Allowed origins
      },
    });
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);

      let currentUserId = null;
      let currentTableId = null;
      let currentGameId = null;
      // User registration with JWT
      socket.on("register", ({ token }) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          currentUserId = decoded.userId;
          console.log(`User ${currentUserId} registered`);

          addSocket(currentUserId, socket.id);
        } catch (error) {
          console.error("User registration error:", error.message);
          socket.emit("error", { message: "Invalid token" });
        }
      });

      // Join a table
      socket.on("joinTable", async ({ token, tableId }) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userId = decoded.userId;
          currentTableId = tableId;

          socket.join(`table-${tableId}`);
          console.log(`User ${userId} joined table room ${tableId}`);

          const pokerTable = await PokerDesk.findById(tableId);
          if (!pokerTable) throw new Error("Poker table not found");

          // await pokerTable.addObserver(userId);
         // await updateTableForRoom(io, tableId); 
        //  await checkAndUpdateGameForRoom(io, tableId);
        await sendNecessaryData(io, tableId);
        } catch (error) {
          console.error(`Error joining table: ${error.message}`);
          socket.emit("error", { message: "Error joining table" });
        }
      });

      // socket.on('playerAction', async ({ gameId, action, amount, userId }) => {
      //   console.log("current user id ",userId);
      //   try {
      //     if (!userId || !userId) {
      //       throw new Error('User not registered or not in a table.');
      //     }

      //     // Find the current game
      //     const pokerGame = await PokerGame.findById(gameId);
      //     if (!pokerGame) throw new Error('Game not found.');

      //     // Check if it's the player's turn
      //     if (!pokerGame.currentTurnPlayer.equals(userId)) {
      //       throw new Error("It's not your turn.");
      //     }

      //     // Handle the player action using PokerGame's methods
      //     await pokerGame.handlePlayerAction(userId, action, amount);

      //     // Broadcast the updated game state to the room
      //     await updateGameForRoom(io, gameId);
      //   } catch (error) {
      //     console.error(`Error handling player action: ${error.message}`);
      //     socket.emit('error', { message: error.message });
      //   }
      // });

      // Sit at a table

      // Player action (game-related event)

       // Player action (game-related event)
       socket.on('playerAction', async ({ tableId, action, amount, userId }) => {
        try {
          console.log("tableId",tableId);
          if (!userId || !currentTableId) {
            throw new Error('User not registered or not in a table.');
          }

          const pokerTable = await PokerDesk.findById(tableId);
          if (!pokerTable) throw new Error('Table not found.');

          const pokerGame = pokerTable.currentGame;
          if (!pokerGame) throw new Error('Game not found.');

          // Check if it's the player's turn
          if (!pokerGame.currentTurnPlayer.equals(userId)) {
            throw new Error("It's not your turn.");
          }

          // Handle the player action
          await pokerTable.handlePlayerAction(userId, action, amount);

          // Broadcast the updated game state to the room
        //  await updateGameForRoom(io, tableId);
        await sendNecessaryData(io, tableId);
        } catch (error) {
          console.error(`Error handling player action: ${error.message}`);
          socket.emit('error', { message: error.message });
        }
      });

      socket.on("sitAtTable", async ({ token, tableId, buyInAmount }) => {
        console.log("hii");
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userId = decoded.userId;
          console.log(userId, "hiiiiiiiiiiifsd");
          const pokerTable = await PokerDesk.findById(tableId);
          console.log("hii how are you");
          if (!pokerTable) throw new Error("Poker table not found");
          console.log("hii how are you 7u", pokerTable);
          const isAlreadySeated = await pokerTable.isUserSeated(userId);
          if (isAlreadySeated) {
            socket.emit("error", {
              message: "User already seated at this table",
            });
            return;
          }

          // Add user to seat with only userId and username
          await pokerTable.addUserToSeat(userId, buyInAmount);
          //await updateTableForRoom(io, tableId);
          await sendNecessaryData(io, tableId);
        } catch (error) {
          console.error(`Error sitting at table: ${error.message}`);
          console.log(`Error sitting at table: ${error.message}`);
          socket.emit("error", { message: "Error sitting at table" });
        }
      });

      // Leave a seat
      socket.on("leaveSeat", async ({ token, tableId }) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userId = decoded.userId;

          const pokerTable = await PokerDesk.findById(tableId);
          if (!pokerTable) throw new Error("Poker table not found");

          await pokerTable.userLeavesSeat(userId);
          await pokerTable.removeObserver(userId);
        //  await updateTableForRoom(io, tableId);
        await sendNecessaryData(io, tableId);
        } catch (error) {
          console.error(`Error leaving seat: ${error.message}`);
          socket.emit("error", { message: "Error leaving seat" });
        }
      });

      // socket.on('createGame', async ({ token, tableId }) => {
      //   console.log("Creating game...");
      //   try {
      //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
      //     const userId = decoded.userId;
      //     console.log(userId, "User ID");

      //     const pokerTable = await PokerDesk.findById(tableId);
      //     if (!pokerTable) throw new Error('Poker table not found');
      //     console.log("Poker table found");

      //     const newPokerGame = await PokerGame.createGameFromTable(tableId);
      //     currentGameId = newPokerGame._id;

      //   //  socket.join(`game-${newPokerGame._id}`);
      //     //io.to(`table-${tableId}`).emit('gameCreated', { gameId: newPokerGame._id });
      //     console.log(`Game created with ID: ${newPokerGame._id}`);
      //     await updateGameForRoom(io, newPokerGame._id);
      //   } catch (error) {
      //     console.error(`Error creating game: ${error.message}`);
      //     socket.emit('error', { message: 'Error creating game' });
      //   }
      // });
      // Create a new game for the table

      socket.on('createGame', async ({ token, tableId }) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const currentUserId = decoded.userId;
      
          const pokerTable = await PokerDesk.findById(tableId);
          if (!pokerTable) throw new Error('Poker table not found');
      
          // Check if a game can be created
          await pokerTable.createGameFromTable();  // Ensure this call is on a valid instance
          await sendNecessaryData(io, tableId);
         // await updateGameForRoom(io, tableId);
        } catch (error) {
          console.error(`Error creating game: ${error.message}`);
          socket.emit('error', { message: error.message });
        }
      });
      

      // Handle user disconnection
      socket.on("disconnect", async () => {
        console.log(`Client disconnected: ${socket.id}`);
        removeSocket(socket.id);

        if (currentTableId && currentUserId) {
          const pokerTable = await PokerDesk.findById(currentTableId);
          if (pokerTable) {
            await pokerTable.removeObserver(currentUserId);
          //  await updateTableForRoom(io, currentTableId);
          
            socket.leave(`table-${currentTableId}`);
            console.log(
              `User ${currentUserId} left table room ${currentTableId}`
            );
          }
        }
      });
    });
  }

  res.end();
}
