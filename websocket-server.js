import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for storing the leaderboard
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// Default word list
const DEFAULT_WORDS = [
  "cat", "dog", "house", "tree", "car", "bicycle", "sun", "moon", "star", "flower",
  "bird", "fish", "book", "computer", "phone", "chair", "table", "door", "window",
  "cloud", "rain", "snow", "mountain", "beach", "ocean", "bridge", "train", "bus",
  "airplane", "rocket", "robot", "monster", "ghost", "dragon", "unicorn", "castle",
  "pizza", "hamburger", "ice cream", "cake", "cookie", "apple", "banana", "guitar",
  "piano", "camera", "hat", "shirt", "shoes", "bag", "key", "lock", "pen", "pencil"
];

// Default game settings
const DEFAULT_SETTINGS = {
  timePerRound: 40,
  customWords: [],
  useOnlyCustomWords: false,
  minRounds: 1,
  maxRounds: 5
};

// Load leaderboard from file or create new one
function loadLeaderboard() {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
  
  return [];
}

// Save leaderboard to file
function saveLeaderboard(leaderboard) {
  try {
    const data = JSON.stringify(leaderboard, null, 2);
    fs.writeFileSync(LEADERBOARD_FILE, data, 'utf8');
  } catch (error) {
    console.error('Error saving leaderboard:', error);
  }
}

// Update player's entry in the global leaderboard
function updateLeaderboard(playerName, score, wordsGuessed) {
  const leaderboard = loadLeaderboard();
  const existingEntry = leaderboard.find(entry => entry.playerName === playerName);
  
  if (existingEntry) {
    existingEntry.score += score;
    existingEntry.gamesPlayed += 1;
    existingEntry.wordsGuessed += wordsGuessed;
    existingEntry.date = new Date().toISOString();
  } else {
    leaderboard.push({
      playerName,
      score,
      gamesPlayed: 1,
      wordsGuessed,
      date: new Date().toISOString()
    });
  }
  
  saveLeaderboard(leaderboard);
}

// Get top 10 players from leaderboard
function getTopPlayers(count = 10) {
  const leaderboard = loadLeaderboard();
  return leaderboard.sort((a, b) => b.score - a.score).slice(0, count);
}

const server = createServer((req, res) => {
  // Handle CORS preflight requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
  } else if (req.url === "/leaderboard" && req.method === "GET") {
    // Endpoint to get the top players
    const topPlayers = getTopPlayers();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(topPlayers));
  } else if (req.url === "/admin/stats" && req.method === "GET") {
    // Endpoint for admin stats
    const serverStartTime = new Date(Date.now() - process.uptime() * 1000).toISOString();
    
    // Count active connections
    let activeConnections = 0;
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        activeConnections++;
      }
    });
    
    // Prepare active rooms list with more details
    const activeRoomsList = [];
    rooms.forEach((room, roomId) => {
      const roomData = {
        roomId,
        playerCount: room.players.length,
        isActive: room.isRoundActive || false,
        currentRound: room.roundNumber !== undefined ? room.roundNumber + 1 : 0,
        maxRounds: room.settings?.maxRounds || 0,
        timeLeft: room.timeLeft || 0,
        players: room.players.map(p => ({
          name: p.name,
          score: p.score || 0,
          isReady: p.isReady || false,
          isDrawing: p === room.currentDrawer,
          correctGuess: p.correctGuess || false
        })),
        currentWord: room.currentWord,
        settings: room.settings
      };
      activeRoomsList.push(roomData);
    });
    
    // Create stats object
    const stats = {
      uptime: Math.floor(process.uptime()),
      totalConnections: totalConnectionCount,
      activeConnections,
      totalRooms: totalRoomCount,
      activeRooms: rooms.size,
      startTime: serverStartTime,
      defaultWords: DEFAULT_WORDS,
      activeRoomsList
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });
const rooms = new Map();

// Statistics tracking
let totalConnectionCount = 0;
let totalRoomCount = 0;

// Timer functions
function startTimer(room) {
  // Record when the round started
  room.roundStartTime = Date.now();
  
  // Set initial round time based on settings
  room.timeLeft = room.settings.timePerRound;
  
  // Log start of timer
  console.log(`Starting timer for room ${room.roomId}, ${room.timeLeft} seconds`);
  
  // Send initial time update to all players
  broadcastTimeUpdate(room);
  
  // Clear any existing timer
  if (room.roundTimer) {
    clearInterval(room.roundTimer);
    room.roundTimer = null;
  }
  
  // Set interval to update time every second
  const timerInterval = setInterval(() => {
    // Stop timer if room no longer exists
    if (!rooms.has(room.roomId)) {
      clearInterval(timerInterval);
      return;
    }
    
    // Decrement the time
    room.timeLeft--;
    
    // Log timer updates occasionally 
    if (room.timeLeft % 10 === 0 || room.timeLeft <= 5) {
      console.log(`Timer update: ${room.timeLeft} seconds remaining in room ${room.roomId}`);
    }
    
    // Broadcast the time update
    broadcastTimeUpdate(room);
    
    // Check if time is up
    if (room.timeLeft <= 0) {
      console.log(`Time's up in room ${room.roomId}!`);
      clearInterval(timerInterval);
      endRound(room);
    }
  }, 1000);
  
  // Store timer reference for cleanup
  room.roundTimer = timerInterval;
}

