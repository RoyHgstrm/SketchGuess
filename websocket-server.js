import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket } from 'ws';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for storing the leaderboard
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// Default word list
const DEFAULT_WORDS = [
  // Animals  
  "cat", "dog", "fish", "bird", "cow", "horse", "sheep", "pig", "duck", "rabbit",  
  "turtle", "frog", "bee", "ant", "snail", "butterfly", "fox", "mouse", "bear", "lion",  

  // Food  
  "apple", "banana", "grape", "lemon", "orange", "cherry", "carrot", "corn", "bread", "cheese",  
  "pizza", "burger", "fries", "hotdog", "cake", "cookie", "ice cream", "egg", "candy", "popcorn",  

  // Objects  
  "book", "pen", "pencil", "box", "bag", "coin", "key", "lamp", "watch", "mirror",  
  "cup", "bottle", "bowl", "plate", "fork", "spoon", "knife", "clock", "phone", "camera",  

  // Nature  
  "tree", "flower", "leaf", "rock", "cloud", "rain", "snow", "fire", "sun", "moon",  
  "star", "mountain", "beach", "ocean", "river", "island", "volcano", "cave", "desert", "forest",  

  // People & Body Parts  
  "boy", "girl", "baby", "man", "woman", "eye", "nose", "mouth", "ear", "hand",  
  "foot", "hair", "face", "finger", "leg", "tooth", "tongue", "arm", "knee", "elbow",  

  // Clothing & Accessories  
  "hat", "shirt", "pants", "dress", "shoes", "sock", "glove", "scarf", "ring", "crown",  

  // Transportation  
  "car", "bus", "train", "bicycle", "boat", "plane", "helicopter", "skateboard", "motorcycle", "truck",  

  // Miscellaneous  
  "house", "door", "window", "table", "chair", "sofa", "bed", "ball", "flag", "candle",  
  "ladder", "fence", "road", "bridge", "arrow", "starfish", "balloon", "kite", "ghost", "robot"
];


