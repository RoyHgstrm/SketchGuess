import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import * as build from './build/index.js';
import { runWebSocketServerLogic } from './websocket-server.js';

// Install Remix globals
installGlobals();

// Create Express app
const app = express();

// Handle asset requests
app.use(
  '/build',
  express.static('public/build', { immutable: true, maxAge: '1y' })
);
app.use(express.static('public', { maxAge: '1h' }));

// Create Remix request handler
const requestHandler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV || 'production',
});

// Handle Remix requests
app.all('*', requestHandler);

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Initialize WebSocket server logic
runWebSocketServerLogic(wss);

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Export handler for Vercel
export default function vercelHandler(req, res) {
  // Check if it's a WebSocket upgrade request
  if (req.headers['upgrade']?.toLowerCase() === 'websocket') {
    // The actual WebSocket handling will be done by the upgrade event
    return server.emit('upgrade', req, req.socket, Buffer.from(''));
  }
  
  // Otherwise, handle regular HTTP requests with Express
  return app(req, res);
}

// Start server if not in serverless environment
if (typeof process.env.VERCEL === 'undefined') {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0';
  
  server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
} 