function broadcastTimeUpdate(room) {
  room.players.forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      // Send time update every second
      player.ws.send(JSON.stringify({
        type: "timeUpdate",
        timeLeft: room.timeLeft
      }));
      
      // Send full game state only at specific intervals or when time is low
      if (room.timeLeft % 5 === 0 || room.timeLeft <= 10) { 
        player.ws.send(JSON.stringify({
          type: "gameState",
          gameState: {
            status: 'playing',
            currentRound: room.roundNumber + 1,
            maxRounds: room.settings.maxRounds,
            timeLeft: room.timeLeft,
            drawer: {
              id: room.currentDrawer.name,
              name: room.currentDrawer.name
            },
            word: player === room.currentDrawer ? room.currentWord : undefined,
            isDrawing: player === room.currentDrawer
          }
        }));
      }
    }
  });
}

function getWordForRound(room) {
  // First, ensure DEFAULT_WORDS is an array
  if (!Array.isArray(DEFAULT_WORDS) || DEFAULT_WORDS.length === 0) {
    console.error('DEFAULT_WORDS is not properly defined or is empty');
    return 'drawing'; // Fallback word
  }
  
  // Start with default words
  let wordList = DEFAULT_WORDS;
  
  // Check if we have valid custom words
  const hasCustomWords = Array.isArray(room.settings.customWords) && 
                         room.settings.customWords.length > 0;
  
  if (hasCustomWords) {
    // If useOnlyCustomWords is true, use only custom words
    if (room.settings.useOnlyCustomWords) {
      console.log(`Using only custom words (${room.settings.customWords.length} words)`);
      wordList = room.settings.customWords;
    } else {
      // Otherwise combine both lists
      console.log(`Combining default and custom word lists (${DEFAULT_WORDS.length} + ${room.settings.customWords.length} words)`);
      wordList = [...DEFAULT_WORDS, ...room.settings.customWords];
    }
  }
  
  // Pick a random word from the list
  if (wordList.length === 0) {
    console.warn('Word list is empty, using fallback word');
    return 'drawing'; // Fallback word
  }
  
  const randomIndex = Math.floor(Math.random() * wordList.length);
  const word = wordList[randomIndex];
  console.log(`Selected word: ${word} from ${wordList.length} total words`);
  
  return word;
}

function startNewTurn(room) {
  // Reset all players' correctGuess status
  room.players.forEach(player => {
    player.correctGuess = false;
    player.guessTime = undefined;
  });
  
  // Clear previous timer if exists
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }

  // Select next drawer - ensure each player gets a turn
  let nextDrawerIndex = 0;
  
  if (room.currentDrawer) {
    const currentDrawerIndex = room.players.findIndex(p => p === room.currentDrawer);
    if (currentDrawerIndex !== -1) {
      nextDrawerIndex = (currentDrawerIndex + 1) % room.players.length;
    } else {
      nextDrawerIndex = Math.floor(Math.random() * room.players.length);
    }
  } else {
    // First turn, pick random drawer
    console.log("First turn: Selecting random drawer.");
    nextDrawerIndex = Math.floor(Math.random() * room.players.length);
  }
  
  room.currentDrawer = room.players[nextDrawerIndex];
  console.log(`New drawer selected: ${room.currentDrawer.name} (Turn ${nextDrawerIndex + 1} of Round ${room.roundNumber + 1})`);

  // Select random word
  const randomWord = getWordForRound(room);
  room.currentWord = randomWord;

  // Notify drawer of their word
  if (room.currentDrawer && room.currentDrawer.ws && room.currentDrawer.ws.readyState === WebSocket.OPEN) {
    room.currentDrawer.ws.send(JSON.stringify({
      type: "drawerWord",
      word: randomWord
    }));
  }

  // Notify all players of new drawer and clear their canvases
  room.players.forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      // Send the new drawer info
      player.ws.send(JSON.stringify({
        type: "newDrawer",
        drawer: room.currentDrawer ? room.currentDrawer.name : null
      }));
      
      // Update game state
      player.ws.send(JSON.stringify({
        type: "gameState",
        gameState: {
          status: 'playing',
          currentRound: room.roundNumber + 1,
          maxRounds: room.settings.maxRounds,
          timeLeft: room.settings.timePerRound,
          drawer: {
            id: room.currentDrawer.name,
            name: room.currentDrawer.name
          },
          // Only send word to the drawer
          word: player === room.currentDrawer ? room.currentWord : undefined,
          // Set isDrawing flag only for the drawer
          isDrawing: player === room.currentDrawer
        }
      }));
      
      // Clear canvas for all players
      player.ws.send(JSON.stringify({
        type: "clear"
      }));
    }
  });

  // Mark round as active
  room.isRoundActive = true;
  
  // Start round timer
  startTimer(room);
}

function checkAllPlayersReady(room) {
  return room.players.length >= 2 && room.players.every(player => player.isReady);
}