// Default game settings
const DEFAULT_SETTINGS = {
  maxRounds: 5,
  timePerRound: 60,
  customWords: [],
  useOnlyCustomWords: false
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

// Get top players from leaderboard
function getTopPlayers(count = 10) {
  const leaderboard = loadLeaderboard();
  return leaderboard.sort((a, b) => b.score - a.score).slice(0, count);
}

// Add better error handling for the HTTP server
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
    // Endpoint to get server statistics
    const stats = {
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      totalConnections: totalConnections,
      activeConnections: wss.clients.size,
      totalRooms: totalRooms,
      activeRooms: rooms.size,
      activeRoomsList: getActiveRoomsList(),
      startTime: new Date(serverStartTime).toISOString(),
      defaultWords: DEFAULT_WORDS
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
  } else if (req.url === "/health" && req.method === "GET") {
    // Health check endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Initialize WebSocket server with proper path handling
const wss = new WebSocketServer({ 
  server,
  path: '/',
  // Allow connections from any origin
  verifyClient: (info) => {
    console.log(`New connection attempt from: ${info.origin || 'unknown origin'}`);
    return true; // Accept all connections
  }
});
const rooms = new Map();

// Track total connections and rooms created
let connectionCounter = 0;
let roomCounter = 0;

// Counters for total stats
let totalConnectionsCounter = 0;
let totalRoomsCounter = 0;

// Add additional variables for stats
let totalConnections = 0;
let totalRooms = 0;
const serverStartTime = Date.now();

// Add these variables at the top of the file, near other global variables
let totalPongs = 0;
let totalPings = 0;

// Helper function to get active rooms list for admin panel
function getActiveRoomsList() {
  const roomsList = [];
  rooms.forEach((room) => {
    const roomData = {
      roomId: room.roomId,
      playerCount: room.players.length,
      isActive: room.isRoundActive,
      currentRound: room.roundNumber,
      maxRounds: room.settings.maxRounds,
      timeLeft: room.timeLeft,
      currentWord: room.currentWord,
      settings: room.settings,
      players: room.players.map(player => ({
        name: player.name,
        score: player.score,
        isReady: player.isReady,
        isDrawing: room.currentDrawer === player
      }))
    };
    roomsList.push(roomData);
  });
  return roomsList;
}

// Timer functions
function startTimer(room) {
  console.log(`Starting timer for room ${room.roomId}`);
  
  // Clear previous timer if exists
  if (room.roundTimer) {
    clearInterval(room.roundTimer);
    room.roundTimer = null;
  }
  
  // Record when the round started
  room.roundStartTime = Date.now();
  
  // Set initial time
  room.gameState.timeLeft = room.settings.timePerRound;
  
  // Broadcast initial time to all players
  broadcastToRoom(room.roomId, {
    type: "timeUpdate",
    timeLeft: room.gameState.timeLeft
  });
  
  // Set interval to update time every second
  const timerInterval = setInterval(() => {
    room.gameState.timeLeft--;
    
    // Broadcast time update every second
    broadcastToRoom(room.roomId, {
      type: "timeUpdate",
      timeLeft: room.gameState.timeLeft
    });
    
    // This is important: We need to broadcast the game state every second too
    // to ensure the round counter and timer are always updated in the UI
    broadcastGameState(room);
    
    // Check if time is up
    if (room.gameState.timeLeft <= 0) {
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
      player.ws.send(JSON.stringify({
        type: "timeUpdate",
        timeLeft: room.timeLeft
      }));
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

// Improved function to safely send data to a client
function safeSend(socket, message) {
  if (!socket) {
    console.log("Cannot send: socket is null");
    return false;
  }
  
  try {
    if (socket.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      socket.send(messageStr);
      return true;
    } else {
      console.log(`Cannot send: socket not open (state: ${socket.readyState})`);
      return false;
    }
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
}

// Then define broadcastSystemMessage which uses safeSend
function broadcastSystemMessage(room, message) {
  if (!room || !room.roomId || !room.players) {
    console.error("Cannot broadcast to invalid room:", room);
    return;
  }
  
  console.log(`[Room ${room.roomId}] ${message}`);
  
  room.players.forEach(player => {
    if (player && player.ws && player.ws.readyState === WebSocket.OPEN) {
      safeSend(player.ws, {
        type: "system",
        content: message,
        id: Date.now().toString(),
        playerName: "System",
        timestamp: Date.now()
      });
    }
  });
}

// Call broadcastGameState at appropriate times
// After starting a new round
function startNewRound(room) {
  if (!room) return;
  
  // Get the room identifier - use roomId or id for compatibility
  const roomIdentifier = room.roomId || room.id;
  if (!roomIdentifier) {
    console.log("Cannot start new round: missing room identifier");
    return;
  }
  
  // First, clear the canvas for all players
  broadcastToRoom(roomIdentifier, { type: 'clear' });
  
  // Reset player states for the new round
  room.players.forEach(player => {
    player.hasGuessedCorrectly = false;
    player.isDrawing = false;
  });
  
  // Select the next drawer
  let nextDrawerIndex = 0;
  if (room.gameState.drawer) {
    // Find the index of the current drawer
    const currentDrawerIndex = room.players.findIndex(p => p.id === room.gameState.drawer.id);
    if (currentDrawerIndex !== -1) {
      // Select the next player in sequence
      nextDrawerIndex = (currentDrawerIndex + 1) % room.players.length;
    }
  }
  
  // Make sure we haven't gone through all players already
  const allDrawn = room.players.every(p => p.hasDrawn);
  if (allDrawn) {
    // Reset the drawing flag for all players for the next cycle
    room.players.forEach(p => p.hasDrawn = false);
  }
  
  const nextDrawer = room.players[nextDrawerIndex];
  nextDrawer.isDrawing = true;
  nextDrawer.hasDrawn = true;
  room.gameState.drawer = nextDrawer;
  
  // Select a word for the round
  const word = getWordForRound(room);
  room.gameState.word = word;
  
  // Update game state for the round
  room.gameState.currentRound++;
  room.gameState.timeLeft = room.settings.timePerRound;
  
  // Broadcast updated game state to all players
  broadcastGameState(room);
  
  // Tell the drawer what word to draw
  if (nextDrawer.ws && nextDrawer.ws.readyState === WebSocket.OPEN) {
    safeSend(nextDrawer.ws, {
      type: 'drawerWord',
      word: word,
      content: `Your word to draw is: ${word}`
    });
  }
  
  // Start the timer for the round
  startTimer(room);
  
  // Log the new round
  console.log(`Room ${room.roomId}: Round ${room.gameState.currentRound} started, ${nextDrawer.name} is drawing "${word}"`);
}

function checkAllPlayersReady(room) {
  const activePlayers = room.players.filter(p => !p.disconnected);
  if (activePlayers.length < 2) return false; // Need at least 2 players
  return activePlayers.every(p => p.isReady);
}

function checkAllPlayersGuessed(room) {
  // Check if all non-drawer players have guessed correctly
  const nonDrawerPlayers = room.players.filter(p => !p.isDrawing && !p.disconnected);
  return nonDrawerPlayers.length > 0 && nonDrawerPlayers.every(p => p.hasGuessedCorrectly);
}

function tryStartGame(room) {
  console.log("Trying to start game...");
  if (!room) {
    console.log("Invalid room, can't start game");
    return;
  }
  
  // Use roomId if available, otherwise fall back to id
  const roomIdentifier = room.roomId || room.id;
  if (!roomIdentifier) {
    console.log("Missing room identifier, can't start game");
    return;
  }
  
  if (room.gameState.status !== 'waiting') {
    console.log("Game already in progress, not starting");
    return;
  }
  
  if (!checkAllPlayersReady(room)) {
    console.log("Not all players are ready, can't start game");
    return;
  }
  
  const activePlayerCount = room.players.filter(p => !p.disconnected).length;
  if (activePlayerCount < 2) {
    console.log("Not enough players to start game (minimum 2 required)");
    broadcastSystemMessage(room, "Need at least 2 players to start the game.");
    return;
  }
  
  console.log(`Starting game in room ${roomIdentifier} with ${activePlayerCount} players`);
  
  // Reset player scores
  room.players.forEach(player => {
    player.score = 0;
    player.isDrawing = false;
    player.hasGuessedCorrectly = false;
  });
  
  // Start with round 1
  room.gameState.status = 'playing';
  room.gameState.currentRound = 0; // Start at 0 as startNewRound will increment it to 1
  room.gameState.maxRounds = room.settings.maxRounds;
  
  // Broadcast game starting message
  broadcastSystemMessage(room, "Game is starting!");
  
  // Start the first round
  startNewRound(room);
}

// Update the broadcasting helpers to provide more game info
function broadcastGameState(room) {
  // Only broadcast the gameState if it's a valid room
  if (!room) return;
  
  // Get the room identifier - use roomId or id for compatibility
  const roomIdentifier = room.roomId || room.id;
  if (!roomIdentifier) {
    console.log("Cannot broadcast game state: missing room identifier");
    return;
  }
  
  // Make sure all isDrawing flags are consistent with the drawer state
  if (room.gameState.drawer) {
    room.players.forEach(p => {
      p.isDrawing = (p.name === room.gameState.drawer.name);
    });
  }
  
  broadcastToRoom(roomIdentifier, {
    type: 'gameState',
    state: {
      status: room.gameState.status,
      currentRound: room.gameState.currentRound,
      maxRounds: room.gameState.maxRounds,
      timeLeft: room.gameState.timeLeft,
      word: undefined, // Don't send the word to everyone
      drawer: room.gameState.drawer 
        ? {
            id: room.gameState.drawer.name,
            name: room.gameState.drawer.name,
            score: room.gameState.drawer.score || 0,
            isReady: room.gameState.drawer.isReady || false,
            isDrawing: true,
            hasGuessedCorrectly: false,
            isPartyLeader: room.gameState.drawer.isPartyLeader || false
          }
        : undefined
    }
  });
  
  // Send the word only to the drawer
  if (room.gameState.drawer && room.gameState.word) {
    if (room.gameState.drawer.ws && room.gameState.drawer.ws.readyState === WebSocket.OPEN) {
      safeSend(room.gameState.drawer.ws, {
        type: "gameState",
        state: {
          status: room.gameState.status,
          currentRound: room.gameState.currentRound,
          maxRounds: room.gameState.maxRounds,
          timeLeft: room.gameState.timeLeft,
          word: room.gameState.word,
          drawer: {
            id: room.gameState.drawer.name,
            name: room.gameState.drawer.name,
            score: room.gameState.drawer.score || 0,
            isReady: room.gameState.drawer.isReady || false,
            isDrawing: true,
            hasGuessedCorrectly: false,
            isPartyLeader: room.gameState.drawer.isPartyLeader || false
          }
        }
      });
    }
  }

  // Also broadcast the updated player list since drawing status may have changed
  broadcastToRoom(roomIdentifier, {
    type: 'playerList',
    players: room.players
      .filter(p => !p.disconnected)
      .map(p => ({
        id: p.name,
        name: p.name,
        score: p.score || 0,
        isReady: p.isReady || false,
        isDrawing: p.isDrawing || false,
        hasGuessedCorrectly: p.hasGuessedCorrectly || false,
        isPartyLeader: p.isPartyLeader || false
      }))
  });
}

function endRound(room) {
  if (!room) return;
  
  // Get the room identifier - use roomId or id for compatibility
  const roomIdentifier = room.roomId || room.id;
  if (!roomIdentifier) {
    console.log("Cannot end round: missing room identifier");
    return;
  }
  
  // Clear any active timer
  if (room.roundTimer) {
    clearInterval(room.roundTimer);
    room.roundTimer = null;
  }

  // Clear the canvas at the end of the round
  broadcastToRoom(roomIdentifier, { type: 'clear' });
  
  // Create a message about the end of the round
  let roundEndMessage;
  
  if (room.players.some(p => p.hasGuessedCorrectly)) {
    roundEndMessage = `Round over! The word was "${room.gameState.word}". ${room.gameState.drawer.name} earned ${room.players.filter(p => p.hasGuessedCorrectly).length * 5} points.`;
  } else {
    roundEndMessage = `Round over! Nobody guessed the word "${room.gameState.word}". No points awarded.`;
  }
  
  // Broadcast round end message
  broadcastSystemMessage(room, roundEndMessage);
  
  // Reset player states
  room.players.forEach(player => {
    player.hasGuessedCorrectly = false;
    player.isDrawing = false;
  });
  
  // Check if the game should end
  if (room.gameState.currentRound >= room.settings.maxRounds) {
    endGame(room);
  } else {
    // Add a small delay before starting the next round
    setTimeout(() => {
      startNewRound(room);
    }, 3000);
  }
}

function endGame(room) {
  if (!room) return;
  
  // Get the room identifier - use roomId or id for compatibility
  const roomIdentifier = room.roomId || room.id;
  if (!roomIdentifier) {
    console.log("Cannot end game: missing room identifier");
    return;
  }
  
  // Clear any active timer
  if (room.roundTimer) {
    clearInterval(room.roundTimer);
    room.roundTimer = null;
  }

  // Clear the canvas
  broadcastToRoom(roomIdentifier, { type: 'clear' });
  
  // Sort players by score
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const topPlayer = sortedPlayers[0];
  
  // Create a winner message
  const winnerMessage = topPlayer ? `Game over! ${topPlayer.name} wins with ${topPlayer.score} points!` : 'Game over!';
  
  // Update the game state
  room.gameState.status = 'ended';
  room.gameState.word = '';
  room.gameState.drawer = null;
  
  // Broadcast the game end message
  broadcastSystemMessage(room, winnerMessage);
  
  // Transform players for leaderboard data
  const leaderboardPlayers = sortedPlayers.map(player => ({
    id: player.id,
    name: player.name,
    score: player.score,
    isPartyLeader: player.isPartyLeader
  }));
  
  // Broadcast leaderboard to all players
  broadcastToRoom(roomIdentifier, {
    type: 'gameLeaderboard',
    players: leaderboardPlayers,
    message: winnerMessage
  });
  
  // Reset player states
  room.players.forEach(player => {
    player.hasGuessedCorrectly = false;
    player.isDrawing = false;
    player.isReady = false;
    player.hasDrawn = false;
  });
  
  // Update game state
  broadcastGameState(room);
  updatePlayers(room);
  
  // Update global leaderboard
  sortedPlayers.forEach(player => {
    updateLeaderboard(
      player.name,
      player.score,
      room.players.filter(p => p.hasGuessedCorrectly).length
    );
  });
  
  console.log(`Room ${room.roomId}: Game ended, winner: ${topPlayer ? topPlayer.name : 'none'}`);
}

// Fix the isSocketActive function to be more reliable
function isSocketActive(socket) {
  // A socket is active only if it exists, is open, and doesn't have a ping timeout
  return socket && 
         socket.readyState === WebSocket.OPEN && 
         !socket.isPingTimeoutActive;
}

// Add a more aggressive ghost connection cleanup mechanism
function cleanupGhostConnections() {
  console.log("Running ghost connection cleanup");
  
  rooms.forEach(room => {
    // Collect sockets to test
    const socketsToCheck = room.players
      .filter(p => !p.disconnected)
      .map(p => p.ws);
    
    // Force a check of each socket by trying to send a ping
    socketsToCheck.forEach(socket => {
      try {
        if (socket && socket.readyState === WebSocket.OPEN) {
          // Send a ping to check if socket is responsive
          socket.ping();
        } else {
          // If socket isn't in OPEN state, it's definitely not active
          markSocketAsInactive(socket);
        }
      } catch (err) {
        console.log("Error sending ping during ghost cleanup:", err.message);
        // If ping throws an error, socket is broken
        markSocketAsInactive(socket);
      }
    });
  });
}

// Helper to mark a player as inactive if their socket matches
function markSocketAsInactive(socket) {
  if (!socket) return;
  
  rooms.forEach(room => {
    room.players.forEach(player => {
      if (player.ws === socket && !player.disconnected) {
        console.log(`Marking player ${player.name} as disconnected due to inactive socket`);
        player.disconnected = true;
        player.lastActive = Date.now() - 120000; // Make it old enough to get cleaned up
      }
    });
  });
}

// Add a more robust heartbeat system
function setupHeartbeat(ws) {
  ws.isAlive = true;
  
  // Reset the ping flag when we receive a pong
  ws.on('pong', () => {
    ws.isAlive = true;
    ws.lastPong = Date.now();
    totalPongs++;
    console.log(`Received pong from ${ws.playerName || 'unknown player'}, isAlive=${ws.isAlive}`);
  });
  
  // Also handle explicit pong messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'pong') {
        ws.isAlive = true;
        ws.lastPong = Date.now();
        totalPongs++;
        console.log(`Received JSON pong message from ${ws.playerName || 'unknown player'}, isAlive=${ws.isAlive}`);
      }
    } catch (e) {
      // Ignore parsing errors for non-JSON messages
    }
  });
}

// Replace the existing interval with a more robust one
const heartbeatInterval = setInterval(() => {
  totalPings++;
  wss.clients.forEach(ws => {
    // If the connection hasn't responded to pings, mark it as dead
    if (ws.isAlive === false) {
      console.log(`Terminating unresponsive connection for ${ws.playerName || 'unknown player'}`);
      return ws.terminate();
    }
    
    // Mark as not alive, will be set to true when pong is received
    ws.isAlive = false;
    
    // Send both a WebSocket ping frame and a JSON ping message
    try {
      ws.ping(() => {}); // WebSocket ping protocol
      
      // Also send a JSON ping message that the application can respond to
      safeSend(ws, { type: 'ping', timestamp: Date.now() });
      
      console.log(`Sent ping to ${ws.playerName || 'unknown player'}`);
    } catch (e) {
      console.error(`Error sending ping: ${e.message}`);
    }
  });
  
  // Log heartbeat stats every 10 intervals
  if (totalPings % 10 === 0) {
    console.log(`Heartbeat stats: ${totalPings} pings sent, ${totalPongs} pongs received, ${wss.clients.size} clients connected`);
  }
}, 15000); // Check every 15 seconds

// Make sure to clear the interval when the server shuts down
process.on('SIGINT', () => {
  clearInterval(heartbeatInterval);
  console.log('Heartbeat interval cleared');
  process.exit(0);
});

// Update connection handling to setup heartbeat
wss.on('connection', (ws, req) => {
  connectionCount++;
  const clientIp = req.socket.remoteAddress;
  console.log(`New connection #${connectionCount} from ${clientIp}. Total clients: ${wss.clients.size}`);
  
  // Keep track of the player's room and name directly on the socket
  let roomId = null;
  let playerName = null;
  
  // Extract query parameters from the connection URL
  const urlParams = new URL(`http://localhost${req.url}`).searchParams;
  const roomIdFromUrl = urlParams.get('roomId');
  
  console.log(`New connection with roomId from URL: ${roomIdFromUrl}`);
  
  // Handle disconnections
  ws.on('close', (code, reason) => {
    connectionCount = Math.max(0, connectionCount - 1);
    console.log(`Client disconnected (${code}): ${reason || 'No reason provided'}. Total clients: ${wss.clients.size}`);
    
    // Handle player leaving the room
    if (roomId && playerName) {
      const room = rooms.get(roomId);
      if (room) {
        console.log(`Player ${playerName} disconnected from room ${roomId}`);
        
        // Find the player in the room
        const playerIndex = room.players.findIndex(p => p.name === playerName);
        
        if (playerIndex !== -1) {
          // Mark the player as disconnected but don't remove them
          const disconnectedPlayer = room.players[playerIndex];
          disconnectedPlayer.disconnected = true;
          disconnectedPlayer.ws = null;
          
          console.log(`Marked player ${playerName} as disconnected`);
          
          // If the leader disconnected, assign a new leader
          if (disconnectedPlayer.isPartyLeader) {
            ensureOnePartyLeader(room);
          }
          
          // If the drawer disconnected, end the round
          if (disconnectedPlayer.isDrawing && room.gameState.status === 'playing') {
            console.log(`Drawer ${playerName} disconnected, ending round`);
            endRound(room);
          }
          
          // Broadcast updated player list to the room
          broadcastToRoom(roomId, JSON.stringify({
            type: 'playerList',
            players: room.players.filter(p => !p.disconnected).map(mapPlayerForClient)
          }));
          
          // Notify other players
          broadcastToRoom(roomId, JSON.stringify({
            type: 'system',
            content: `${playerName} has disconnected`,
            id: Date.now().toString(),
            timestamp: Date.now()
          }));
          
          // Remove room if empty
          if (room.players.every(p => p.disconnected)) {
            console.log(`Removing empty room ${roomId}`);
            clearInterval(room.roundTimer);
            rooms.delete(roomId);
          }
        }
      }
    }
  });
  
  // Message handler with improved error handling
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Received message type: ${data.type} from ${playerName || 'unknown'}`);
      
      // Handle ping messages
      if (data.type === 'ping') {
        // Send pong response
        safeSend(ws, JSON.stringify({
          type: 'pong',
          timestamp: Date.now()
        }));
        return;
      }
      
      // Handle join message - this will set roomId and playerName
      if (data.type === 'join') {
        roomId = data.roomId;
        playerName = data.playerName;
        handleJoinMessage(ws, data);
        return;
      }
      
      // For all other messages, we need roomId and playerName
      if (!roomId || !playerName) {
        console.log("Cannot process message: no room or player info");
        return;
      }
      
      // Handle ready state toggling
      if (data.type === 'ready') {
        handleReadyMessage(ws, data, roomId, playerName);
      }
      // Handle guess/chat message
      else if (data.type === 'guess') {
        handleGuessMessage(ws, data, roomId, playerName);
      }
      // Handle drawing data
      else if (data.type === 'draw' || data.type === 'clear') {
        handleDrawingData(ws, data, roomId, playerName);
      }
      // Handle game settings update
      else if (data.type === 'gameSettings') {
        handleGameSettingsUpdate(ws, data, roomId, playerName);
      }
      // Handle player kick
      else if (data.type === 'kickPlayer') {
        handleKickPlayer(ws, data, roomId, playerName);
      }
      // Handle start new game
      else if (data.type === 'startNewGame') {
        handleStartNewGame(ws, roomId, playerName);
      }
      else {
        console.log(`Unhandled message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
});

// Generate a unique session ID for reconnection
function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Get count of active (non-disconnected) players
function getActivePlayerCount(room) {
  return room.players.filter(p => !p.disconnected).length;
}

// Clean up disconnected players periodically
setInterval(() => {
  const DISCONNECT_TIMEOUT = 60 * 1000; // 1 minute (down from 5 minutes)
  const now = Date.now();
  
  rooms.forEach(room => {
    // Mark long-inactive players as disconnected
    room.players.forEach(player => {
      if (!player.disconnected && now - player.lastActive > DISCONNECT_TIMEOUT) {
        console.log(`Marking inactive player ${player.name} as disconnected due to inactivity`);
        player.disconnected = true;
        
        // Notify other players that this player disconnected
        broadcastSystemMessage(room, `${player.name} has disconnected due to inactivity`);
        
        // Update player list
        const updatedPlayers = room.players
          .filter(p => !p.disconnected)
          .map(p => ({
            name: p.name,
            score: p.score,
            isReady: p.isReady,
            isPartyLeader: p.isPartyLeader
          }));
        
        broadcastToRoom(room.roomId, {
          type: "playerUpdate",
          players: updatedPlayers
        });
        
        // If this is the party leader, reassign leadership
        if (player.isPartyLeader) {
          const newLeader = room.players.find(p => !p.disconnected);
          if (newLeader) {
            newLeader.isPartyLeader = true;
            broadcastSystemMessage(room, `${newLeader.name} is now the party leader`);
          }
        }
      }
    });
    
    // IMPORTANT: Don't actually remove disconnected players from the room.players array
    // This allows players with the same name to rejoin when disconnected
    // Instead, we filter them out when broadcasting the player list
    
    // Remove empty rooms
    if (room.players.filter(p => !p.disconnected).length === 0) {
      console.log(`Removing empty room ${room.roomId}`);
      rooms.delete(room.roomId);
    }
  });
}, 30000);

// Graceful shutdown handling
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Attempt to continue running despite the error
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Attempt to continue running despite the rejection
});

function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  
  // Notify all clients about server shutdown
  rooms.forEach(room => {
    room.players.forEach(player => {
      try {
        if (player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({
            type: "system",
            content: "Server is shutting down. Please reconnect in a moment."
          }));
          player.ws.close(1001, "Server shutting down");
        }
      } catch (error) {
        console.error("Error during shutdown notification:", error);
      }
    });
  });
  
  // Close the server
  try {
    server.close(() => {
      console.log('Server closed successfully');
      process.exit(0);
    });
    
    // Force close after 5 seconds if it hangs
    setTimeout(() => {
      console.log('Forcing server shutdown after timeout');
      process.exit(1);
    }, 5000);
  } catch (error) {
    console.error("Error during server shutdown:", error);
    process.exit(1);
  }
}

