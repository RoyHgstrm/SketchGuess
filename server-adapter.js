// ESM imports
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Install Remix globals
installGlobals();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Create HTTP server for WebSocket support
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Import build asynchronously to avoid issues with Vercel's serverless environment
let build;

// Create minimal placeholder build if needed
const createPlaceholderBuild = () => {
  return {
    entry: { module: { default: () => null } },
    routes: {
      root: {
        id: "root",
        path: "",
        module: { default: () => null }
      },
      "routes/_index": {
        id: "routes/_index",
        path: "/",
        parentId: "root",
        module: { default: () => null }
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
};

// Function to ensure build directory exists
const ensureBuildDirectory = () => {
  try {
    const buildDir = path.join(__dirname, 'build');
    if (!fs.existsSync(buildDir)) {
      console.log('Build directory does not exist, creating it...');
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    const indexPath = path.join(buildDir, 'index.js');
    if (!fs.existsSync(indexPath)) {
      console.log('Creating placeholder index.js in build directory...');
      const placeholderContent = `
export const entry = { module: { default: () => null } };
export const routes = {
  root: {
    id: "root",
    path: "",
    module: { default: () => null }
  },
  "routes/_index": {
    id: "routes/_index",
    path: "/",
    parentId: "root",
    module: { default: () => null }
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

// Try to ensure the build directory exists
ensureBuildDirectory();

// Handle asset requests
app.use(
  '/build',
  express.static('public/build', { immutable: true, maxAge: '1y' })
);
app.use(express.static('public', { maxAge: '1h' }));

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Debug endpoint for troubleshooting 
app.get('/_debug', (req, res) => {
  try {
    const debugInfo = {
      nodeEnv: process.env.NODE_ENV,
      dirname: __dirname,
      cwd: process.cwd(),
      vercel: process.env.VERCEL,
      buildExists: fs.existsSync(path.join(__dirname, 'build')),
      buildIndexExists: fs.existsSync(path.join(__dirname, 'build', 'index.js')),
      buildLoaded: !!build,
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

// Initialize the WebSocket server logic
const initWebSocketLogic = async () => {
  try {
    // Dynamically import the WebSocket logic and build files
    const { runWebSocketServerLogic } = await import('./websocket-server.js');
    
    try {
      build = await import('./build/index.js');
      console.log('Build file loaded successfully');
    } catch (error) {
      console.error('Failed to load build file:', error);
      build = createPlaceholderBuild();
    }
    
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
      console.log('Build not loaded yet, trying to load...');
      try {
        build = await import('./build/index.js');
      } catch (error) {
        console.error('Failed to load build file on demand:', error);
        build = createPlaceholderBuild();
      }
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
  
  // Handle health check or debug endpoints
  if (req.url === '/health') {
    return res.status(200).send('OK');
  }
  
  if (req.url === '/_debug') {
    try {
      const debugInfo = {
        nodeEnv: process.env.NODE_ENV,
        dirname: __dirname,
        cwd: process.cwd(),
        vercel: process.env.VERCEL,
        buildExists: fs.existsSync(path.join(__dirname, 'build')),
        buildIndexExists: fs.existsSync(path.join(__dirname, 'build', 'index.js')),
        buildLoaded: !!build,
        files: fs.readdirSync(__dirname),
        buildFiles: fs.existsSync(path.join(__dirname, 'build')) 
          ? fs.readdirSync(path.join(__dirname, 'build'))
          : 'build dir not found',
        serverTime: new Date().toISOString()
      };
      return res.json(debugInfo);
    } catch (error) {
      return res.json({ error: error.message });
    }
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