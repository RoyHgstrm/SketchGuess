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
  timePerRound: 60,
  customWords: null,
  useOnlyCustomWords: false,
  minRounds: 1,
  maxRounds: 100
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
    if (player.ws.readyState === WebSocket.OPEN) {
      // Send time update only - don't resend full game state
      player.ws.send(JSON.stringify({
        type: "timeUpdate",
        timeLeft: room.timeLeft
      }));
      
      // Only update critical game state info without drawer changes
      if (room.timeLeft % 5 === 0 || room.timeLeft <= 10) { 
        // Send full game state only every 5 seconds or when time is low
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
  // Determine which word list to use
  let wordList = DEFAULT_WORDS;
  
  // If custom words exist and useOnlyCustomWords is true, use only custom words
  if (room.settings.customWords && room.settings.customWords.length > 0) {
    if (room.settings.useOnlyCustomWords) {
      wordList = room.settings.customWords;
    } else {
      // Otherwise, combine default and custom words
      wordList = [...DEFAULT_WORDS, ...room.settings.customWords];
    }
  }
  
  return wordList[Math.floor(Math.random() * wordList.length)];
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
    }
  }
  
  room.currentDrawer = room.players[nextDrawerIndex];
  console.log(`New drawer selected: ${room.currentDrawer.name} (Turn ${nextDrawerIndex + 1} of Round ${room.roundNumber + 1})`);

  // Select random word
  const randomWord = getWordForRound(room);
  room.currentWord = randomWord;

  // Notify drawer of their word
  if (room.currentDrawer && room.currentDrawer.ws.readyState === WebSocket.OPEN) {
    room.currentDrawer.ws.send(JSON.stringify({
      type: "drawerWord",
      word: randomWord
    }));
  }

  // Notify all players of new drawer and clear their canvases
  room.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
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
      if (player.ws.readyState === WebSocket.OPEN) {
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
    if (player.ws.readyState === WebSocket.OPEN) {
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
    if (player.ws.readyState === WebSocket.OPEN) {
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
  // Clear timer
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }

  // Prepare final scores and update leaderboard
  const scores = room.players.map(p => {
    // Calculate words guessed by this player
    const wordsGuessed = p.correctGuess ? 1 : 0;
    
    // Update global leaderboard
    updateLeaderboard(p.name, p.score, wordsGuessed);
    
    return {
      name: p.name,
      score: p.score
    };
  });
  
  // Sort scores to find the winner
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const winner = sortedScores.length > 0 ? sortedScores[0] : null;
  
  // Get top global scores for comparison
  const globalTopScores = getTopPlayers(5);

  // Send final scores to all players
  room.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: "gameEnd",
        scores: sortedScores,
        winner: winner ? winner.name : null,
        globalTopScores
      }));
    }
  });

  // Reset room state
  room.roundNumber = 0;
  room.currentDrawer = null;
  room.currentWord = null;
  room.isRoundActive = false;
  room.status = 'waiting';
  
  // Reset player ready states
  room.players.forEach(player => {
    player.isReady = false;
    player.correctGuess = false;
    player.guessTime = undefined;
  });
  
  // Notify players they need to ready up for a new game
  broadcastSystemMessage(room, "Game over! Press 'Ready' to start a new game.");

  // Broadcast game state update to all players
  room.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: "gameState",
        gameState: {
          status: 'waiting',
          currentRound: 0,
          maxRounds: room.settings.maxRounds,
          timeLeft: 0
        }
      }));
    }
  });
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
  
  // Create player list with public information
  const playerList = room.players.map(player => ({
    name: player.name,
    score: player.score,
    isReady: player.isReady,
    isDrawing: player.isDrawing || player === room.currentDrawer,
    hasGuessedCorrectly: player.correctGuess,
    isPartyLeader: player.isPartyLeader,
    disconnected: player.disconnected
  }));
  
  // Send to all connected players
  room.players.forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: "playerList",
        players: playerList
      }));
    }
  });
  
  console.log(`Sent player list update to room ${room.roomId} with ${playerList.length} players`);
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
              settings: {
                timePerRound: DEFAULT_SETTINGS.timePerRound,
                maxRounds: DEFAULT_SETTINGS.maxRounds,
                customWords: DEFAULT_SETTINGS.customWords ? [...DEFAULT_SETTINGS.customWords] : [],
                useOnlyCustomWords: DEFAULT_SETTINGS.useOnlyCustomWords
              },
              roundNumber: 0,
              timeLeft: 0,
              isRoundActive: false,
              status: 'waiting'
            };
            rooms.set(roomId, newRoom);
            existingRoom = newRoom;
          }
          
          currentRoom = existingRoom;
          currentPlayer = { 
            name: data.playerName, 
            score: 0, 
            ws, 
            isReady: false, 
            correctGuess: false 
          };
          
          currentRoom.players.push(currentPlayer);

          // Send confirmation to client
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              type: "joined", 
              roomId 
            }));
            
            // Send current player list to the new player
            ws.send(JSON.stringify({
              type: "playerList",
              players: currentRoom.players.map(p => ({
                name: p.name,
                score: p.score,
                isReady: p.isReady
              }))
            }));
            
            // Send current game settings
            ws.send(JSON.stringify({
              type: "gameSettings",
              settings: currentRoom.settings
            }));
          }
          
          // Notify all players of new player
          if (currentRoom) {
            currentRoom.players.forEach(player => {
              if (player !== currentPlayer && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                  type: "system",
                  content: `${currentPlayer ? currentPlayer.name : ""} joined the game`
                }));
                
                // Update player list for all players
                player.ws.send(JSON.stringify({
                  type: "playerList",
                  players: currentRoom.players.map(p => ({
                    name: p.name,
                    score: p.score,
                    isReady: p.isReady
                  }))
                }));
              }
            });
          }
          
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
          
          // Update room settings, ensuring we handle undefined or null values
          currentRoom.settings = {
            ...currentRoom.settings,
            timePerRound: data.settings.timePerRound || currentRoom.settings.timePerRound,
            maxRounds: data.settings.maxRounds || currentRoom.settings.maxRounds,
            customWords: Array.isArray(data.settings.customWords) ? data.settings.customWords : (currentRoom.settings.customWords || []),
            useOnlyCustomWords: data.settings.useOnlyCustomWords !== undefined ? data.settings.useOnlyCustomWords : currentRoom.settings.useOnlyCustomWords
          };
          
          // Broadcast updated settings to all players
          currentRoom.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(JSON.stringify({
                type: "gameSettings",
                settings: currentRoom.settings
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
                players: currentRoom.players.map(p => ({
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
            if (player !== currentPlayer && player.ws.readyState === WebSocket.OPEN) {
              try {
                console.log(`Sending draw data to ${player.name} from ${currentPlayer.name}`);
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
          
          currentRoom.players.forEach(player => {
            if (player !== currentPlayer && player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(JSON.stringify(data));
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

          // Broadcast incorrect guesses as chat messages to other players
          if (!isCorrect) {
            currentRoom.players.forEach(player => {
              if (player !== currentPlayer && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                  type: "chat",
                  id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  playerName: currentPlayer.name,
                  content: data.guess || data.content,
                  timestamp: Date.now()
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
          // Regular chat messages from players
          if (!currentRoom || !currentPlayer) return;
          
          const messageId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          currentRoom.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
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
        
        case "startNewGame": {
          if (!currentRoom || !currentPlayer) return;
          
          // Only the party leader can start a new game
          if (!currentPlayer.isPartyLeader) {
            if (currentPlayer.ws.readyState === WebSocket.OPEN) {
              currentPlayer.ws.send(JSON.stringify({
                type: "system",
                content: "Only the party leader can start a new game"
              }));
            }
            return;
          }
          
          // Reset player ready states
          currentRoom.players.forEach(player => {
            player.isReady = true; // Auto-ready all players
            player.correctGuess = false;
            player.guessTime = undefined;
          });
          
          // Broadcast player list update with ready status
          broadcastPlayerList(currentRoom);
          
          // Try to start the game with all players ready
          tryStartGame(currentRoom);
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

  ws.on("close", (code, reason) => {
    console.log(`Connection closed with code ${code}${reason ? ': ' + reason : ''}`);
    clearInterval(pingInterval);
    
    if (!currentRoom || !currentPlayer) return;
    
    // Add room and player info to the socket so handlePlayerLeave works
    ws.roomId = currentRoom.roomId;
    ws.playerName = currentPlayer.name;
    
    // Use our common handlePlayerLeave function for consistent behavior
    handlePlayerLeave(ws);
    
    // Clear references
    currentRoom = null;
    currentPlayer = null;
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    clearInterval(pingInterval);
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
      player.ws.readyState === WebSocket.OPEN
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
    if (player.isDrawing && room.gameState.status === 'playing') {
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
      if (room.gameState.status === 'playing') {
        console.log(`Game in room ${roomId} ended due to all players disconnecting`);
        endGame(room);
      }
    }
    
    // Update player list for remaining players
    broadcastPlayerList(room);
  } catch (error) {
    console.error("Error handling player leave:", error);
  }
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
}); 