function checkAllPlayersGuessed(room) {
  // Check if all non-drawer players have guessed correctly
  const nonDrawerPlayers = room.players.filter(p => p !== room.currentDrawer);
  return nonDrawerPlayers.every(p => p.correctGuess);
}

function tryStartGame(room) {
  if (checkAllPlayersReady(room) && !room.isRoundActive) {
    broadcastSystemMessage(room, "All players are ready! Starting the game...");
    
    // Reset scores before starting a new game
    room.players.forEach(player => {
      player.score = 0;
    });
    
    // Reset round number
    room.roundNumber = 0;
    
    // Set game status to 'playing'
    room.status = 'playing';
    
    // Broadcast game state update to all players
    room.players.forEach(player => {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({
          type: "gameState",
          gameState: {
            status: 'playing',
            currentRound: 1,
            maxRounds: room.settings.maxRounds,
            timeLeft: room.settings.timePerRound
          }
        }));
      }
    });
    
    // Start the first turn after a short delay
    setTimeout(() => startNewTurn(room), 3000);
  }
}

function broadcastSystemMessage(room, message) {
  room.players.forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: "system",
        content: message
      }));
    }
  });
}

function endRound(room) {
  // Clear timer
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }

  // Mark round as inactive
  room.isRoundActive = false;

  const correctGuessers = room.players
    .filter(p => p.correctGuess && p !== room.currentDrawer)
    .map(p => ({
      name: p.name,
      time: p.guessTime || 0
    }));

  // Reveal the word to all players
  room.players.forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: "roundEnd",
        word: room.currentWord,
        correctGuessers
      }));
    }
  });

  // Get the current drawer index
  const currentDrawerIndex = room.players.findIndex(p => p === room.currentDrawer);
  
  // Check if this was the last drawer in the current round
  const isLastDrawerInRound = currentDrawerIndex === room.players.length - 1 || currentDrawerIndex === -1;
  
  // Clear current word
  room.currentWord = null;
  
  // If this was the last drawer in the round, increment the round number
  if (isLastDrawerInRound) {
    room.roundNumber++;
    // Broadcast round completion
    broadcastSystemMessage(room, `Round ${room.roundNumber} completed!`);
  }

  // Check if game is over (all rounds completed)
  if (room.roundNumber >= room.settings.maxRounds) {
    endGame(room);
  } else {
    // Start new turn after a short delay
    setTimeout(() => startNewTurn(room), 5000);
  }
}

function endGame(room) {
  console.log(`Ending game in room ${room.roomId}`);
  
  // Clear timer if running
  if (room.roundTimer) {
    clearInterval(room.roundTimer); // Use clearInterval for intervals
    room.roundTimer = null;
  }

  // Prepare final scores and update global leaderboard if necessary
  const finalScores = room.players.map(p => {
    // If you implement per-game stats, update here
    // updateLeaderboard(p.name, p.score, wordsGuessed); // Example if tracking words guessed per game
    return {
      id: p.id, // Ensure ID is included
      name: p.name,
      score: p.score || 0, // Ensure score is included
      isPartyLeader: p.isPartyLeader || false // Include party leader status
    };
  });
  
  // Sort scores for the leaderboard display
  const sortedScores = [...finalScores].sort((a, b) => b.score - a.score);
  
  // Set game status to 'ended'
  room.status = 'ended';
  room.isRoundActive = false;
  room.currentDrawer = null;
  room.currentWord = null;

  // Send final leaderboard and game state to all players
  room.players.forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      // Send leaderboard data
      player.ws.send(JSON.stringify({
        type: "gameLeaderboard",
        players: sortedScores, // Send sorted scores with all necessary info
        message: "Game has ended! Final scores:"
      }));
      
      // Send final game state separately
      player.ws.send(JSON.stringify({
        type: "gameState",
        gameState: {
          status: 'ended', // Explicitly send 'ended' status
          currentRound: room.roundNumber, // Send final round number
          maxRounds: room.settings.maxRounds,
          timeLeft: 0,
          drawer: null, // No drawer in ended state
          word: null, // No word in ended state
          isDrawing: false 
        }
      }));
    }
  });

  // IMPORTANT: Do NOT reset player ready states or scores here.
  // This will be done when the party leader starts a new game.
  
  // Notify players game is over, leader can start new one
  broadcastSystemMessage(room, "Game over! The party leader can start a new game or change settings.");

  console.log(`Game ended for room ${room.roomId}. Final leaderboard sent.`);
}

// Helper function to assign a new party leader
function assignNewPartyLeader(room) {
  // Get active players
  const activePlayers = room.players.filter(p => !p.disconnected);
  
  if (activePlayers.length === 0) return;
  
  // Find the current leader
  const currentLeader = room.players.find(p => p.isPartyLeader);
  
  // Reset all player's leader status
  room.players.forEach(p => {
    p.isPartyLeader = false;
  });
  
  // Assign the first active player as the new leader
  const newLeader = activePlayers[0];
  newLeader.isPartyLeader = true;
  
  console.log(`${newLeader.name} is now the party leader`);
  broadcastSystemMessage(room, `${newLeader.name} is now the party leader`);
}

