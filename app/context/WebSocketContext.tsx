import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

// Interface definitions
interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
  isDrawing: boolean;
  hasGuessedCorrectly: boolean;
  isPartyLeader: boolean;
}

interface GameState {
  status: 'waiting' | 'playing' | 'ended';
  currentRound: number;
  maxRounds: number;
  timeLeft: number;
  word?: string;
  drawer?: Player;
}

interface ChatMessage {
  id: string;
  type: 'system' | 'guess' | 'correct' | 'incorrect';
  playerName: string;
  content: string;
  timestamp: number;
}

interface DrawingData {
  type: 'draw' | 'clear';
  x?: number;
  y?: number;
  prevX?: number;
  prevY?: number;
  color?: string;
  lineWidth?: number;
  isNewLine?: boolean;
  drawerId?: string;
}

interface GameSettings {
  maxRounds: number;
  timePerRound: number;
  customWords: string[];
}

interface ExtendedWebSocket extends WebSocket {
  pingInterval?: NodeJS.Timeout | null;
  lastPongTime?: number;
}

// Add a new interface for leaderboard players
interface LeaderboardPlayer {
  id: string;
  name: string;
  score: number;
  isPartyLeader: boolean;
}

// Context interface
interface WebSocketContextType {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  
  // Game state
  players: Player[];
  messages: ChatMessage[];
  gameState: GameState | null;
  gameSettings: GameSettings;
  currentPlayer: Player | null;
  leaderboard: LeaderboardPlayer[] | null;
  
  // Actions
  connect: (roomId: string, playerName: string) => void;
  disconnect: () => void;
  sendMessage: (message: string) => void;
  handleDraw: (drawingData: DrawingData) => void;
  handleReady: () => void;
  updateGameSettings: (settings: GameSettings) => void;
  kickPlayer: (playerNameToKick: string) => void;
  startNewGame: () => void;
}

// Default game settings
const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxRounds: 3,
  timePerRound: 80,
  customWords: []
};

// Create the context with default values
export const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  connectionError: null,
  reconnectAttempts: 0,
  players: [],
  messages: [],
  gameState: null,
  gameSettings: DEFAULT_GAME_SETTINGS,
  currentPlayer: null,
  leaderboard: null,
  connect: () => {},
  disconnect: () => {},
  sendMessage: () => {},
  handleDraw: () => {},
  handleReady: () => {},
  updateGameSettings: () => {},
  kickPlayer: () => {},
  startNewGame: () => {}
});

// Update the getWebSocketURL function to better handle different environments
const getWebSocketURL = (roomId: string) => {
  try {
    // First check if we have an environment variable
    if (typeof process !== 'undefined' && process.env && process.env.WEBSOCKET_URL) {
      const baseUrl = process.env.WEBSOCKET_URL.endsWith('/') 
        ? process.env.WEBSOCKET_URL.slice(0, -1) 
        : process.env.WEBSOCKET_URL;
      
      console.log(`Using env WEBSOCKET_URL: ${baseUrl}`);
      return `${baseUrl}?roomId=${encodeURIComponent(roomId)}`;
    }
    
    // If not, derive from current window location
    if (typeof window !== 'undefined' && window.location) {
      // Get protocol (http -> ws, https -> wss)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Default to same host but different port
      const host = window.location.hostname;
      // Default WebSocket port is 8080
      const port = '8080';
      
      const baseUrl = `${protocol}//${host}:${port}`;
      console.log(`Derived WebSocket URL: ${baseUrl}`);
      return `${baseUrl}?roomId=${encodeURIComponent(roomId)}`;
    }
    
    // Fallback for all other cases
    console.log('Using fallback localhost WebSocket URL');
    return `ws://localhost:8080?roomId=${encodeURIComponent(roomId)}`;
  } catch (error) {
    console.error('Error constructing WebSocket URL:', error);
    // Fallback on error
    return `ws://localhost:8080?roomId=${encodeURIComponent(roomId)}`;
  }
};

