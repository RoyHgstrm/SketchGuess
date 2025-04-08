// ESM imports
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';

// Install Remix globals
installGlobals();

// Create Express app
const app = express();

// Create HTTP server for WebSocket support
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Import build asynchronously to avoid issues with Vercel's serverless environment
let build;

// Handle asset requests
app.use(
  '/build',
  express.static('public/build', { immutable: true, maxAge: '1y' })
);
app.use(express.static('public', { maxAge: '1h' }));

// Initialize the WebSocket server logic
const initWebSocketLogic = async () => {
  try {
    // Dynamically import the WebSocket logic and build files
    const { runWebSocketServerLogic } = await import('./websocket-server.js');
    build = await import('./build/index.js');
    
    // Initialize WebSocket handler
    runWebSocketServerLogic(wss);
    
    console.log('WebSocket server initialized successfully');
  } catch (error) {
    console.error('Failed to initialize WebSocket server:', error);
  }
};

// Initialize asynchronously
initWebSocketLogic();

// Create request handler function that waits for build to be loaded
const getRequestHandler = async (req, res, next) => {
  try {
    // If build hasn't loaded yet, wait briefly and try again
    if (!build) {
      console.log('Build not loaded yet, loading...');
      build = await import('./build/index.js');
    }
    
    // Create handler with loaded build
    const handler = createRequestHandler({
      build,
      mode: process.env.NODE_ENV || 'production',
    });
    
    return handler(req, res, next);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Export handler for Vercel
export default async function vercelHandler(req, res) {
  // Check if it's a WebSocket upgrade request
  if (req.headers['upgrade']?.toLowerCase() === 'websocket') {
    console.log('Handling WebSocket upgrade request');
    // The actual WebSocket handling will be done by the upgrade event
    return server.emit('upgrade', req, req.socket, Buffer.from(''));
  }
  
  // Otherwise, handle regular HTTP requests with Express
  console.log(`Handling HTTP request: ${req.method} ${req.url}`);
  return app(req, res);
}

// Apply routes after export
app.all('*', (req, res, next) => {
  getRequestHandler(req, res, next).catch(next);
});

// Start server if not in serverless environment
if (typeof process.env.VERCEL === 'undefined') {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0';
  
  server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
} 