const PORT = process.env.WS_PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket server started on ws://0.0.0.0:${PORT}`);
  console.log(`Listening for connections on all network interfaces`);
});

// Improved function to broadcast messages to a room
function broadcastToRoom(roomId, message, excludeSocket = null) {
  if (!roomId) {
    console.log("Cannot broadcast: roomId is undefined");
    return;
  }
  
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`Cannot broadcast: room ${roomId} not found`);
    return;
  }
  
  // Use roomId for logging consistency
  const roomIdentifier = room.roomId || room.id || roomId;
  
  const activePlayers = room.players.filter(player => !player.disconnected && player.ws);
  let successCount = 0;
  
  // Convert to JSON string if it's an object
  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  
  for (const player of activePlayers) {
    try {
      if (player.ws && player.ws !== excludeSocket && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(messageStr);
        successCount++;
      }
    } catch (err) {
      console.error(`Error sending to ${player.name}:`, err.message);
    }
  }
  
  console.log(`Successfully broadcast to ${successCount}/${activePlayers.length} players in room ${roomIdentifier}`);
}

// Fix leader assignment when players join/reconnect
function assignRoomLeader(room) {
  if (!room || !room.players || room.players.length === 0) return;
  
  // Count how many leaders we have currently
  const currentLeaders = room.players.filter(p => p.isPartyLeader && !p.disconnected);
  
  // If we already have exactly one active leader, don't change anything
  if (currentLeaders.length === 1) {
    return;
  }
  
  // Reset all leader flags first
  room.players.forEach(p => {
    p.isPartyLeader = false;
  });
  
  // Get the first active player to be the leader
  const activePlayers = room.players.filter(p => !p.disconnected);
  if (activePlayers.length > 0) {
    activePlayers[0].isPartyLeader = true;
    console.log(`Assigned ${activePlayers[0].name} as the new leader in room ${room.roomId}`);
  }
}

