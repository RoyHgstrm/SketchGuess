import { WebSocketServer } from 'ws';
import { runWebSocketServerLogic } from './websocket-server.js';

// Create a WebSocket server handler for integration with HTTP server
export function createWebSocketHandler(server) {
  const wss = new WebSocketServer({ 
    server,
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Other options settable:
      clientNoContextTakeover: true, // Defaults to negotiated value.
      serverNoContextTakeover: true, // Defaults to negotiated value.
      serverMaxWindowBits: 10, // Defaults to negotiated value.
      // Below options specified as default values.
      concurrencyLimit: 10, // Limits zlib concurrency for perf.
      threshold: 1024 // Size (in bytes) below which messages should not be compressed if context takeover is disabled.
    }
  });

  // Apply the WebSocket server logic
  runWebSocketServerLogic(wss);

  console.log('WebSocket server initialized');
  return wss;
} 