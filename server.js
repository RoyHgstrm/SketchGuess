import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createWebSocketHandler } from "./websocket-server-vercel.js";

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

// Function to check if build directory exists and create it if needed
const ensureBuildDirectory = () => {
  const buildDir = path.join(__dirname, 'build');
  
  try {
    if (!fs.existsSync(buildDir)) {
      console.log('Build directory does not exist, creating it...');
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // Check for index.js file in build directory
    const indexPath = path.join(buildDir, 'index.js');
    if (!fs.existsSync(indexPath)) {
      console.log('Creating placeholder index.js in build directory...');
      
      // Create a minimal placeholder for the build file
      // This will be replaced by the actual build in production
      const placeholderContent = `
export const entry = { 
  module: { 
    default: () => null,
    ErrorBoundary: () => null,
    HydrateFallback: () => null,
    Layout: ({children}) => children,
    action: async ({request}) => new Response("OK"),
    loader: async ({request}) => ({ok: true})
  } 
};
export const routes = {
  root: {
    id: "root",
    path: "",
    module: { 
      default: () => null,
      ErrorBoundary: () => null,
      HydrateFallback: () => null,
      action: async ({request}) => new Response("OK"),
      loader: async ({request}) => ({ok: true})
    }
  },
  "routes/_index": {
    id: "routes/_index",
    path: "/",
    parentId: "root",
    module: { 
      default: () => null,
      ErrorBoundary: () => null,
      HydrateFallback: () => null,
      action: async ({request}) => new Response("OK"),
      loader: async ({request}) => ({ok: true})
    }
  }
};
export const assets = {
  entry: { module: [""] },
  routes: { root: { css: [] }, "routes/_index": { css: [] } }
};
export const future = { v2_dev: true, unstable_postcss: false, unstable_tailwind: false };
export const publicPath = "/build/";
export const assetsBuildDirectory = "public/build";
      `;
      fs.writeFileSync(indexPath, placeholderContent);
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring build directory exists:', error);
    return false;
  }
};

// Ensure build directory exists
ensureBuildDirectory();

// Create Express app
const app = express();

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Create dynamically loaded request handler
let build;
async function getBuild() {
  if (!build) {
    try {
      build = await import('./build/index.js');
      console.log('Build file loaded successfully:', Object.keys(build));
    } catch (error) {
      console.error('Error importing build:', error);
      // Create a minimal build object to prevent crashes with valid routes
      build = {
        entry: { 
          module: { 
            default: () => null,
            ErrorBoundary: () => null,
            HydrateFallback: () => null,
            Layout: ({children}) => children,
            action: async ({request}) => new Response("OK", {status: 200, statusText: "OK"}),
            loader: async ({request}) => ({ok: true})
          } 
        },
        routes: {
          root: {
            id: "root",
            path: "",
            module: { 
              default: () => null,
              ErrorBoundary: () => null,
              HydrateFallback: () => null,
              action: async ({request}) => new Response("OK", {status: 200, statusText: "OK"}),
              loader: async ({request}) => ({ok: true})
            }
          },
          "routes/_index": {
            id: "routes/_index",
            path: "/",
            parentId: "root",
            module: { 
              default: () => null,
              ErrorBoundary: () => null,
              HydrateFallback: () => null,
              action: async ({request}) => new Response("OK", {status: 200, statusText: "OK"}),
              loader: async ({request}) => ({ok: true})
            }
          }
        },
        assets: {
          entry: { module: [""] },
          routes: { root: { css: [] }, "routes/_index": { css: [] } }
        },
        future: { v2_dev: true, unstable_postcss: false, unstable_tailwind: false },
        publicPath: "/build/",
        assetsBuildDirectory: "public/build"
      };
    }
  }
  return build;
}

// Add a simple healthcheck endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Create Remix request handler that loads build dynamically
const getRequestHandler = async (req, res, next) => {
  try {
    const build = await getBuild();
    
    // Instead of using createRequestHandler directly, implement a custom version
    // that safely handles Response objects without statusText
    const customRequestHandler = (remixOptions) => {
      return async (req, res, next) => {
        try {
          const handleRequest = createRequestHandler(remixOptions);
          
          // Make a custom implementation of Express's response
          const originalEnd = res.end;
          const originalSetHeader = res.setHeader;
          const originalStatus = res.status;
          
          // Override methods to ensure we don't crash on null statusText
          res.setHeader = function(name, value) {
            if (name && value !== undefined) {
              return originalSetHeader.call(this, name, value);
            }
            return this;
          };
          
          res.status = function(code) {
            if (code && !isNaN(code)) {
              return originalStatus.call(this, code);
            }
            return this;
          };
          
          res.end = function(data, encoding) {
            try {
              return originalEnd.call(this, data, encoding);
            } catch (endError) {
              console.error('Error in res.end:', endError);
              if (!res.headersSent) {
                res.status(500).send('Internal Server Error');
              }
            }
          };
          
          // Now call the actual Remix handler with our enhanced response
          return await handleRequest(req, res, next);
        } catch (error) {
          console.error('Custom handler error:', error);
          
          // If this is a Response object with a missing statusText
          if (error && typeof error.status === 'number' && !error.statusText) {
            console.log(`Fixing Response without statusText (status ${error.status})`);
            
            // Don't try to set headers if they're already sent
            if (!res.headersSent) {
              try {
                // Set status code
                res.status(error.status || 500);
                
                // Set headers if they exist
                if (error.headers) {
                  for (const [key, value] of Object.entries(error.headers)) {
                    if (value !== undefined) {
                      res.setHeader(key, value);
                    }
                  }
                }
                
                // Send the response body or a default message
                const body = error.body || `Error ${error.status}`;
                return res.send(body);
              } catch (responseError) {
                console.error('Error creating response:', responseError);
                return res.status(500).send('Internal Server Error');
              }
            } else {
              console.log('Headers already sent, cannot fix response');
            }
          }
          
          // For other errors, pass to next error handler
          return next(error);
        }
      };
    };
    
    // Use our custom handler implementation
    return customRequestHandler({
      build,
      mode: process.env.NODE_ENV || 'production'
    })(req, res, next);
  } catch (error) {
    console.error('Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
};

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

// Improve debugging for Vercel
app.get('/_debug', (req, res) => {
  try {
    const debugInfo = {
      nodeEnv: process.env.NODE_ENV,
      dirname: __dirname,
      cwd: process.cwd(),
      buildExists: fs.existsSync(path.join(__dirname, 'build')),
      buildIndexExists: fs.existsSync(path.join(__dirname, 'build', 'index.js')),
      files: fs.readdirSync(__dirname),
      buildFiles: fs.existsSync(path.join(__dirname, 'build')) 
        ? fs.readdirSync(path.join(__dirname, 'build')) 
        : 'build dir not found',
      serverTime: new Date().toISOString()
    };
    res.json(debugInfo);
  } catch (error) {
    res.json({ error: error.message, stack: error.stack });
  }
});

// Handle all requests with the Remix handler
app.all("*", async (req, res, next) => {
  try {
    await getRequestHandler(req, res, next);
  } catch (error) {
    next(error);
  }
});

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

// Set up WebSocket server on the same HTTP server
createWebSocketHandler(server);

// Start server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server started on port ${port}`);
  console.log(`WebSocket server is also running on port ${port}`);
  
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