// Add handler for startNewGame message
function handleStartNewGame(ws, roomId, playerName) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const player = room.players.find(p => p.name === playerName);
  if (!player || !player.isPartyLeader) return;
  
  // Reset player states
  room.players.forEach(p => {
    p.isReady = false;
    p.isDrawing = false;
    p.hasGuessedCorrectly = false;
    p.score = 0;
  });
  
  // Reset game state
  room.gameState.status = 'waiting';
  room.gameState.currentRound = 0;
  room.gameState.word = null;
  room.gameState.drawer = null;
  
  // Clear any running timers
  if (room.roundTimer) {
    clearInterval(room.roundTimer);
    room.roundTimer = null;
  }
  
  // Notify players
  broadcastToRoom(roomId, JSON.stringify({
    type: 'system',
    content: `Game has been reset by ${playerName}. Get ready for a new game!`,
    id: Date.now().toString(),
    timestamp: Date.now()
  }));
  
  // Send updated game state
  broadcastGameState(room);
  
  // Update player list
  broadcastToRoom(roomId, JSON.stringify({
    type: 'playerList',
    players: room.players.filter(p => !p.disconnected).map(mapPlayerForClient)
  }));
}

// Add connection tracking for debugging
let connectionCount = 0;
wss.on('connection', (ws, req) => {
  connectionCount++;
  const clientIp = req.socket.remoteAddress;
  console.log(`New connection #${connectionCount} from ${clientIp}. Total clients: ${wss.clients.size}`);
  
  // Setup ping interval to detect disconnected clients
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
  
  // Initialize client properties
  ws.isAlive = true;
  ws.roomId = null;
  ws.playerName = null;
  
  // Ping-pong to detect disconnected clients
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // Handle disconnections
  ws.on('close', (code, reason) => {
    connectionCount = Math.max(0, connectionCount - 1);
    console.log(`Client disconnected (${code}): ${reason || 'No reason provided'}. Total clients: ${wss.clients.size}`);
    
    // Clean up ping interval
    clearInterval(pingInterval);
    
    // Handle player leaving rooms
    if (ws.roomId && ws.playerName) {
      handlePlayerLeave(ws);
    }
  });
  
  // Rest of your message handling code...
});

