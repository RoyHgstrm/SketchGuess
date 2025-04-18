import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import WebSocket server logic directly
import { 
  loadLeaderboard, 
  getTopPlayers, 
  DEFAULT_WORDS, 
  DEFAULT_SETTINGS,
  LEADERBOARD_FILE,
  runWebSocketServerLogic,
  // Import Handlers
  handleJoin,
  handleReady,
  handleGameSettings,
  handleLeave,
  handleDrawAction, // Combined handler for draw actions
  handleGuess,
  handleChat,
  handleStartNewGameRequest,
  handleKickPlayer,
  handlePlayerLeave // Separate handler for disconnects
} from './websocket-server.js';

installGlobals();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize state (Keep rooms map accessible)
const rooms = new Map(); 
let totalConnections = 0;
const startTime = Date.now(); // Use Date.now() for consistency
let leaderboard = loadLeaderboard() || [];

// Create Express app
const app = express();

// Handle asset requests
app.use(
  '/build',
  express.static('public/build', { immutable: true, maxAge: '1y' })
);
app.use(express.static('public', { maxAge: '1h' }));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server attached to the HTTP server
// This is the critical part - the WebSocket server shares the same HTTP server instance
const wss = new WebSocketServer({ server });

// Initialize only the background tasks (heartbeat, cleanup) from websocket-server
// We need access to the global `rooms` map for stats
const { getServerStats, getActiveRoomsList } = runWebSocketServerLogic(wss);
console.log('WebSocket background logic initialized.');

// Admin API endpoints using functions returned or accessible
app.get('/api/stats', (req, res) => {
  const stats = getServerStats();
  // Add the default words list to the stats response
  const statsWithWords = {
    ...stats,
    defaultWords: DEFAULT_WORDS // Include the imported default words
  };
  console.log("Serving stats (including default words):", statsWithWords);
  res.json(statsWithWords); // Send the combined object
});

app.get('/api/leaderboard', (req, res) => {
  const top = getTopPlayers();
  console.log(`Serving top ${top.length} players`);
  res.json(top);
});

app.get('/api/rooms', (req, res) => {
  // Implement getActiveRoomsList logic directly
  const activeRoomsData = [];
  rooms.forEach((room, roomId) => {
    const activePlayers = room.players.filter(p => !p.disconnected);
    if (activePlayers.length > 0) {
      activeRoomsData.push({
        roomId,
        playerCount: activePlayers.length,
        isActive: room.status === 'playing',
        currentTurn: room.status === 'playing' ? room.currentTurn : 0,
        maxTurns: room.status === 'playing' ? room.maxTurns : (room.settings.maxCycles * activePlayers.length),
        timeLeft: room.gameState?.timeLeft || 0,
        players: activePlayers.map(p => ({
          name: p.name,
          score: p.score || 0,
          isReady: p.isReady,
          isDrawing: p.isDrawing,
          hasGuessedCorrectly: p.hasGuessedCorrectly
        })),
        settings: {
          maxCycles: room.settings.maxCycles,
          timePerRound: room.settings.timePerRound,
          customWords: room.settings.customWords || null,
          useOnlyCustomWords: room.settings.useOnlyCustomWords || false
        }
      });
    }
  });
  console.log(`Serving ${activeRoomsData.length} active rooms`);
  res.json(activeRoomsData);
});

// Handle Remix requests
app.all(
  '*',
  createRequestHandler({
    build: await import('./build/index.js')
  })
);

// WebSocket connection handling directly in server.js
wss.on('connection', (ws, req) => {
  totalConnections++;
  console.log(`Client connected. Total connections: ${totalConnections}`);
  console.log("New connection attempt from", req?.socket?.remoteAddress || 'unknown');

  // Attach properties to ws instance
  ws.roomId = null; 
  ws.playerId = null;
  ws.playerName = null; 
  ws.isAlive = true;

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const type = message.type;

      // Route message to the appropriate handler
      switch (type) {
        case 'join':
          handleJoin(ws, message, rooms, totalConnections); // Pass rooms map and counter
          break;
        case 'ready':
          handleReady(ws, message, rooms);
          break;
        case 'gameSettings':
        case 'updateSettings':
          handleGameSettings(ws, message, rooms);
          break;
        case 'leave':
          handleLeave(ws, rooms);
          break;
        case 'draw':
        case 'clear':
        case 'pathStart':
        case 'pathEnd':
          handleDrawAction(ws, message, rooms);
          break;
        case 'guess':
          handleGuess(ws, message, rooms);
          break;
        case 'chat':
        case 'system': // Treat player-sent system messages as chat
          handleChat(ws, message, rooms);
          break;
        case 'startNewGameRequest':
          handleStartNewGameRequest(ws, message, rooms);
          break;
        case 'kickPlayer':
          handleKickPlayer(ws, message, rooms);
          break;
        default:
          console.log(`Received unknown message type: '${type}'`);
          if (ws.readyState === WebSocket.OPEN) {
             ws.send(JSON.stringify({ type: "error", content: "Unknown command." }));
          }
      }
    } catch (err) {
      console.error('Error processing message:', err, data.toString());
      if (ws.readyState === WebSocket.OPEN) {
         ws.send(JSON.stringify({ type: "error", content: "Failed to process message." }));
      }
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`Connection closed for ${ws.playerName || ws.playerId || 'unknown'}. Code: ${code}, Reason: ${reason}`);
    handlePlayerLeave(ws, rooms); // Call the imported handler
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${ws.playerName || ws.playerId || 'unknown'}:`, error);
    handlePlayerLeave(ws, rooms); // Call the imported handler
  });
});

// Start server
const PORT = process.env.PORT || 3000; // Use the environment variable or default to 3000
if (!PORT) {
  console.error("FATAL ERROR: PORT environment variable is not set.");
  process.exit(1); // Exit if the PORT variable is missing
}

const HOST = process.env.HOST || '0.0.0.0';

server.listen(Number(PORT), HOST, () => { // Ensure PORT is treated as a number
  console.log(`Integrated server running on ${HOST}:${PORT}`);
  console.log(`WebSocket server is running on the same port (${PORT})`);
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    wss.close(() => { // Close WebSocket server first
      console.log('WebSocket server closed.');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    });
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
     wss.close(() => {
      console.log('WebSocket server closed.');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    });
  });
}); 