// Function to broadcast updated player list to all players in a room
function broadcastPlayerList(room) {
  if (!room || !room.players) return;
  
  // Filter out disconnected players for the UI list
  const activePlayers = room.players.filter(p => !p.disconnected);
  
  // Create player list with public information
  const playerList = activePlayers.map(player => ({
    id: player.id,
    name: player.name,
    score: player.score,
    isReady: player.isReady,
    isDrawing: player.isDrawing || player === room.currentDrawer,
    hasGuessedCorrectly: player.correctGuess,
    isPartyLeader: player.isPartyLeader
  }));
  
  // Log the update
  console.log(`Sending player list update for room ${room.roomId}: ${playerList.length} active players`);
  
  // Send to all connected players
  room.players.forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: "playerList",
        players: playerList
      }));
    }
  });
}

wss.on("connection", (ws, req) => {
  console.log("New connection attempt from", req.socket.remoteAddress);
  
  // Increment total connection count
  totalConnectionCount++;
  
  // Variables to track the current room and player for this connection
  let currentRoom = null;
  let currentPlayer = null;

  // Add a ping-pong mechanism
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });
  
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      const type = data.type;
      
      switch (type) {
        case "join": {
          const roomId = data.roomId;
          
          // Get the room or create a new one
          let existingRoom = rooms.get(roomId);
          
          if (!existingRoom) {
            console.log(`Creating new room ${roomId}`);
            
            // Increment total room count when creating a new room
            totalRoomCount++;
            
            // Create new room with initial settings
            const newRoom = {
              roomId,
              players: [],
              settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), // Deep copy
              roundNumber: 0,
              timeLeft: 0,
              isRoundActive: false,
              status: 'waiting',
              connectionAttempts: new Map()
            };
            rooms.set(roomId, newRoom);
            existingRoom = newRoom;
          }
          
          currentRoom = existingRoom;
          
          // Initialize connection attempts tracking if needed
          if (!currentRoom.connectionAttempts) {
            currentRoom.connectionAttempts = new Map();
          }
          
          // Check for connection throttling
          const now = Date.now();
          const lastAttempt = currentRoom.connectionAttempts.get(data.playerName) || 0;
          currentRoom.connectionAttempts.set(data.playerName, now);
          
          // Force a connection cooldown of 1 second to prevent reconnection storms
          // Only apply to reconnections, not first connections
          const COOLDOWN_PERIOD = 1000; // 1 second
          const timeSinceLastAttempt = now - lastAttempt;
          const isReconnectingTooQuickly = lastAttempt > 0 && timeSinceLastAttempt < COOLDOWN_PERIOD;
          
          if (isReconnectingTooQuickly) {
            console.log(`Connection throttled for ${data.playerName}: reconnecting too quickly (${timeSinceLastAttempt}ms)`);
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: "error",
                content: `Please wait before reconnecting (${Math.ceil((COOLDOWN_PERIOD - timeSinceLastAttempt) / 1000)}s cooldown)`
              }));
              
              // Close the connection with a specific code to prevent auto-reconnect
              try {
                ws.close(4000, "Connection throttled");
              } catch (error) {
                console.error("Error closing throttled connection:", error);
              }
            }
            
            return; // Stop processing this connection attempt
          }
          
          // Check if player with this name already exists in the room
          const existingPlayerIndex = currentRoom.players.findIndex(p => p.name === data.playerName);
          
          if (existingPlayerIndex >= 0) {
            console.log(`Player ${data.playerName} is reconnecting to room ${roomId}`);
            
            const existingPlayer = currentRoom.players[existingPlayerIndex];
            
            // If existing player has a valid websocket, close it
            if (existingPlayer.ws && existingPlayer.ws.readyState === WebSocket.OPEN) {
              try {
                existingPlayer.ws.send(JSON.stringify({
                  type: "system",
                  content: "You have connected from another location. This connection will be closed."
                }));
                existingPlayer.ws.close();
              } catch (error) {
                console.error("Error closing existing connection:", error);
              }
            }
            
            // Update the player's connection
            existingPlayer.id = data.playerName;
            existingPlayer.ws = ws;
            existingPlayer.disconnected = false;
            existingPlayer.lastReconnectTime = now;
            
            // Reference this player as the current player for this connection
            currentPlayer = existingPlayer;
            
            // Store room ID and player name on the websocket for disconnection handling
            ws.roomId = roomId;
            ws.playerName = data.playerName;
            
            // Send confirmation to client
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: "joined",
                roomId,
                reconnected: true,
                playerDetails: {
                  id: existingPlayer.id,
                  name: existingPlayer.name,
                  isPartyLeader: existingPlayer.isPartyLeader
                }
              }));
              
              // Send current player list to the reconnected player
              ws.send(JSON.stringify({
                type: "playerList",
                players: currentRoom.players.filter(p => !p.disconnected).map(p => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                  isReady: p.isReady,
                  isPartyLeader: p.isPartyLeader || false
                }))
              }));
              
              // Send current game settings
              ws.send(JSON.stringify({
                type: "gameSettings",
                settings: currentRoom.settings
              }));
              
              // If game is in progress, send game state
              if (currentRoom.isRoundActive) {
                sendGameState(currentRoom, currentPlayer);
              }
            }
            
            // Notify other players about reconnection
            currentRoom.players.forEach(player => {
              if (player !== currentPlayer && player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                  type: "system",
                  content: `${currentPlayer.name} has reconnected`
                }));
              }
            });
          } else {
            // Create a new player
            currentPlayer = {
              id: data.playerName,
              name: data.playerName,
              score: 0,
              ws,
              isReady: false,
              correctGuess: false,
              isPartyLeader: currentRoom.players.length === 0,
              lastReconnectTime: now,
              connectionTimestamp: now
            };
            
            // Store room ID and player name on the websocket for disconnection handling
            ws.roomId = roomId;
            ws.playerName = data.playerName;
            
            // Add player to room
            currentRoom.players.push(currentPlayer);

            // Send confirmation to client
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: "joined",
                roomId,
                playerDetails: {
                  id: currentPlayer.id,
                  name: currentPlayer.name,
                  isPartyLeader: currentPlayer.isPartyLeader
                }
              }));
              
              // Send current player list to the new player
              ws.send(JSON.stringify({
                type: "playerList",
                players: currentRoom.players.filter(p => !p.disconnected).map(p => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                  isReady: p.isReady,
                  isPartyLeader: p.isPartyLeader || false
                }))
              }));
              
              // Send current game settings
              ws.send(JSON.stringify({
                type: "gameSettings",
                settings: currentRoom.settings
              }));
            }
            
            // Notify all players of new player
            currentRoom.players.forEach(player => {
              if (player !== currentPlayer && player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                  type: "system",
                  content: `${currentPlayer.name} joined the game`
                }));
                
                // Update player list for all players
                player.ws.send(JSON.stringify({
                  type: "playerList",
                  players: currentRoom.players.filter(p => !p.disconnected).map(p => ({
                    id: p.id,
                    name: p.name,
                    score: p.score,
                    isReady: p.isReady,
                    isPartyLeader: p.isPartyLeader || false
                  }))
                }));
              }
            });
          }
          
          // Update active players count for logging
          const activePlayerCount = currentRoom.players.filter(p => !p.disconnected).length;
          console.log(`Room ${roomId} now has ${activePlayerCount} active players`);
          
          break;
        }
        
        case "gameSettings": {
          if (!currentRoom || !currentPlayer) return;
          
          // Only party leader can update settings
          if (!currentPlayer.isPartyLeader) {
            console.log(`Player ${currentPlayer.name} tried to update settings but is not party leader`);
            return;
          }
          
          console.log(`Updating game settings for room ${currentRoom.roomId}`, data.settings);
          
          // Validate settings values
          const newSettings = {
            // Use existing values as fallbacks
            timePerRound: Number(data.settings.timePerRound) || currentRoom.settings.timePerRound,
            maxRounds: Number(data.settings.maxRounds) || currentRoom.settings.maxRounds,
            customWords: Array.isArray(data.settings.customWords) ? data.settings.customWords : [],
            useOnlyCustomWords: data.settings.useOnlyCustomWords === true
          };
          
          // Apply min/max limits
          if (newSettings.timePerRound < 30) newSettings.timePerRound = 30;
          if (newSettings.timePerRound > 180) newSettings.timePerRound = 180;
          if (newSettings.maxRounds < 1) newSettings.maxRounds = 1; 
          if (newSettings.maxRounds > 20) newSettings.maxRounds = 20;
          
          // Update room settings
          currentRoom.settings = newSettings;
          
          // Broadcast updated settings to all players
          currentRoom.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(JSON.stringify({
                type: "gameSettings",
                settings: newSettings
              }));
            }
          });
          
          // Also send a system message about updated settings
          broadcastSystemMessage(currentRoom, `Game settings have been updated by ${currentPlayer.name}`);
          
          break;
        }
        
        case "leave": {
          // Handle player leaving
          if (!currentRoom || !currentPlayer) return;
          
          console.log(`Player ${currentPlayer.name} is leaving room ${currentRoom.roomId}`);
          
          // Notify other players
          broadcastSystemMessage(currentRoom, `${currentPlayer.name} has left the game`);
          
          // Remove player from room
          const playerIndex = currentRoom.players.findIndex(p => p === currentPlayer);
          if (playerIndex !== -1) {
            currentRoom.players.splice(playerIndex, 1);
          }
          
          // Check if we need to reassign party leader
          if (currentRoom.players.length > 0 && currentPlayer.isPartyLeader) {
            currentRoom.players[0].isPartyLeader = true;
            broadcastSystemMessage(currentRoom, `${currentRoom.players[0].name} is now the party leader`);
          }
          
          // Update player list for remaining players
          currentRoom.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(JSON.stringify({
                type: "playerList",
                players: currentRoom.players.filter(p => !p.disconnected).map(p => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                  isReady: p.isReady
                }))
              }));
            }
          });
          
          // Send confirmation to leaving player
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              type: "leaveAck"
            }));
          }
          
          // Reset player state
          currentRoom = null;
          currentPlayer = null;
          
          break;
        }
        
        case "ready": {
          if (!currentRoom || !currentPlayer) return;
          
          // Update player's ready status - toggle it if not explicitly provided
          currentPlayer.isReady = data.isReady !== undefined ? data.isReady : !currentPlayer.isReady;
          
          console.log(`Player ${currentPlayer.name} is now ${currentPlayer.isReady ? 'ready' : 'not ready'}`);
          
          // Broadcast system message
          broadcastSystemMessage(currentRoom, `${currentPlayer.name} is ${currentPlayer.isReady ? 'ready' : 'not ready'}`);
          
          // Update player list to reflect ready status change
          broadcastPlayerList(currentRoom);
          
          // Check if all players are ready to start the game
          if (checkAllPlayersReady(currentRoom)) {
            tryStartGame(currentRoom);
          }
          
          break;
        }

        case "pathStart": {
          if (!currentRoom || !currentPlayer) return;
          if (currentPlayer !== currentRoom.currentDrawer) return;
          
          // Forward path start data to all other players
          currentRoom.players.forEach(player => {
            if (player !== currentPlayer && player.ws.readyState === WebSocket.OPEN) {
              try {
                player.ws.send(JSON.stringify(data));
              } catch (error) {
                console.error(`Error sending pathStart data to ${player.name}:`, error);
              }
            }
          });
          break;
        }

        case "pathEnd": {
          if (!currentRoom || !currentPlayer) return;
          if (currentPlayer !== currentRoom.currentDrawer) return;
          
          // Forward path end data to all other players
          currentRoom.players.forEach(player => {
            if (player !== currentPlayer && player.ws.readyState === WebSocket.OPEN) {
              try {
                player.ws.send(JSON.stringify(data));
              } catch (error) {
                console.error(`Error sending pathEnd data to ${player.name}:`, error);
              }
            }
          });
          break;
        }

        case "draw": {
          if (!currentRoom || !currentPlayer) return;
          if (currentPlayer !== currentRoom.currentDrawer) {
            console.log(`Player ${currentPlayer.name} tried to draw but is not the drawer`);
            return;
          }
          
          // Add timestamp and drawer ID to the drawing data
          const drawingData = {
            ...data,
            timestamp: Date.now(),
            drawerId: currentPlayer.name
          };
          
          // Forward drawing data to all other players
          currentRoom.players.forEach(player => {
            if (player !== currentPlayer && player.ws && player.ws.readyState === WebSocket.OPEN) {
              try {
                // Send normalized coordinates
                player.ws.send(JSON.stringify(drawingData));
              } catch (error) {
                console.error(`Error sending draw data to ${player.name}:`, error);
              }
            }
          });
          break;
        }

        case "clear": {
          if (!currentRoom || !currentPlayer) return;
          if (currentPlayer !== currentRoom.currentDrawer) return;
          
          const clearData = { ...data, timestamp: Date.now() };
          
          currentRoom.players.forEach(player => {
            if (player !== currentPlayer && player.ws && player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(JSON.stringify(clearData));
            }
          });
          break;
        }

        case "guess": {
          if (!currentRoom || !currentPlayer) return;
          
          // If game is not in progress, treat this as a regular chat message
          if (!currentRoom.currentWord || currentRoom.status !== 'playing') {
            // Send as regular chat message to everyone
            currentRoom.players.forEach(player => {
              if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                  type: "chat",
                  id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  playerName: currentPlayer.name,
                  content: data.guess || data.content,
                  timestamp: Date.now()
                }));
              }
            });
            return;
          }
          
          // Regular guess logic for active games
          if (currentPlayer === currentRoom.currentDrawer || currentPlayer.correctGuess) {
            // Send a private message back to the player if they can't guess
            if (currentPlayer.ws.readyState === WebSocket.OPEN) {
              currentPlayer.ws.send(JSON.stringify({
                type: "chat",
                id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                playerName: currentPlayer.name,
                content: data.guess || data.content,
                timestamp: Date.now()
              }));
            }
            return;
          }
          
          const guess = (data.guess || data.content || "").toLowerCase().trim();
          const correctWord = currentRoom.currentWord.toLowerCase();
          const isCorrect = guess === correctWord;

          // Send private message to the guesser
          if (currentPlayer.ws.readyState === WebSocket.OPEN) {
            currentPlayer.ws.send(JSON.stringify({
              type: isCorrect ? "correct" : "chat",
              id: `${isCorrect ? 'correct' : 'chat'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              playerName: currentPlayer.name,
              content: isCorrect ? `You guessed correctly: ${correctWord}!` : data.guess || data.content,
              timestamp: Date.now()
            }));
          }

          // Broadcast incorrect guesses differently
          if (!isCorrect) {
            currentRoom.players.forEach(player => {
              if (player !== currentPlayer && player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                  type: "incorrectGuess", // New type
                  guesserName: currentPlayer.name
                }));
              }
            });
          }

          if (isCorrect) {
            // Calculate time taken to guess (in seconds)
            const guessTime = currentRoom.roundStartTime 
              ? Math.floor((Date.now() - currentRoom.roundStartTime) / 1000)
              : currentRoom.settings.timePerRound - currentRoom.timeLeft;
              
            // Record the time for this player
            currentPlayer.guessTime = guessTime;
            
            // Mark player as having guessed correctly
            currentPlayer.correctGuess = true;
            
            // Award points - more points for faster guesses
            const timePercent = guessTime / currentRoom.settings.timePerRound;
            const speedBonus = Math.floor((1 - timePercent) * 20); // Up to 20 bonus points for speed
            const pointsEarned = 10 + speedBonus;
            currentPlayer.score += pointsEarned;
            
            // Also award points to the drawer
            if (currentRoom.currentDrawer) {
              currentRoom.currentDrawer.score += 5;
            }

            // Notify all players of the correct guess (but not the word itself)
            currentRoom.players.forEach(player => {
              if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                  type: "playerGuessedCorrectly",
                  guesser: currentPlayer ? currentPlayer.name : "",
                  pointsEarned,
                  totalScore: currentPlayer ? currentPlayer.score : 0
                }));
              }
            });

            // Check if all players have guessed correctly
            if (checkAllPlayersGuessed(currentRoom)) {
              // End round early if everyone guessed
              broadcastSystemMessage(currentRoom, "Everyone guessed the word! Starting next round...");
              endRound(currentRoom);
            }
          }
          break;
        }
        
        case "system": {
          // Chat messages from players to everyone
          if (!currentRoom || !currentPlayer) return;
          
          currentRoom.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(JSON.stringify({
                type: "system",
                content: `${currentPlayer ? currentPlayer.name : ""}: ${data.content}`
              }));
            }
          });
          break;
        }
        
        case "chat": {
          if (!currentRoom || !currentPlayer) return;

          if (currentRoom.status !== 'waiting') {
             console.log(`Player ${currentPlayer.name} tried to chat during active game.`);
             return; // Ignore chat message if game is not waiting
          }

          const messageId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          currentRoom.players.forEach(player => {
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(JSON.stringify({
                type: "chat",
                id: messageId,
                playerName: currentPlayer.name,
                content: data.content || data.message,
                timestamp: Date.now()
              }));
            }
          });
          break;
        }
        
        case "startNewGameRequest": { // Renamed from startNewGame to avoid conflicts
          if (!currentRoom || !currentPlayer) return;
          
          console.log(`${currentPlayer.name} requested to start a new game in room ${currentRoom.roomId}`);
          
          // Only the party leader can start a new game
          if (!currentPlayer.isPartyLeader) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: "system",
                content: "Only the party leader can start a new game."
              }));
            }
            return;
          }
          
          // Check if there are enough players
          const activePlayers = currentRoom.players.filter(p => !p.disconnected);
          if (activePlayers.length < 2) {
             if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: "system",
                content: "Cannot start game, need at least 2 players."
              }));
            }
            return;
          }

          console.log(`Starting new game initiated by party leader ${currentPlayer.name}`);

          // Reset scores and ready states for all players for the new game
          currentRoom.players.forEach(player => {
            player.score = 0;
            player.isReady = true; // Auto-ready everyone for the new game
            player.correctGuess = false;
            player.guessTime = undefined;
          });
          
          // Reset round number
          currentRoom.roundNumber = 0;
          
          // Set game status to 'playing'
          currentRoom.status = 'playing';
          
          // Broadcast player list update (scores reset, all ready)
          broadcastPlayerList(currentRoom);
          
          // Broadcast game state update to all players (game starting)
          currentRoom.players.forEach(player => {
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(JSON.stringify({
                type: "gameState",
                gameState: {
                  status: 'playing',
                  currentRound: 1, // Starting round 1
                  maxRounds: currentRoom.settings.maxRounds,
                  timeLeft: currentRoom.settings.timePerRound // Initial time
                }
              }));
            }
          });

          broadcastSystemMessage(currentRoom, "Starting a new game!");

          // Start the first turn after a short delay
          setTimeout(() => startNewTurn(currentRoom), 2000); // Short delay before first turn
          break;
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      // Send error feedback to client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "system",
          content: "Error processing your request. Please try again."
        }));
      }
    }
  });

  // Handle connection closing
  ws.on('close', () => {
    // Mark player as disconnected
    if (currentPlayer && currentRoom) {
      console.log(`Player ${currentPlayer.name} disconnected from room ${currentRoom.roomId}`);
      
      // Add room and player info to the socket so handlePlayerLeave works
      ws.roomId = currentRoom.roomId;
      ws.playerName = currentPlayer.name;
      
      // Call handlePlayerLeave to properly clean up the player
      handlePlayerLeave(ws);
      
      // Clear current room and player references
      currentRoom = null;
      currentPlayer = null;
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    
    // Handle player disconnection on error if they're in a room
    if (currentPlayer && currentRoom) {
      // Add room and player info to the socket so handlePlayerLeave works
      ws.roomId = currentRoom.roomId;
      ws.playerName = currentPlayer.name;
      
      // Use our common handlePlayerLeave function for consistent behavior
      handlePlayerLeave(ws);
    }
  });
  
  ws.on("pong", () => {
    // Client is still connected
  });
});

// Clean up disconnected players periodically
setInterval(() => {
  rooms.forEach(room => {
    // Remove players with closed connections
    const activePlayers = room.players.filter(player => 
      player.ws && player.ws.readyState === WebSocket.OPEN
    );
    
    if (activePlayers.length < room.players.length) {
      console.log(`Removing ${room.players.length - activePlayers.length} disconnected players from room ${room.roomId}`);
      room.players = activePlayers;
    }
    
    // Remove empty rooms
    if (room.players.length === 0) {
      console.log(`Removing empty room ${room.roomId}`);
      rooms.delete(room.roomId);
    }
  });
}, 60000);

// Handle player leaving
function handlePlayerLeave(ws) {
  try {
    // Get room ID and player name
    const roomId = ws.roomId;
    const playerName = ws.playerName;
    
    if (!roomId || !playerName) {
      console.log("Cannot handle player leave: missing roomId or playerName");
      return;
    }
    
    console.log(`Player ${playerName} is leaving room ${roomId}`);
    
    // Get room and player
    const room = rooms.get(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found for player ${playerName} disconnection`);
      return;
    }
    
    // Find the player
    const playerIndex = room.players.findIndex((p) => p.name === playerName);
    if (playerIndex === -1) {
      console.log(`Player ${playerName} not found in room ${roomId} for disconnection`);
      return;
    }
    
    const player = room.players[playerIndex];
    
    // Don't process disconnection if player is already marked as disconnected
    if (player.disconnected) {
      console.log(`Player ${playerName} was already marked as disconnected, skipping duplicate disconnection`);
      return;
    }
    
    // Mark player as disconnected
    player.disconnected = true;
    player.ws = null;
    
    // Track disconnection for rate limiting
    if (!player.disconnections) {
      player.disconnections = 0;
    }
    player.disconnections++;
    player.lastDisconnectTime = Date.now();
    
    // Broadcast system message about disconnection
    broadcastSystemMessage(room, `${playerName} has disconnected`);
    
    // Handle drawer disconnection
    if (player === room.currentDrawer && room.isRoundActive) {
      console.log(`Drawer ${playerName} disconnected, ending current round`);
      endRound(room);
    }

    // Check if the disconnected player was the party leader
    if (player.isPartyLeader) {
      // Find new party leader from remaining active players
      assignNewPartyLeader(room);
    }
    
    // Calculate number of active players (not disconnected)
    const activePlayerCount = room.players.filter(p => !p.disconnected).length;
    console.log(`Room ${roomId} has ${activePlayerCount} active players`);

    // After 5 minutes with no activity, fully remove the player from the room
    setTimeout(() => {
      const currentRoom = rooms.get(roomId);
      if (currentRoom) {
        const playerStillExists = currentRoom.players.find(p => p.name === playerName);
        if (playerStillExists && playerStillExists.disconnected) {
          // Actually remove the player from the room
          currentRoom.players = currentRoom.players.filter(p => p.name !== playerName);
          console.log(`Removed inactive player ${playerName} from room ${roomId} after timeout`);
          broadcastPlayerList(currentRoom);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes timeout

    if (activePlayerCount === 0) {
      // All players disconnected
      console.log(`Room ${roomId} has no active players, but will be preserved temporarily`);
      
      // If game is in progress, end it
      if (room.isRoundActive) {
        console.log(`Game in room ${roomId} ended due to all players disconnecting`);
        endRound(room);
      }
    }
    
    // Update player list for remaining players
    broadcastPlayerList(room);
  } catch (error) {
    console.error("Error handling player leave:", error);
  }
}

// Send current game state to a specific player (useful for reconnections)
function sendGameState(room, player) {
  if (!room || !player || !player.ws || player.ws.readyState !== WebSocket.OPEN) {
    return;
  }
  
  try {
    console.log(`Sending current game state to ${player.name}`);
    
    // Create game state object
    const gameState = {
      status: room.status || 'waiting',
      currentRound: room.roundNumber || 0,
      maxRounds: room.settings.maxRounds,
      timeLeft: room.timeLeft || 0,
      isDrawing: player === room.currentDrawer,
    };
    
    // If this player is the drawer, include the word
    if (player === room.currentDrawer && room.currentWord) {
      gameState.word = room.currentWord;
      
      // Also send a separate drawer word message
      player.ws.send(JSON.stringify({
        type: "drawerWord",
        word: room.currentWord,
        content: `Your word to draw is: ${room.currentWord}`
      }));
    }
    
    // If there's a current drawer, include drawer info
    if (room.currentDrawer) {
      gameState.drawer = {
        id: room.currentDrawer.name,
        name: room.currentDrawer.name
      };
    }
    
    // Send game state
    player.ws.send(JSON.stringify({
      type: "gameState",
      gameState
    }));
    
    console.log(`Game state sent to ${player.name}:`, gameState);
    
  } catch (error) {
    console.error(`Error sending game state to ${player.name}:`, error);
  }
}

// Set up interval for ping/pong heartbeat to detect dead connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      console.log('Terminating inactive connection');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (error) {
      console.error('Error sending ping:', error);
      ws.terminate();
    }
  });
}, 30000); // Check every 30 seconds

// Clean up the interval when the server is closed
wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
}); 