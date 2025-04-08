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
export const entry = { 
  module: { 
    default: () => null,
    ErrorBoundary: () => null,
    HydrateFallback: () => null,
    Layout: ({children}) => children,
    action: async ({request}) => new Response("OK", {status: 200, statusText: "OK"}),
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
    
    // Implement custom handler that safely handles Response objects without statusText
    const customRequestHandler = (remixOptions) => {
      return async (req, res, next) => {
        try {
          const handleRequest = createRequestHandler(remixOptions);
          
          // Store original response methods to patch them
          const originalEnd = res.end;
          const originalSetHeader = res.setHeader;
          const originalStatus = res.status;
          
          // Override methods to ensure we don't crash on null statusText or undefined values
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
      mode: process.env.NODE_ENV || 'production',
    })(req, res, next);
    
  } catch (error) {
    console.error('Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
};

// Helper function to get status text for a status code
function getStatusText(status) {
  const statusTexts = {
    100: 'Continue',
    101: 'Switching Protocols',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    305: 'Use Proxy',
    307: 'Temporary Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable',
    417: 'Expectation Failed',
    418: "I'm a teapot",
    426: 'Upgrade Required',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported'
  };
  
  return statusTexts[status] || 'Unknown Status';
}

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