// Add better error handling for the WebSocket server
wss.on('error', (error) => {
  console.error('WebSocket Server Error:', error);
});

// Helper function to map player data for client (exclude WebSocket and sensitive data)
function mapPlayerForClient(player) {
  // Create a clean copy without the WebSocket connection
  return {
    id: player.id,
    name: player.name,
    score: player.score,
    isReady: player.isReady,
    isDrawing: player.isDrawing,
    hasGuessedCorrectly: player.hasGuessedCorrectly,
    isPartyLeader: player.isPartyLeader
  };
}

// Add this helper function to ensure there's exactly one party leader
function ensureOnePartyLeader(room) {
  if (!room || !room.players || room.players.length === 0) return;
  
  // Find current leaders
  const leaders = room.players.filter(p => p.isPartyLeader && !p.disconnected);
  
  if (leaders.length === 0) {
    // No leader, assign the first connected player
    const newLeader = room.players.find(p => !p.disconnected);
    if (newLeader) {
      newLeader.isPartyLeader = true;
      console.log(`Assigned ${newLeader.name} as the new party leader (none existed)`);
      
      // Notify all players about the new leader
      broadcastToRoom(room.roomId, JSON.stringify({
        type: 'system',
        content: `${newLeader.name} is now the party leader`,
        id: Date.now().toString(),
        timestamp: Date.now()
      }));
    }
  } else if (leaders.length > 1) {
    // Too many leaders, keep only the first one
    console.log(`Found ${leaders.length} leaders, fixing...`);
    let keepFirstLeader = true;
    for (const player of room.players) {
      if (player.isPartyLeader) {
        if (keepFirstLeader) {
          keepFirstLeader = false; // Keep the first one we find
        } else {
          player.isPartyLeader = false; // Remove leadership from others
          console.log(`Removed leadership from ${player.name}`);
        }
      }
    }
  }
  
  // Broadcast updated player list after ensuring leader
  broadcastToRoom(room.roomId, JSON.stringify({
    type: 'playerList',
    players: room.players.filter(p => !p.disconnected).map(mapPlayerForClient)
  }));
}

