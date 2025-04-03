import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws'; // Import WebSocketServer
import path from 'path';
import { fileURLToPath } from 'url';
import { runWebSocketServerLogic } from './websocket-server.js'; // We'll need to export logic from websocket-server.js

installGlobals();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteDevServer =
  process.env.NODE_ENV === 'production'
    ? undefined
    : await import('vite').then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

// Revert to relative path import for production build
// const productionBuildPath = path.resolve(__dirname, 'build', 'server', 'index.js');

const remixHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule('virtual:remix/server-build')
    // @ts-ignore Import using the relative path again
    : await import('./build/server/index.js'),
});

const app = express();

// Handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // In production, assets are served from ./public/build
  // And the rest of the public assets from ./public
  app.use(
    '/build',
    express.static(path.join(__dirname, 'public', 'build'), {
      immutable: true,
      maxAge: '1y',
    })
  );
   app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
}

// Handle Remix requests
app.all('*', remixHandler);

const port = process.env.PORT || 3000;
const wsPort = process.env.WS_PORT || 8080; // We won't directly use this for listening
const host = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

// Create HTTP server using Express app
const server = http.createServer(app);

// --- WebSocket Server Integration ---
// Create a new WebSocket server instance attached to the *same* HTTP server
const wss = new WebSocketServer({ server }); // Attach to the existing HTTP server

console.log(`WebSocket server attaching to HTTP server on port ${port}`);

// Run the existing WebSocket server logic, passing the created wss instance
runWebSocketServerLogic(wss);
// ----------------------------------

server.listen(port, host, () => {
  console.log(`Express server listening on http://${host}:${port}`);
}); 