// Hook to use the WebSocket context
export const useWebSocket = () => useContext(WebSocketContext);

// Provider component
export const WebSocketProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Game state
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[] | null>(null);
  
  // Player name storage
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  
  // Refs for managing WebSocket connection
  const wsRef = useRef<ExtendedWebSocket | null>(null);
  const manualDisconnectRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Improve the handleWebSocketMessage function to better handle player identity
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data.type);
      
      // Update last pong time when we receive a pong
      if (data.type === 'pong' && wsRef.current) {
        wsRef.current.lastPongTime = Date.now();
        return; // No need to process pongs further
      }
      
      switch (data.type) {
        case 'playerList':
          setPlayers(data.players || []);
          break;
        case 'playerUpdate':
          // This is a message specifically about the current player
          // Update current player reference with the verified data from server
          if (data.player) {
            console.log(`Setting current player: ${data.player.name} (ID: ${data.player.id})`);
            setCurrentPlayer(data.player);
          }
          break;
        case 'chat':
        case 'system':
        case 'correct':
        case 'incorrect':
          setMessages(prev => [...prev, {
            id: data.id || Date.now().toString(),
            type: data.type,
            playerName: data.playerName || 'System',
            content: data.content,
            timestamp: data.timestamp || Date.now()
          }]);
          break;
        case 'gameState':
          setGameState(data.gameState);
          break;
        case 'gameSettings':
          setGameSettings(data.settings);
          break;
        case 'gameLeaderboard':
          console.log('Received game leaderboard:', data.players);
          setLeaderboard(data.players);
          
          // Add system message about game end
          const leaderboardMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'system',
            playerName: 'System',
            content: data.message || 'Game has ended. Check the leaderboard for final scores.',
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, leaderboardMessage]);
          break;
        default:
          console.log('Unhandled message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }, []);

  // Improved heartbeat mechanism to detect connection issues
  const setupHeartbeat = useCallback((ws: ExtendedWebSocket) => {
    if (!ws) return;
    
    // Clear any existing ping interval
    if (ws.pingInterval) {
      clearInterval(ws.pingInterval);
    }
    
    // Last time we received a pong response
    ws.lastPongTime = Date.now();
    
    // Set up ping-pong to detect broken connections
    ws.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        // Check if we're still receiving pongs
        const timeSinceLastPong = Date.now() - (ws.lastPongTime || 0);
        if (timeSinceLastPong > 30000) {
          // No pong received for 30 seconds, connection is probably dead
          console.log("No pong response for 30s, closing connection");
          
          try {
            ws.close(1000, "Connection timeout");
          } catch (error) {
            console.error("Error closing timed out connection:", error);
          }
          
          // Clear the ping interval
          if (ws.pingInterval) {
            clearInterval(ws.pingInterval);
            ws.pingInterval = null;
          }
          
          return;
        }
        
        // Send a ping
        try {
          // Send a ping as JSON message (standard approach)
          ws.send(JSON.stringify({ type: "ping" }));
        } catch (error) {
          console.error("Error sending ping:", error);
        }
      } else {
        // Connection is not open, clear interval
        if (ws.pingInterval) {
          clearInterval(ws.pingInterval);
          ws.pingInterval = null;
        }
      }
    }, 15000); // Check every 15 seconds
  }, []);

  // Update the connect function to properly establish a connection
  const connect = useCallback((roomId: string, playerName: string) => {
    console.log(`Connecting to room ${roomId} as ${playerName}`);
    
    try {
      // Clean up any existing connections first
      if (wsRef.current) {
        console.log('Closing existing connection before reconnecting');
        wsRef.current.close();
        wsRef.current = null;
        
        // Clear any existing timers
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
      }
      
      // Generate WebSocket URL
      const wsUrl = getWebSocketURL(roomId);
      console.log(`Connecting to WebSocket URL: ${wsUrl}`);
      
      // Create a new WebSocket connection
      const ws = new WebSocket(wsUrl) as ExtendedWebSocket;
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('Connection timeout');
          setConnectionError('Connection timeout. Server might be down or unreachable.');
          ws.close();
          
          // Try to reconnect after a timeout
          scheduleReconnect(roomId, playerName);
        }
      }, 10000); // 10-second connection timeout
      
      // Handle connection open
      ws.onopen = () => {
        console.log('WebSocket connection established');
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
        
        // Store connection in ref
        wsRef.current = ws;
        
        // Send join message
        const joinMessage = {
          type: 'join',
          roomId,
          playerName
        };
        
        ws.send(JSON.stringify(joinMessage));
        
        // Start ping interval for maintaining connection
        startPingInterval(ws);
      };
      
      // Handle connection errors
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error. Please check your network connection.');
        
        // Try to reconnect after an error
        scheduleReconnect(roomId, playerName);
      };
      
      // Handle connection close
      ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        clearTimeout(connectionTimeout);
        
        setIsConnected(false);
        
        if (!manualDisconnectRef.current) {
          // Only add error message if it wasn't a manual disconnect
          if (event.code === 1000) {
            // Normal closure
            setConnectionError('Disconnected from server');
          } else if (event.code === 1001) {
            setConnectionError('Server is restarting');
          } else {
            setConnectionError('Connection closed unexpectedly');
          }
          
          // Try to reconnect
          scheduleReconnect(roomId, playerName);
        }
        
        // Clean up ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
      };
      
      // Handle incoming messages
      ws.onmessage = handleWebSocketMessage;
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setConnectionError(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      scheduleReconnect(roomId, playerName);
    }
  }, [handleWebSocketMessage]);

  // Function to start a ping interval to keep the connection alive
  const startPingInterval = (ws: WebSocket) => {
    // Clear any existing ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    
    // Start a new ping interval
    pingIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          // Send a ping message
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (error) {
          console.error('Error sending ping:', error);
        }
      }
    }, 30000); // Send ping every 30 seconds
  };

  // Function to schedule a reconnection attempt
  const scheduleReconnect = (roomId: string, playerName: string) => {
    if (reconnectAttempts >= 10) {
      console.log('Max reconnect attempts reached');
      setConnectionError('Unable to connect after multiple attempts. Please try refreshing the page.');
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000); // Exponential backoff capped at 30s
    console.log(`Scheduling reconnect attempt ${reconnectAttempts + 1} in ${delay}ms`);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      connect(roomId, playerName);
    }, delay);
  };

  // Improved disconnect function with proper cleanup
  const disconnect = useCallback(() => {
    // Set the manual disconnect flag to prevent automatic reconnection
    manualDisconnectRef.current = true;
    
    // Clear any pending reconnect attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset states
    setIsConnected(false);
    setReconnectAttempts(0);
    setConnectionError(null);
    setCurrentPlayer(null);
    setPlayers([]);
    setMessages([]);
    setGameState(null);
    setLeaderboard(null);
    
    // Close the WebSocket connection if it exists
    if (wsRef.current) {
      try {
        // Clean up ping interval
        if (wsRef.current.pingInterval) {
          clearInterval(wsRef.current.pingInterval);
          wsRef.current.pingInterval = null;
        }
        
        // Send a leave message before closing
        if (wsRef.current.readyState === WebSocket.OPEN && roomId && playerName) {
          console.log(`Sending leave message for room: ${roomId}, player: ${playerName}`);
          wsRef.current.send(JSON.stringify({
            type: "leave",
            roomId,
            playerName
          }));
        }
        
        // Close the connection
        wsRef.current.close(1000, "User disconnected");
        wsRef.current = null;
      } catch (error) {
        console.error("Error during disconnect:", error);
      }
    }
    
    // Clear stored room and player info
    setRoomId("");
    setPlayerName("");
    sessionStorage.removeItem("playerName");
  }, [roomId, playerName]);

  // Handler for sending chat messages
  const sendMessage = useCallback((messageText: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, can't send message");
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: "guess",
      roomId,
      playerName,
      guess: messageText
    }));
  }, [roomId, playerName]);

  // Handle drawing data
  const handleDraw = useCallback((drawingData: DrawingData) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, can't send drawing data");
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      ...drawingData,
      roomId
    }));
  }, [roomId]);

  // Handle ready state toggle
  const handleReady = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, can't toggle ready state");
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: "ready",
      roomId,
      playerName
    }));
  }, [roomId, playerName]);

  // Update game settings
  const updateGameSettings = useCallback((settings: GameSettings) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, can't update game settings");
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: "gameSettings",
      roomId,
      settings
    }));
    
    // Also update local settings
    setGameSettings(settings);
    
    // Add a notification message
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'system',
        playerName: 'System',
        content: 'Game settings have been updated',
        timestamp: Date.now()
      }
    ]);
  }, [roomId]);

  // Add the startNewGame function
  const startNewGame = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentPlayer?.isPartyLeader) {
      wsRef.current.send(JSON.stringify({
        type: 'startNewGame'
      }));
      
      // Clear leaderboard
      setLeaderboard(null);
      
      // Add notification
      setMessages(prev => [
        ...prev, 
        {
          id: Date.now().toString(),
          type: 'system',
          playerName: 'System',
          content: 'Starting a new game...',
          timestamp: Date.now()
        }
      ]);
    } else if (!currentPlayer?.isPartyLeader) {
      // Add notification that only the leader can start a new game
      setMessages(prev => [
        ...prev, 
        {
          id: Date.now().toString(),
          type: 'system',
          playerName: 'System',
          content: 'Only the party leader can start a new game',
          timestamp: Date.now()
        }
      ]);
    }
  }, [currentPlayer]);

  // Kick player function
  const kickPlayer = useCallback((playerNameToKick: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, can't kick player");
      return;
    }
    
    if (!currentPlayer?.isPartyLeader) {
      console.log("Only the party leader can kick players");
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: "kickPlayer",
      roomId,
      playerToKick: playerNameToKick
    }));
    
    // Add a notification message
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'system',
        playerName: 'System',
        content: `${playerNameToKick} has been kicked from the room`,
        timestamp: Date.now()
      }
    ]);
  }, [roomId, currentPlayer]);

  // Handle tab closing to gracefully disconnect
  const handleTabClose = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "leave",
        roomId,
        playerName
      }));
    }
  };

  // Set up beforeunload event listener to handle tab closing
  useEffect(() => {
    if (playerName && roomId) {
      window.addEventListener('beforeunload', handleTabClose);
      
      return () => {
        window.removeEventListener('beforeunload', handleTabClose);
      };
    }
  }, [playerName, roomId]);

  // Cleanup effect
  useEffect(() => {
    // Cleanup function for when component unmounts
    return () => {
      // Clean up any WebSocket connection
      if (wsRef.current) {
        // Clear any ping interval
        if (wsRef.current.pingInterval) {
          clearInterval(wsRef.current.pingInterval);
          wsRef.current.pingInterval = null;
        }
        
        // Close the connection
        try {
          const ws = wsRef.current;
          if (ws.readyState !== WebSocket.CLOSED) {
            manualDisconnectRef.current = true; // Prevent reconnection attempts
            ws.close(1000, "Component unmounted");
          }
        } catch (error) {
          console.error("Error closing WebSocket during cleanup:", error);
        }
      }
      
      // Clear any pending reconnect attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Context value
  const contextValue: WebSocketContextType = {
    isConnected,
    connectionError,
    reconnectAttempts,
    players,
    messages,
    gameState,
    gameSettings,
    currentPlayer,
    leaderboard,
    connect,
    disconnect,
    sendMessage,
    handleDraw,
    handleReady,
    updateGameSettings,
    kickPlayer,
    startNewGame
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;