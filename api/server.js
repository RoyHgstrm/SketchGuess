import { createRequestHandler, broadcastDevReady } from '@remix-run/node';
import * as build from '../build/index.js';
import { WebSocketServer } from 'ws';
import { runWebSocketServerLogic } from '../websocket-server.js';

// Read the environment variables
const MODE = process.env.NODE_ENV || 'production';
const BUILD_PATH = '../build/index.js';
const PORT = process.env.PORT || 3000;

// Define request handler
const handleRequest = createRequestHandler({
  build,
  mode: MODE,
});

// Export handler for serverless environments
export default async function handler(req, res) {
  // Check if it's a WebSocket upgrade request
  if (req.headers['upgrade']?.toLowerCase() === 'websocket') {
    // If it's a WebSocket connection request, return a 101 response
    // Vercel will route the WebSocket connection to WebSockets API routes
    res.writeHead(101, {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
    });

    // Note: The actual WebSocket handling will be in api/websocket.js
    // Just need to return 101 response here to signal upgrade
    return res.end();
  }

  // Otherwise, handle HTTP requests with Remix
  try {
    const response = await handleRequest(req, res);
    return response;
  } catch (error) {
    console.error('Error handling request:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
    return res;
  }
}

// In development, notify the dev server once the server is ready
if (MODE === 'development') {
  broadcastDevReady(build);
}

// Start the server if not in serverless environment
if (typeof process.env.VERCEL === 'undefined') {
  const http = require('http');
  const server = http.createServer(handler);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server });
  runWebSocketServerLogic(wss);
  
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
} 