import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import PokerDesk from "../../models/pokerDesk";
import User from "../../models/user"; // Adjust path if needed
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
        pots: pokerGame.pots,
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

// Function to send table-specific data (seats, observers)
const sendTableData = async (io, tableId) => {
  try {
    const pokerTable = await PokerDesk.findById(tableId)
      .populate("seats.userId", "username") // Only populate username for seats
      .populate("observers", "username");   // Populate observers as well

    if (!pokerTable) throw new Error("Poker table not found");

    // Convert seats to include userId, username, buy-in amount, and balance
    const formattedSeats = pokerTable.seats
      .map((seat) => {
        if (seat.userId) {
          return {
            userId: seat.userId._id,
            username: seat.userId.username,
            buyInAmount: seat.buyInAmount,
            balanceAtTable: seat.balanceAtTable,
          };
        } else {
          return null; // If the seat is not occupied
        }
      })
      .filter((seat) => seat !== null); // Filter out any unoccupied seats

    // Emit only the table data to the room
    io.to(`table-${tableId}`).emit("tableData", {
      tableId: pokerTable._id,
      tableName: pokerTable.tableName,
      maxSeats: pokerTable.maxSeats,
      currentGameStatus: pokerTable.currentGameStatus,
      seats: formattedSeats, // Only table-specific seat information
    });

    console.log(`Table data for table ${tableId} sent to room`);
  } catch (error) {
    console.error(`Error sending table data: ${error.message}`);
  }
};

// Function to send game-specific data (pot, community cards, etc.)
const sendGameData = async (io, tableId) => {
  try {
    const pokerTable = await PokerDesk.findById(tableId);
    if (!pokerTable) throw new Error("Poker table not found");

    const pokerGame = pokerTable.currentGame;
    if (!pokerGame) {
      console.log("No active game for this table");
      return;
    }

    // Prepare game data if a game is active
    const currentGameData = {
      gameId: pokerGame._id,
      communityCards: pokerGame.communityCards,
      pot: pokerGame.pot,
      pots: pokerGame.pots,
      status: pokerGame.status,
      currentTurnPlayer: pokerGame.currentTurnPlayer,
      currentRound: pokerGame.rounds[pokerGame.rounds.length - 1],
      rounds: pokerGame.rounds
    };

    // Emit only the game data to the room
    io.to(`table-${tableId}`).emit("gameData", {
      currentGame: currentGameData, // Game-specific data only
    });

    console.log(`Game data for table ${tableId} sent to room`);
  } catch (error) {
    console.error(`Error sending game data: ${error.message}`);
  }
};


const sendPlayerActionResult = async (io, tableId, actionResult) => {
  try {
    io.to(`table-${tableId}`).emit("playerActionResult", {
      actionResult,  // Emit the action result directly
    });
    console.log(`Player action result sent for table ${tableId}`);
  } catch (error) {
    console.error(`Error sending player action result: ${error.message}`);
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

// export default function handler(req, res) {
//   if (!res.socket.server.io) {
//     console.log("Initializing new Socket.io server...");
//     const io = new Server(res.socket.server, {
//       path: "/api/socket",
//       cors: {
//         origin: ["http://localhost:8081", "http://192.168.1.9:3000"],
//       },
//     });
//     res.socket.server.io = io;

//     io.on("connection", (socket) => {
//       console.log(`Client connected: ${socket.id}`);

//       let currentUserId = null;
//       let currentTableId = null;

//       socket.on("register", ({ token }) => {
//         try {
//           const decoded = jwt.verify(token, process.env.JWT_SECRET);
//           currentUserId = decoded.userId;
//           addSocket(currentUserId, socket.id);
//         } catch (error) {
//           socket.emit("error", { message: "Invalid token" });
//         }
//       });

//       socket.on("joinTable", async ({ token, tableId }) => {
//         try {
//           const decoded = jwt.verify(token, process.env.JWT_SECRET);
//           currentUserId = decoded.userId;
//           currentTableId = tableId;

//           socket.join(`table-${tableId}`);

//           // Send both table and game data when player joins
//           await sendTableData(io, tableId);
//           await sendGameData(io, tableId);
//         } catch (error) {
//           socket.emit("error", { message: "Error joining table" });
//         }
//       });

//       socket.on("sitAtTable", async ({ token, tableId, buyInAmount }) => {
//         try {
//           const decoded = jwt.verify(token, process.env.JWT_SECRET);
//           const userId = decoded.userId;

//           const pokerTable = await PokerDesk.findById(tableId);
//           if (!pokerTable) throw new Error("Poker table not found");

//           const isAlreadySeated = await pokerTable.isUserSeated(userId);
//           if (isAlreadySeated) {
//             return socket.emit("error", { message: "User already seated at this table" });
//           }

//           // Add user to seat and send updated table data
//           await pokerTable.addUserToSeat(userId, buyInAmount);
//           await sendTableData(io, tableId);
//         } catch (error) {
//           socket.emit("error", { message: "Error sitting at table" });
//         }
//       });

//       socket.on("leaveSeat", async ({ token, tableId }) => {
//         try {
//           const decoded = jwt.verify(token, process.env.JWT_SECRET);
//           const userId = decoded.userId;

//           const pokerTable = await PokerDesk.findById(tableId);
//           if (!pokerTable) throw new Error("Poker table not found");

//           await pokerTable.userLeavesSeat(userId);
//           await pokerTable.removeObserver(userId);

//           // Send updated table data when a player leaves a seat
//           await sendTableData(io, tableId);
//         } catch (error) {
//           socket.emit("error", { message: "Error leaving seat" });
//         }
//       });

//       socket.on("playerAction", async ({ tableId, action, amount, userId }) => {
//         try {
//           const pokerTable = await PokerDesk.findById(tableId);
//           if (!pokerTable) throw new Error("Table not found");

//           const pokerGame = pokerTable.currentGame;
//           if (!pokerGame) throw new Error("Game not found");

//           if (!pokerGame.currentTurnPlayer.equals(userId)) {
//             throw new Error("It's not your turn.");
//           }

//          const result = await pokerTable.handlePlayerAction(userId, action, amount);
      
//          if (result.gameStatus === "finished") {
//           // Send the final game data if the game has ended
//           await sendGameData(io, tableId); 
//         }else{
//           await sendPlayerActionResult(io, tableId, result.action);
//         }
//           // Send player action result
         
//           // Check if the game status is finished, and if so, send game data with pots
//           // if (pokerGame.status === "finished") {
//           //   await sendGameData(io, tableId);  // This will include pots data if game is finished
//           // }
//         } catch (error) {
//           socket.emit("error", { message: error.message });
//         }
//       });

//       socket.on("createGame", async ({ token, tableId }) => {
//         try {
//           const decoded = jwt.verify(token, process.env.JWT_SECRET);
//           currentUserId = decoded.userId;

//           const pokerTable = await PokerDesk.findById(tableId);
//           if (!pokerTable) throw new Error("Poker table not found");

//           await pokerTable.createGameFromTable();

//           // Send only game data when a new game is created
//           await sendGameData(io, tableId);
//         } catch (error) {
//           socket.emit("error", { message: error.message });
//         }
//       });

//       socket.on("disconnect", async () => {
//         removeSocket(socket.id);
//         if (currentTableId && currentUserId) {
//           const pokerTable = await PokerDesk.findById(currentTableId);
//           if (pokerTable) {
//             await pokerTable.removeObserver(currentUserId);
//             socket.leave(`table-${currentTableId}`);
//           }
//         }
//       });
//     });
//   }

//   res.end();
// }