// Function to handle chat/guess messages
function handleGuessMessage(ws, data, roomId, playerName) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const player = room.players.find(p => p.name === playerName);
  if (!player) return;
  
  // If game is not active, treat it as a regular chat message
  if (room.gameState.status !== 'playing') {
    // Regular chat message
    broadcastToRoom(roomId, JSON.stringify({
      type: 'chat',
      id: Date.now().toString(),
      playerName: playerName,
      content: data.guess,
      timestamp: Date.now()
    }));
    return;
  }
  
  // Don't let the drawer guess
  if (player.isDrawing) {
    safeSend(ws, JSON.stringify({
      type: 'system',
      content: "You can't guess while drawing!",
      id: Date.now().toString(),
      timestamp: Date.now()
    }));
    return;
  }
  
  // Check if it's a correct guess
  const guess = data.guess.toLowerCase().trim();
  const word = room.gameState.word ? room.gameState.word.toLowerCase() : '';
  
  if (word && guess === word) {
    // Correct guess!
    if (!player.hasGuessedCorrectly) {
      player.hasGuessedCorrectly = true;
      
      // Calculate score based on time remaining
      const maxPoints = 100;
      const timeRatio = room.gameState.timeLeft / room.settings.timePerRound;
      const timeBonus = Math.floor(maxPoints * timeRatio);
      const pointsEarned = 50 + timeBonus; // Base points + time bonus
      
      player.score += pointsEarned;
      
      // Notify the guesser
      safeSend(ws, JSON.stringify({
        type: 'correct',
        content: `You guessed correctly! +${pointsEarned} points`,
        id: Date.now().toString(),
        timestamp: Date.now()
      }));
      
      // Notify all players someone guessed correctly
      broadcastToRoom(roomId, JSON.stringify({
        type: 'system',
        content: `${playerName} guessed the word!`,
        id: Date.now().toString(),
        timestamp: Date.now()
      }));
      
      // Update player list to reflect score and correct guess
      broadcastToRoom(roomId, JSON.stringify({
        type: 'playerList',
        players: room.players.filter(p => !p.disconnected).map(mapPlayerForClient)
      }));
      
      // Check if all players have guessed correctly
      if (checkAllPlayersGuessed(room)) {
        // End round early
        broadcastToRoom(roomId, JSON.stringify({
          type: 'system',
          content: `Everyone guessed the word! Ending round early...`,
          id: Date.now().toString(),
          timestamp: Date.now()
        }));
        
        setTimeout(() => endRound(room), 3000);
      }
    }
  } else {
    // Incorrect guess - send to all players
    broadcastToRoom(roomId, JSON.stringify({
      type: 'chat',
      id: Date.now().toString(),
      playerName: playerName,
      content: data.guess,
      timestamp: Date.now()
    }));
  }
}

