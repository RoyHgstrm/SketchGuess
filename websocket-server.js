import { WebSocketServer, WebSocket } from 'ws';
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

// Map to store room data
const rooms = new Map();

// Statistics tracking (optional, could be moved or removed if not needed by this logic)
let totalConnectionCount = 0;
let totalRoomCount = 0;

// --- Exportable WebSocket Logic --- 
export function runWebSocketServerLogic(wssInstance) {
  console.log('Attaching WebSocket event listeners...');

  // Server start time for uptime calculation
  const serverStartTime = new Date();

  // Function to get server statistics for admin dashboard
  function getServerStats() {
    const uptime = Math.floor((Date.now() - serverStartTime.getTime()) / 1000);
    const activeConnections = getActiveConnectionCount();
    
    return {
      uptime,
      totalConnections: totalConnectionCount,
      activeConnections,
      totalRooms: totalRoomCount,
      activeRooms: rooms.size,
      startTime: serverStartTime.toISOString(),
      defaultWords: DEFAULT_WORDS
    };
  }

  // Function to get active connection count
  function getActiveConnectionCount() {
    let count = 0;
    rooms.forEach(room => {
      room.players.forEach(player => {
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
          count++;
        }
      });
    });
    return count;
  }

  // Function to get active rooms list for admin dashboard
  function getActiveRoomsList() {
    const activeRooms = [];
    rooms.forEach((room, roomId) => {
      // Only include rooms with active players
      const activePlayers = room.players.filter(p => p.ws && p.ws.readyState === WebSocket.OPEN);
      if (activePlayers.length > 0) {
        activeRooms.push({
          roomId,
          playerCount: activePlayers.length,
          isActive: room.status === 'playing',
          currentRound: room.roundNumber + 1,
          maxRounds: room.settings.maxRounds,
          timeLeft: room.timeLeft,
          players: activePlayers.map(p => ({
            name: p.name,
            score: p.score,
            isReady: p.isReady,
            isDrawing: p === room.currentDrawer,
            correctGuess: p.correctGuess
          })),
          currentWord: room.status === 'playing' ? (room.currentWord || '(hidden)') : null,
          settings: {
            maxRounds: room.settings.maxRounds,
            timePerRound: room.settings.timePerRound,
            customWords: room.settings.customWords || null,
            useOnlyCustomWords: room.settings.useOnlyCustomWords || false
          }
        });
      }
    });
    
    return activeRooms;
  }

  // Timer functions
  function startTimer(room) {
    // ... (existing startTimer logic)
    room.roundStartTime = Date.now();
    room.timeLeft = room.settings.timePerRound;
    console.log(`Starting timer for room ${room.roomId}, ${room.timeLeft} seconds`);
    broadcastTimeUpdate(room);
    if (room.roundTimer) {
      clearInterval(room.roundTimer);
      room.roundTimer = null;
    }
    const timerInterval = setInterval(() => {
      if (!rooms.has(room.roomId)) {
        clearInterval(timerInterval);
        return;
      }
      room.timeLeft--;
      if (room.timeLeft % 10 === 0 || room.timeLeft <= 5) {
        console.log(`Timer update: ${room.timeLeft} seconds remaining in room ${room.roomId}`);
      }
      broadcastTimeUpdate(room);
      if (room.timeLeft <= 0) {
        console.log(`Time's up in room ${room.roomId}!`);
        clearInterval(timerInterval);
        endRound(room);
      }
    }, 1000);
    room.roundTimer = timerInterval;
  }

  function broadcastTimeUpdate(room) {
    // ... (existing broadcastTimeUpdate logic)
     room.players.forEach(player => {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({
          type: "timeUpdate",
          timeLeft: room.timeLeft
        }));
        if (room.timeLeft % 5 === 0 || room.timeLeft <= 10) { 
           player.ws.send(JSON.stringify({
            type: "gameState",
            gameState: {
              status: 'playing',
              currentRound: room.roundNumber + 1,
              maxRounds: room.settings.maxRounds,
              timeLeft: room.timeLeft,
              drawer: room.currentDrawer ? { id: room.currentDrawer.name, name: room.currentDrawer.name } : null,
              word: player === room.currentDrawer ? room.currentWord : undefined,
              isDrawing: player === room.currentDrawer
            }
          }));
        }
      }
    });
  }

  function getWordForRound(room) {
    // ... (existing getWordForRound logic)
      if (!Array.isArray(DEFAULT_WORDS) || DEFAULT_WORDS.length === 0) {
        console.error('DEFAULT_WORDS is not properly defined or is empty');
        return 'drawing';
      }
      let wordList = DEFAULT_WORDS;
      const hasCustomWords = Array.isArray(room.settings.customWords) && room.settings.customWords.length > 0;
      if (hasCustomWords) {
        if (room.settings.useOnlyCustomWords) {
          console.log(`Using only custom words (${room.settings.customWords.length} words)`);
          wordList = room.settings.customWords;
        } else {
          console.log(`Combining default and custom word lists (${DEFAULT_WORDS.length} + ${room.settings.customWords.length} words)`);
          wordList = [...DEFAULT_WORDS, ...room.settings.customWords];
        }
      }
      if (wordList.length === 0) {
        console.warn('Word list is empty, using fallback word');
        return 'drawing';
      }
      const randomIndex = Math.floor(Math.random() * wordList.length);
      const word = wordList[randomIndex];
      console.log(`Selected word: ${word} from ${wordList.length} total words`);
      return word;
  }

  function startNewTurn(room) {
    // ... (existing startNewTurn logic)
    room.players.forEach(player => {
      player.correctGuess = false;
      player.guessTime = undefined;
    });
    if (room.roundTimer) {
      clearTimeout(room.roundTimer);
      room.roundTimer = null;
    }
    let nextDrawerIndex = 0;
    if (room.currentDrawer) {
      const currentDrawerIndex = room.players.findIndex(p => p === room.currentDrawer);
      nextDrawerIndex = currentDrawerIndex !== -1 ? (currentDrawerIndex + 1) % room.players.length : Math.floor(Math.random() * room.players.length);
    } else {
      console.log("First turn: Selecting random drawer.");
      nextDrawerIndex = Math.floor(Math.random() * room.players.length);
    }
    room.currentDrawer = room.players[nextDrawerIndex];
    console.log(`New drawer selected: ${room.currentDrawer.name} (Turn ${nextDrawerIndex + 1} of Round ${room.roundNumber + 1})`);
    const randomWord = getWordForRound(room);
    room.currentWord = randomWord;
    if (room.currentDrawer && room.currentDrawer.ws && room.currentDrawer.ws.readyState === WebSocket.OPEN) {
      room.currentDrawer.ws.send(JSON.stringify({ type: "drawerWord", word: randomWord }));
    }
    room.players.forEach(player => {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({ type: "newDrawer", drawer: room.currentDrawer ? room.currentDrawer.name : null }));
        player.ws.send(JSON.stringify({
          type: "gameState",
          gameState: {
            status: 'playing',
            currentRound: room.roundNumber + 1,
            maxRounds: room.settings.maxRounds,
            timeLeft: room.settings.timePerRound,
            drawer: room.currentDrawer ? { id: room.currentDrawer.name, name: room.currentDrawer.name } : null,
            word: player === room.currentDrawer ? room.currentWord : undefined,
            isDrawing: player === room.currentDrawer
          }
        }));
        player.ws.send(JSON.stringify({ type: "clear" }));
      }
    });
    room.isRoundActive = true;
    startTimer(room);
  }

  function checkAllPlayersReady(room) {
    // ... (existing checkAllPlayersReady logic)
    return room.players.length >= 2 && room.players.every(player => player.isReady);
  }

  function checkAllPlayersGuessed(room) {
    // ... (existing checkAllPlayersGuessed logic)
    const nonDrawerPlayers = room.players.filter(p => p !== room.currentDrawer);
    return nonDrawerPlayers.every(p => p.correctGuess);
  }

  function tryStartGame(room) {
    // ... (existing tryStartGame logic)
     if (checkAllPlayersReady(room) && !room.isRoundActive) {
      broadcastSystemMessage(room, "All players are ready! Starting the game...");
      room.players.forEach(player => { player.score = 0; });
      room.roundNumber = 0;
      room.status = 'playing';
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
      setTimeout(() => startNewTurn(room), 3000);
    }
  }

  function broadcastSystemMessage(room, message) {
    // ... (existing broadcastSystemMessage logic)
     room.players.forEach(player => {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({ type: "system", content: message }));
      }
    });
  }

  function endRound(room) {
    // ... (existing endRound logic)
      if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }
      room.isRoundActive = false;
      const correctGuessers = room.players.filter(p => p.correctGuess && p !== room.currentDrawer).map(p => ({ name: p.name, time: p.guessTime || 0 }));
      room.players.forEach(player => {
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({ type: "roundEnd", word: room.currentWord, correctGuessers }));
        }
      });
      const currentDrawerIndex = room.players.findIndex(p => p === room.currentDrawer);
      const isLastDrawerInRound = currentDrawerIndex === room.players.length - 1 || currentDrawerIndex === -1;
      room.currentWord = null;
      if (isLastDrawerInRound) {
        room.roundNumber++;
        broadcastSystemMessage(room, `Round ${room.roundNumber} completed!`);
      }
      if (room.roundNumber >= room.settings.maxRounds) {
        endGame(room);
      } else {
        setTimeout(() => startNewTurn(room), 5000);
      }
  }

  function endGame(room) {
    // ... (existing endGame logic, verified in previous step)
    console.log(`Ending game in room ${room.roomId}`);
    if (room.roundTimer) { clearInterval(room.roundTimer); room.roundTimer = null; }
    const finalScores = room.players.map(p => ({ id: p.id, name: p.name, score: p.score || 0, isPartyLeader: p.isPartyLeader || false }));
    const sortedScores = [...finalScores].sort((a, b) => b.score - a.score);
    room.status = 'ended';
    room.isRoundActive = false;
    room.currentDrawer = null;
    room.currentWord = null;
    room.players.forEach(player => {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({ type: "gameLeaderboard", players: sortedScores, message: "Game has ended! Final scores:" }));
        player.ws.send(JSON.stringify({
          type: "gameState",
          gameState: { status: 'ended', currentRound: room.roundNumber, maxRounds: room.settings.maxRounds, timeLeft: 0, drawer: null, word: null, isDrawing: false }
        }));
      }
    });
    broadcastSystemMessage(room, "Game over! The party leader can start a new game or change settings.");
    console.log(`Game ended for room ${room.roomId}. Final leaderboard sent.`);
  }

  function assignNewPartyLeader(room) {
    // ... (existing assignNewPartyLeader logic)
     const activePlayers = room.players.filter(p => !p.disconnected);
     if (activePlayers.length === 0) return;
     room.players.forEach(p => { p.isPartyLeader = false; });
     const newLeader = activePlayers[0];
     newLeader.isPartyLeader = true;
     console.log(`${newLeader.name} is now the party leader`);
     broadcastSystemMessage(room, `${newLeader.name} is now the party leader`);
  }

  function broadcastPlayerList(room) {
    // ... (existing broadcastPlayerList logic)
     if (!room || !room.players) return;
     const activePlayers = room.players.filter(p => !p.disconnected);
     const playerList = activePlayers.map(player => ({ id: player.id, name: player.name, score: player.score, isReady: player.isReady, isDrawing: player.isDrawing || player === room.currentDrawer, hasGuessedCorrectly: player.correctGuess, isPartyLeader: player.isPartyLeader }));
     console.log(`Sending player list update for room ${room.roomId}: ${playerList.length} active players`);
     room.players.forEach(player => {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({ type: "playerList", players: playerList }));
      }
    });
  }

  function handlePlayerLeave(ws) {
    // ... (existing handlePlayerLeave logic)
    try {
      const roomId = ws.roomId;
      const playerName = ws.playerName;
      if (!roomId || !playerName) { console.log("Cannot handle player leave: missing info"); return; }
      console.log(`Player ${playerName} is leaving room ${roomId}`);
      const room = rooms.get(roomId);
      if (!room) { console.log(`Room ${roomId} not found`); return; }
      const playerIndex = room.players.findIndex((p) => p.name === playerName);
      if (playerIndex === -1) { console.log(`Player ${playerName} not found`); return; }
      const player = room.players[playerIndex];
      if (player.disconnected) { console.log(`Player ${playerName} already disconnected`); return; }
      player.disconnected = true;
      player.ws = null;
      if (!player.disconnections) player.disconnections = 0;
      player.disconnections++;
      player.lastDisconnectTime = Date.now();
      broadcastSystemMessage(room, `${playerName} has disconnected`);
      if (player === room.currentDrawer && room.isRoundActive) {
        console.log(`Drawer ${playerName} disconnected, ending round`);
        endRound(room);
      }
      if (player.isPartyLeader) {
        assignNewPartyLeader(room);
      }
      const activePlayerCount = room.players.filter(p => !p.disconnected).length;
      console.log(`Room ${roomId} has ${activePlayerCount} active players`);
      setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (currentRoom) {
          const playerStillExists = currentRoom.players.find(p => p.name === playerName);
          if (playerStillExists && playerStillExists.disconnected) {
            currentRoom.players = currentRoom.players.filter(p => p.name !== playerName);
            console.log(`Removed inactive player ${playerName} from room ${roomId}`);
            broadcastPlayerList(currentRoom);
          }
        }
      }, 5 * 60 * 1000);
      if (activePlayerCount === 0 && room.isRoundActive) {
        console.log(`Game in room ${roomId} ended due to all disconnects`);
        endRound(room);
      }
      broadcastPlayerList(room);
    } catch (error) {
      console.error("Error handling player leave:", error);
    }
  }

  function sendGameState(room, player) {
    // ... (existing sendGameState logic)
    if (!room || !player || !player.ws || player.ws.readyState !== WebSocket.OPEN) return;
    try {
      console.log(`Sending current game state to ${player.name}`);
      const gameState = { status: room.status || 'waiting', currentRound: room.roundNumber || 0, maxRounds: room.settings.maxRounds, timeLeft: room.timeLeft || 0, isDrawing: player === room.currentDrawer };
      if (player === room.currentDrawer && room.currentWord) {
        gameState.word = room.currentWord;
        player.ws.send(JSON.stringify({ type: "drawerWord", word: room.currentWord, content: `Your word to draw is: ${room.currentWord}` }));
      }
      if (room.currentDrawer) {
        gameState.drawer = { id: room.currentDrawer.name, name: room.currentDrawer.name };
      }
      player.ws.send(JSON.stringify({ type: "gameState", gameState }));
      console.log(`Game state sent to ${player.name}:`, gameState);
    } catch (error) {
      console.error(`Error sending game state to ${player.name}:`, error);
    }
  }

  // --- Attach Listeners to the Provided wssInstance --- 
  wssInstance.on("connection", (ws, req) => {
    console.log("New connection attempt from", req?.socket?.remoteAddress || 'unknown');
    totalConnectionCount++;

    let currentRoom = null;
    let currentPlayer = null;

    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });

    ws.on("message", (message) => {
      // --- Move the ENTIRE message handling logic (switch statement) here --- 
      try {
        const data = JSON.parse(message.toString());
        const type = data.type;
        
        switch (type) {
          case "join": {
            const roomId = data.roomId;
            let existingRoom = rooms.get(roomId);
            if (!existingRoom) {
              console.log(`Creating new room ${roomId}`);
              totalRoomCount++;
              const newRoom = {
                roomId, players: [], 
                settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), 
                roundNumber: 0, timeLeft: 0, isRoundActive: false, status: 'waiting',
                connectionAttempts: new Map()
              };
              rooms.set(roomId, newRoom);
              existingRoom = newRoom;
            }
            currentRoom = existingRoom;
            if (!currentRoom.connectionAttempts) currentRoom.connectionAttempts = new Map();
            const now = Date.now();
            const lastAttempt = currentRoom.connectionAttempts.get(data.playerName) || 0;
            currentRoom.connectionAttempts.set(data.playerName, now);
            const COOLDOWN_PERIOD = 1000;
            const timeSinceLastAttempt = now - lastAttempt;
            const isReconnectingTooQuickly = lastAttempt > 0 && timeSinceLastAttempt < COOLDOWN_PERIOD;
            if (isReconnectingTooQuickly) {
              console.log(`Connection throttled for ${data.playerName}: reconnecting too quickly`);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "error", content: `Please wait before reconnecting` }));
                try { ws.close(4000, "Connection throttled"); } catch (error) { console.error("Error closing throttled connection:", error); }
              }
              return;
            }
            const existingPlayerIndex = currentRoom.players.findIndex(p => p.name === data.playerName);
            if (existingPlayerIndex >= 0) {
              console.log(`Player ${data.playerName} is reconnecting`);
              const existingPlayer = currentRoom.players[existingPlayerIndex];
              if (existingPlayer.ws && existingPlayer.ws.readyState === WebSocket.OPEN) {
                try {
                  existingPlayer.ws.send(JSON.stringify({ type: "system", content: "Connected from another location." }));
                  existingPlayer.ws.close();
                } catch (error) { console.error("Error closing existing connection:", error); }
              }
              existingPlayer.id = data.playerName; // Use name as ID for now
              existingPlayer.ws = ws;
              existingPlayer.disconnected = false;
              existingPlayer.lastReconnectTime = now;
              currentPlayer = existingPlayer;
              ws.roomId = roomId;
              ws.playerName = data.playerName;
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "joined", roomId, reconnected: true, playerDetails: { id: existingPlayer.id, name: existingPlayer.name, isPartyLeader: existingPlayer.isPartyLeader } }));
                const activePlayerList = currentRoom.players.filter(p => !p.disconnected).map(p => ({ id: p.id, name: p.name, score: p.score, isReady: p.isReady, isPartyLeader: p.isPartyLeader || false }));
                ws.send(JSON.stringify({ type: "playerList", players: activePlayerList }));
                ws.send(JSON.stringify({ type: "gameSettings", settings: currentRoom.settings }));
                if (currentRoom.isRoundActive) sendGameState(currentRoom, currentPlayer);
              }
              broadcastSystemMessage(currentRoom, `${currentPlayer.name} has reconnected`);

            } else {
              currentPlayer = {
                id: data.playerName, name: data.playerName, score: 0, ws, isReady: false, 
                correctGuess: false, isPartyLeader: currentRoom.players.length === 0, 
                lastReconnectTime: now, connectionTimestamp: now
              };
              ws.roomId = roomId;
              ws.playerName = data.playerName;
              currentRoom.players.push(currentPlayer);
               if (ws.readyState === WebSocket.OPEN) {
                 ws.send(JSON.stringify({ type: "joined", roomId, playerDetails: { id: currentPlayer.id, name: currentPlayer.name, isPartyLeader: currentPlayer.isPartyLeader } }));
                 const activePlayerList = currentRoom.players.filter(p => !p.disconnected).map(p => ({ id: p.id, name: p.name, score: p.score, isReady: p.isReady, isPartyLeader: p.isPartyLeader || false }));
                 ws.send(JSON.stringify({ type: "playerList", players: activePlayerList }));
                 ws.send(JSON.stringify({ type: "gameSettings", settings: currentRoom.settings }));
               }
               broadcastSystemMessage(currentRoom, `${currentPlayer.name} joined the game`);
               broadcastPlayerList(currentRoom); // Update list for others too
            }
            const activePlayerCount = currentRoom.players.filter(p => !p.disconnected).length;
            console.log(`Room ${roomId} now has ${activePlayerCount} active players`);
            break;
          }
          case "gameSettings": {
             if (!currentRoom || !currentPlayer || !currentPlayer.isPartyLeader) return;
             console.log(`Updating game settings for room ${currentRoom.roomId}`, data.settings);
             const newSettings = {
              timePerRound: Number(data.settings.timePerRound) || currentRoom.settings.timePerRound,
              maxRounds: Number(data.settings.maxRounds) || currentRoom.settings.maxRounds,
              customWords: Array.isArray(data.settings.customWords) ? data.settings.customWords : [],
              useOnlyCustomWords: data.settings.useOnlyCustomWords === true
            };
            if (newSettings.timePerRound < 30) newSettings.timePerRound = 30;
            if (newSettings.timePerRound > 180) newSettings.timePerRound = 180;
            if (newSettings.maxRounds < 1) newSettings.maxRounds = 1; 
            if (newSettings.maxRounds > 20) newSettings.maxRounds = 20;
            currentRoom.settings = newSettings;
            currentRoom.players.forEach(player => {
              if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({ type: "gameSettings", settings: newSettings }));
              }
            });
            broadcastSystemMessage(currentRoom, `Game settings updated by ${currentPlayer.name}`);
            break;
          }
          case "leave": {
             if (!currentRoom || !currentPlayer) return;
             console.log(`Player ${currentPlayer.name} leaving room ${currentRoom.roomId}`);
             handlePlayerLeave(ws); // Use the handler
             currentRoom = null;
             currentPlayer = null;
            break;
          }
          case "ready": {
             if (!currentRoom || !currentPlayer) return;
             currentPlayer.isReady = data.isReady !== undefined ? data.isReady : !currentPlayer.isReady;
             console.log(`Player ${currentPlayer.name} is now ${currentPlayer.isReady ? 'ready' : 'not ready'}`);
             broadcastSystemMessage(currentRoom, `${currentPlayer.name} is ${currentPlayer.isReady ? 'ready' : 'not ready'}`);
             broadcastPlayerList(currentRoom);
             if (checkAllPlayersReady(currentRoom)) {
               tryStartGame(currentRoom);
             }
            break;
          }
          case "pathStart":
          case "pathEnd":
          case "draw":
          case "clear": {
             if (!currentRoom || !currentPlayer || currentPlayer !== currentRoom.currentDrawer) return;
             const eventData = { ...data, timestamp: Date.now(), drawerId: currentPlayer.id };
             currentRoom.players.forEach(player => {
              if (player !== currentPlayer && player.ws && player.ws.readyState === WebSocket.OPEN) {
                try { player.ws.send(JSON.stringify(eventData)); } 
                catch (error) { console.error(`Error sending ${type} data to ${player.name}:`, error); }
              }
            });
            break;
          }
          case "guess": {
             if (!currentRoom || !currentPlayer) return;
             // Treat as chat if game not playing
             if (!currentRoom.currentWord || currentRoom.status !== 'playing') {
                const chatData = { type: "chat", id: `chat_${Date.now()}`, playerName: currentPlayer.name, content: data.guess || data.content, timestamp: Date.now() };
                currentRoom.players.forEach(p => { if (p.ws.readyState === WebSocket.OPEN) p.ws.send(JSON.stringify(chatData)); });
                return;
             }
             // Ignore guess if drawer or already guessed
             if (currentPlayer === currentRoom.currentDrawer || currentPlayer.correctGuess) {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "chat", id: `chat_${Date.now()}`, playerName: currentPlayer.name, content: data.guess || data.content, timestamp: Date.now() }));
                return;
             }
             const guess = (data.guess || data.content || "").toLowerCase().trim();
             const correctWord = currentRoom.currentWord.toLowerCase();
             const isCorrect = guess === correctWord;
             // Send private feedback to guesser
             if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: isCorrect ? "correct" : "chat", id: `${isCorrect ? 'correct' : 'chat'}_${Date.now()}`, playerName: currentPlayer.name, content: isCorrect ? `Correct: ${currentRoom.currentWord}!` : data.guess || data.content, timestamp: Date.now() }));
             // Broadcast incorrect guess notification
             if (!isCorrect) {
                currentRoom.players.forEach(player => { if (player !== currentPlayer && player.ws && player.ws.readyState === WebSocket.OPEN) player.ws.send(JSON.stringify({ type: "incorrectGuess", guesserName: currentPlayer.name })); });
             }
             if (isCorrect) {
                const guessTime = currentRoom.roundStartTime ? Math.floor((Date.now() - currentRoom.roundStartTime) / 1000) : currentRoom.settings.timePerRound - currentRoom.timeLeft;
                currentPlayer.guessTime = guessTime;
                currentPlayer.correctGuess = true;
                const timePercent = Math.max(0, Math.min(1, guessTime / currentRoom.settings.timePerRound));
                const speedBonus = Math.floor((1 - timePercent) * 20);
                const pointsEarned = 10 + speedBonus;
                currentPlayer.score = (currentPlayer.score || 0) + pointsEarned;
                if (currentRoom.currentDrawer) currentRoom.currentDrawer.score = (currentRoom.currentDrawer.score || 0) + 5;
                // Broadcast correct guess notification
                const guessNotification = { type: "playerGuessedCorrectly", guesser: currentPlayer.name, pointsEarned, totalScore: currentPlayer.score };
                currentRoom.players.forEach(player => { if (player.ws.readyState === WebSocket.OPEN) player.ws.send(JSON.stringify(guessNotification)); });
                if (checkAllPlayersGuessed(currentRoom)) {
                  broadcastSystemMessage(currentRoom, "Everyone guessed! Starting next round...");
                  endRound(currentRoom);
                }
             }
            break;
          }
          case "system": // Player sending a system message (treat as chat)
          case "chat": {
            if (!currentRoom || !currentPlayer) return;
            // Only allow chat in waiting state now
            if (currentRoom.status !== 'waiting') {
               console.log(`Player ${currentPlayer.name} tried to chat during active game.`);
               if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({type: "system", content: "Chat is disabled during the game."}))
               return; 
            }
            const messageId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const chatData = { type: "chat", id: messageId, playerName: currentPlayer.name, content: data.content || data.message, timestamp: Date.now() };
            currentRoom.players.forEach(player => { if (player.ws && player.ws.readyState === WebSocket.OPEN) player.ws.send(JSON.stringify(chatData)); });
            break;
          }
          case "startNewGameRequest": {
             if (!currentRoom || !currentPlayer) return;
             console.log(`${currentPlayer.name} requested to start new game`);
             if (!currentPlayer.isPartyLeader) {
               if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "system", content: "Only party leader can start new game." }));
               return;
             }
             const activePlayers = currentRoom.players.filter(p => !p.disconnected);
             if (activePlayers.length < 2) {
               if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "system", content: "Need at least 2 players." }));
               return;
             }
             console.log(`Starting new game initiated by ${currentPlayer.name}`);
             currentRoom.players.forEach(player => {
                player.score = 0;
                player.isReady = true;
                player.correctGuess = false;
                player.guessTime = undefined;
              });
              currentRoom.roundNumber = 0;
              currentRoom.status = 'playing';
              broadcastPlayerList(currentRoom);
              const gameStateUpdate = {
                type: "gameState",
                gameState: { status: 'playing', currentRound: 1, maxRounds: currentRoom.settings.maxRounds, timeLeft: currentRoom.settings.timePerRound }
              };
              currentRoom.players.forEach(player => { if (player.ws && player.ws.readyState === WebSocket.OPEN) player.ws.send(JSON.stringify(gameStateUpdate)); });
              broadcastSystemMessage(currentRoom, "Starting a new game!");
              setTimeout(() => startNewTurn(currentRoom), 2000);
            break;
          }
           default: 
             console.log("Received unknown message type:", type);
        }
      } catch (error) {
        console.error("Error processing message:", error, message.toString());
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "system", content: "Error processing your request." }));
        }
      }
    }); // End message handler

    ws.on('close', (code, reason) => {
      console.log(`Connection closed for ${ws.playerName || 'unknown player'}. Code: ${code}, Reason: ${reason}`);
      // Mark player as disconnected using the common handler
      handlePlayerLeave(ws); // ws still has roomId and playerName attached
      // Clear local refs just in case
      currentRoom = null;
      currentPlayer = null;
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for ${ws.playerName || 'unknown player'}:`, error);
      // Use the common handler on error too
      handlePlayerLeave(ws); 
      // Clear local refs just in case
      currentRoom = null;
      currentPlayer = null;
    });
  }); // End connection handler

  // --- Heartbeat and Cleanup --- 
  // Clean up disconnected players periodically
  const cleanupInterval = setInterval(() => {
    rooms.forEach(room => {
      const activePlayers = room.players.filter(player => player.ws && player.ws.readyState === WebSocket.OPEN && !player.disconnected);
      if (activePlayers.length < room.players.length) {
        console.log(`Cleaning ${room.players.length - activePlayers.length} stale players from room ${room.roomId}`);
        room.players = activePlayers;
         broadcastPlayerList(room); // Update list after cleanup
      }
      if (room.players.length === 0) {
        console.log(`Removing empty room ${room.roomId}`);
        if(room.roundTimer) clearInterval(room.roundTimer);
        rooms.delete(room.roomId);
      }
    });
  }, 60000); // Every minute

  // Set up interval for ping/pong heartbeat
  const heartbeatInterval = setInterval(() => {
    wssInstance.clients.forEach(ws => {
      // Ensure ws is a valid WebSocket client with isAlive property
      if (!ws || typeof ws.isAlive === 'undefined') return;
      
      if (ws.isAlive === false) {
        console.log(`Terminating inactive connection for ${ws.playerName || 'unknown'}`);
        return ws.terminate();
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (error) {
        console.error(`Error pinging ${ws.playerName || 'unknown'}:`, error);
        ws.terminate();
      }
    });
  }, 30000); // Check every 30 seconds

  // Clean up the intervals when the server is closed (this might not be called if process exits abruptly)
  wssInstance.on('close', () => {
    console.log('WebSocket server closing, clearing intervals.');
    clearInterval(heartbeatInterval);
    clearInterval(cleanupInterval);
  });

  console.log('WebSocket logic initialized and attached.');
  
  // Return functions that should be accessible to the server.js file
  return {
    getServerStats,
    getLeaderboard: () => getTopPlayers(),
    getActiveRoomsList
  };
}

// --- Removed Server Creation and Listening --- 
// const server = createServer(...);
// const wss = new WebSocketServer({ server });
// server.listen(...); 