// Function to handle drawing data
function handleDrawingData(ws, data, roomId, playerName) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const player = room.players.find(p => p.name === playerName);
  if (!player) return;
  
  // Only allow the current drawer to send drawing commands
  if (room.gameState.status === 'playing' && player.isDrawing) {
    // Send drawing data to all other players
    broadcastToRoom(roomId, data, ws);
  }
}

// Function to handle game settings update
function handleGameSettingsUpdate(ws, data, roomId, playerName) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const player = room.players.find(p => p.name === playerName);
  if (!player || !player.isPartyLeader) return;
  
  // Update settings
  room.settings = {
    ...room.settings,
    ...data.settings
  };
  
  // Update max rounds in game state
  room.gameState.maxRounds = room.settings.maxRounds;
  
  // Notify all players
  broadcastToRoom(roomId, JSON.stringify({
    type: 'system',
    content: `Game settings updated by ${playerName}`,
    id: Date.now().toString(),
    timestamp: Date.now()
  }));
  
  // Send updated settings to all players
  broadcastToRoom(roomId, JSON.stringify({
    type: 'gameSettings',
    settings: room.settings
  }));
  
  // Update game state
  broadcastGameState(room);
}

// Function to handle player kick
function handleKickPlayer(ws, data, roomId, playerName) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const player = room.players.find(p => p.name === playerName);
  if (!player || !player.isPartyLeader) return;
  
  const playerToKick = room.players.find(p => p.name === data.playerToKick);
  if (!playerToKick) return;
  
  // Send message to kicked player
  if (playerToKick.ws) {
    safeSend(playerToKick.ws, JSON.stringify({
      type: 'system',
      content: `You have been kicked by ${playerName}`,
      id: Date.now().toString(),
      timestamp: Date.now()
    }));
    
    // Close their connection
    try {
      playerToKick.ws.close(1000, "Kicked from room");
    } catch (err) {
      console.error(`Error closing kicked player's connection:`, err);
    }
  }
  
  // Mark as disconnected
  playerToKick.disconnected = true;
  playerToKick.ws = null;
  
  // Notify other players
  broadcastToRoom(roomId, JSON.stringify({
    type: 'system',
    content: `${data.playerToKick} was kicked from the room`,
    id: Date.now().toString(),
    timestamp: Date.now()
  }));
  
  // Update player list
  broadcastToRoom(roomId, JSON.stringify({
    type: 'playerList',
    players: room.players.filter(p => !p.disconnected).map(mapPlayerForClient)
  }));
}

// Function to handle join message
function handleJoinMessage(ws, data) {
  const roomId = data.roomId;
  const playerName = data.playerName;
  
  console.log(`Player ${playerName} trying to join room ${roomId}`);
  
  // Check if the room exists
  let room = rooms.get(roomId);
  
  // Create room if it doesn't exist
  if (!room) {
    room = {
      id: roomId,
      roomId: roomId,
      players: [],
      gameState: {
        status: 'waiting',
        currentRound: 0,
        maxRounds: 3,
        timeLeft: 80,
        word: null,
        drawer: null
      },
      settings: {
        maxRounds: 3,
        timePerRound: 80,
        customWords: []
      },
      roundTimer: null
    };
    
    rooms.set(roomId, room);
    console.log(`Created new room ${roomId}`);
  }
  
  // Check if player is rejoining
  const existingPlayerIndex = room.players.findIndex(p => p.name === playerName);
  
  if (existingPlayerIndex !== -1) {
    // Player exists, update their connection
    console.log(`Player ${playerName} is rejoining room ${roomId}`);
    
    const existingPlayer = room.players[existingPlayerIndex];
    
    // Update the player's connection
    existingPlayer.ws = ws;
    existingPlayer.disconnected = false;
    
    // Send current players to the rejoining player
    safeSend(ws, JSON.stringify({
      type: 'playerList',
      players: room.players.filter(p => !p.disconnected).map(mapPlayerForClient)
    }));
    
    // Send player update to identify the current player
    safeSend(ws, JSON.stringify({
      type: 'playerUpdate',
      player: mapPlayerForClient(existingPlayer)
    }));
    
    // Send welcome back message
    safeSend(ws, JSON.stringify({
      type: 'system',
      content: `Welcome back, ${playerName}!`,
      id: Date.now().toString(),
      timestamp: Date.now()
    }));
    
    // Send current game state
    broadcastGameState(room);
    
    // Notify other players that this player has rejoined
    broadcastToRoom(roomId, JSON.stringify({
      type: 'system',
      content: `${playerName} has rejoined the room!`,
      id: Date.now().toString(),
      timestamp: Date.now()
    }), ws);
    
    // Broadcast updated player list to ALL players
    broadcastToRoom(roomId, JSON.stringify({
      type: 'playerList',
      players: room.players.filter(p => !p.disconnected).map(mapPlayerForClient)
    }));
  } else {
    // New player
    console.log(`New player ${playerName} joining room ${roomId}`);
    
    // Generate player ID
    const playerId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    // Create player with default values
    const isFirstPlayer = room.players.length === 0 || room.players.every(p => p.disconnected);
    const newPlayer = {
      id: playerId,
      name: playerName,
      score: 0,
      isReady: false,
      isDrawing: false,
      hasGuessedCorrectly: false,
      isPartyLeader: isFirstPlayer,
      ws: ws,
      disconnected: false
    };
    
    // Add to room
    room.players.push(newPlayer);
    
    // Send welcome message
    safeSend(ws, JSON.stringify({
      type: 'system',
      content: `Welcome to room ${roomId}, ${playerName}!`,
      id: Date.now().toString(),
      timestamp: Date.now()
    }));
    
    // Send current players to the new player
    safeSend(ws, JSON.stringify({
      type: 'playerList',
      players: room.players.filter(p => !p.disconnected).map(mapPlayerForClient)
    }));
    
    // Send player update to identify the current player
    safeSend(ws, JSON.stringify({
      type: 'playerUpdate',
      player: mapPlayerForClient(newPlayer)
    }));
    
    // Broadcast to room that new player joined
    broadcastToRoom(roomId, JSON.stringify({
      type: 'system',
      content: `${playerName} has joined the room!`,
      id: Date.now().toString(),
      timestamp: Date.now()
    }), ws);
    
    // Ensure only one party leader
    ensureOnePartyLeader(room);
    
    // Send game state
    broadcastGameState(room);
    
    // Broadcast updated player list to ALL players
    broadcastToRoom(roomId, JSON.stringify({
      type: 'playerList',
      players: room.players.filter(p => !p.disconnected).map(mapPlayerForClient)
    }));
  }
}

// Function to handle ready state toggling
function handleReadyMessage(ws, data, roomId, playerName) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  // Find player
  const player = room.players.find(p => p.name === playerName);
  if (!player) {
    console.log(`Player ${playerName} not found in room ${roomId}`);
    return;
  }
  
  // Toggle ready state
  player.isReady = !player.isReady;
  console.log(`Player ${playerName} set ready: ${player.isReady}`);
  
  // Broadcast updated player list with ready status
  broadcastToRoom(roomId, JSON.stringify({
    type: 'playerList',
    players: room.players.filter(p => !p.disconnected).map(mapPlayerForClient)
  }));
  
  // Update the player info for this client
  safeSend(ws, JSON.stringify({
    type: 'playerUpdate',
    player: mapPlayerForClient(player)
  }));
  
  // Broadcast system message about ready state
  broadcastToRoom(roomId, JSON.stringify({
    type: 'system',
    content: `${playerName} is ${player.isReady ? 'ready' : 'not ready'}`,
    id: Date.now().toString(),
    timestamp: Date.now()
  }));
  
  // Try to start game if all players are ready
  if (player.isReady && checkAllPlayersReady(room)) {
    console.log("All players ready, attempting to start game...");
    tryStartGame(room);
  }
}

// Function to handle player leave
function handlePlayerLeave(ws) {
  const roomId = ws.roomId;
  const playerName = ws.playerName;
  
  if (!roomId || !playerName) return;
  
  const room = rooms.get(roomId);
  if (!room) return;
  
  console.log(`Player ${playerName} disconnected from room ${roomId}`);
  
  // Find the player in the room
  const playerIndex = room.players.findIndex(p => p.name === playerName);
  
  if (playerIndex !== -1) {
    // Mark the player as disconnected but don't remove them
    const disconnectedPlayer = room.players[playerIndex];
    disconnectedPlayer.disconnected = true;
    disconnectedPlayer.ws = null;
    
    console.log(`Marked player ${playerName} as disconnected`);
    
    // If the leader disconnected, assign a new leader
    if (disconnectedPlayer.isPartyLeader) {
      ensureOnePartyLeader(room);
    }
    
    // If the drawer disconnected, end the round
    if (disconnectedPlayer.isDrawing && room.gameState.status === 'playing') {
      console.log(`Drawer ${playerName} disconnected, ending round`);
      endRound(room);
    }
    
    // Broadcast updated player list to the room
    broadcastToRoom(roomId, JSON.stringify({
      type: 'playerList',
      players: room.players.filter(p => !p.disconnected).map(mapPlayerForClient)
    }));
    
    // Notify other players
    broadcastToRoom(roomId, JSON.stringify({
      type: 'system',
      content: `${playerName} has disconnected`,
      id: Date.now().toString(),
      timestamp: Date.now()
    }));
    
    // Remove room if empty
    if (room.players.every(p => p.disconnected)) {
      console.log(`Removing empty room ${roomId}`);
      clearInterval(room.roundTimer);
      rooms.delete(roomId);
    }
  }
} 