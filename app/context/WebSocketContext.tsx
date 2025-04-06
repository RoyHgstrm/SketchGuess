import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

// Interface definitions
interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
  hasGuessedCorrectly: boolean;
  isPartyLeader: boolean;
}

interface GameState {
  status: string;
  currentRound: number;
  maxRounds: number;
  totalTurns?: number;
  timeLeft: number;
  word?: string;
  drawer?: {
    id: string;
    name: string;
  };
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
  useOnlyCustomWords?: boolean;
}

interface ExtendedWebSocket extends WebSocket {
  pingInterval?: NodeJS.Timeout | null;
  lastPongTime?: number;
  isReconnecting?: boolean;
  roomId?: string;
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
  isReconnecting: boolean;
  
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
  retryConnection: () => void;
}

// Default game settings
const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxRounds: 3,
  timePerRound: 60,
  customWords: [],
  useOnlyCustomWords: false
};

// Create the context with default values
export const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  connectionError: null,
  reconnectAttempts: 0,
  isReconnecting: false,
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
  startNewGame: () => {},
  retryConnection: () => {}
});

// Update the getWebSocketURL function to better handle different environments
const getWebSocketURL = (roomId: string) => {
  try {
    // --- DEVELOPMENT --- 
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // Use the window location's hostname and port 3000 (since both HTTP and WS are on same port now)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const url = `${protocol}//${host}:3000`;
      console.log("Using WebSocket URL from window location:", url);
      return `${url}?roomId=${encodeURIComponent(roomId)}`;
    }

    // --- PRODUCTION / OTHER --- 
    // For production, always derive from current window location
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      // Use the same port as the web page is served from
      const port = window.location.port;
      const url = `${protocol}//${host}${port ? `:${port}` : ''}`;
      console.log("Using WebSocket URL derived from window location:", url);
      return `${url}?roomId=${encodeURIComponent(roomId)}`;
    }

    // Fallback (should ideally not be reached in prod)
    console.warn("WebSocket URL determination falling back to default");
    return `ws://localhost:3000?roomId=${encodeURIComponent(roomId)}`;
  } catch (error) {
    console.error("Error determining WebSocket URL:", error);
    // Critical Fallback
    return `ws://localhost:3000?roomId=${encodeURIComponent(roomId)}`;
  }
};

// Hook to use the WebSocket context
export const useWebSocket = () => useContext(WebSocketContext);

// Provider component
export const WebSocketProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[] | null>(null);
  
  // Player name and ID storage
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  
  // Refs for managing WebSocket connection
  const wsRef = useRef<ExtendedWebSocket | null>(null);
  const manualDisconnectRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Add reconnection throttling to prevent excessive reconnections
  const lastReconnectAttemptRef = useRef<number>(0);
  const reconnectThrottleTimeRef = useRef<number>(1000); // Start with 1 second
  const reconnectAttemptsRef = useRef<number>(0);
  // Add a cool-down for reconnection
  const inCooldownRef = useRef(false);
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track connection issues
  const consecutiveFailuresRef = useRef(0);
  
  // Add a connection attempt debounce mechanism
  const connectDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionInProgressRef = useRef(false);
  
  // Track last few connections to detect connection bursts
  const recentConnectionAttemptsRef = useRef<number[]>([]);
  const MAX_RECENT_CONNECTIONS = 5;
  const MIN_CONNECTION_INTERVAL_MS = 500; // 500ms between connections
  
  // Function to track connection attempts and detect if connecting too frequently
  const isConnectingTooFrequently = useCallback(() => {
    const now = Date.now();
    
    // Clean up old connection attempts (older than 60 seconds)
    recentConnectionAttemptsRef.current = recentConnectionAttemptsRef.current.filter(
      timestamp => now - timestamp < 60000
    );
    
    // If we have max recent connections, check the timestamps
    if (recentConnectionAttemptsRef.current.length >= MAX_RECENT_CONNECTIONS) {
      // Get the oldest timestamp from the recent connections
      const oldestTimestamp = Math.min(...recentConnectionAttemptsRef.current);
      const timeWindow = now - oldestTimestamp;
      
      // Less restrictive: Only throttle if we've made 5 or more connections in less than 3 seconds
      if (timeWindow < 3000) {
        console.warn(`Too many connection attempts: ${recentConnectionAttemptsRef.current.length} in ${timeWindow}ms`);
        return true;
      }
    }
    
    // Also check if the most recent connection was too soon
    if (recentConnectionAttemptsRef.current.length > 0) {
      const mostRecentTimestamp = Math.max(...recentConnectionAttemptsRef.current);
      const timeSinceLastConnect = now - mostRecentTimestamp;
      
      // Less restrictive: Allow connections every 500ms instead of 2000ms
      if (timeSinceLastConnect < 500) {
        console.warn(`Connection attempt too soon after previous: ${timeSinceLastConnect}ms`);
        return true;
      }
    }
    
    // If we're in cooldown, that's also too frequent
    if (inCooldownRef.current) {
      console.warn('Connection attempt during cooldown period');
      return true;
    }
    
    // If we got here, connection frequency is acceptable
    return false;
  }, []);
  
  // Function to record a connection attempt
  const recordConnectionAttempt = useCallback(() => {
    recentConnectionAttemptsRef.current.push(Date.now());
    
    // Keep only the most recent MAX_RECENT_CONNECTIONS attempts
    if (recentConnectionAttemptsRef.current.length > MAX_RECENT_CONNECTIONS) {
      recentConnectionAttemptsRef.current.shift();
    }
  }, []);
  
  // Add effect to load playerId from sessionStorage on initial mount
  useEffect(() => {
    const storedId = sessionStorage.getItem('playerId');
    if (storedId) {
      console.log('CLIENT DEBUG: Restoring playerId from sessionStorage:', storedId);
      setPlayerId(storedId);
    }
  }, []);

  // Update the handleWebSocketMessage function to properly handle pings
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data.type);
      
      // Immediate response to ping messages with a pong
      if (data.type === 'ping') {
        console.log('Received ping, sending pong response');
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ 
            type: 'pong',
            timestamp: data.timestamp,
            clientTimestamp: Date.now()
          }));
        }
        return; // Don't process ping messages further
      }
      
      // Update last pong time when we receive any message
      if (wsRef.current) {
        wsRef.current.lastPongTime = Date.now();
      }
      
      // Regular message handling
      switch (data.type) {
        case 'playerList':
          const newPlayers: Player[] = data.players || [];
          setPlayers(newPlayers);
          
          // Use the playerId from state first, then sessionStorage as fallback
          const idToFind = playerId || sessionStorage.getItem('playerId');
          console.log(`CLIENT DEBUG: Updating currentPlayer based on playerList. Using ID: ${idToFind}`);

          if (idToFind && newPlayers.length > 0) {
            const me = newPlayers.find((p: Player) => {
              // Log the comparison being made
              // console.log(`CLIENT DEBUG: Comparing find: p.id (${p.id}) === idToFind (${idToFind})`);
              return p.id === idToFind;
            });
            if (me) {
              const updatedCurrentPlayer: Player = {
                id: me.id,
                name: me.name,
                score: me.score || 0,
                isReady: me.isReady || false,
                hasGuessedCorrectly: me.hasGuessedCorrectly || false,
                isPartyLeader: me.isPartyLeader || false
              };
              // Avoid unnecessary state updates if object is identical (shallow compare)
              setCurrentPlayer(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(updatedCurrentPlayer)) {
                    console.log('CLIENT DEBUG: currentPlayer updated in playerList handler:', updatedCurrentPlayer);
                    return updatedCurrentPlayer;
                }
                return prev;
              });
            } else {
              console.warn(`CLIENT WARN: Current player ID ${idToFind} not found in received playerList. currentPlayer state might be stale.`);
              // setCurrentPlayer(null); // Avoid setting to null if player briefly disappears
              // console.log('CLIENT DEBUG: currentPlayer set to null in playerList handler');
            }
          } else if (newPlayers.length === 0) {
             console.log('CLIENT DEBUG: Received empty playerList. Setting players to empty array.');
            // setCurrentPlayer(null); // Avoid setting to null
            // console.log('CLIENT DEBUG: currentPlayer set to null (empty playerList)');
          }
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
          console.log('Received chat message:', data);
          setMessages(prev => [...prev, {
            id: data.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: data.type,
            playerName: data.playerName || 'System',
            content: data.content,
            timestamp: data.timestamp || Date.now()
          }]);
          break;
        case 'gameState': {
          // Update the gameState by merging new data with previous state
          setGameState(prevState => {
            const newState = {
              ...(prevState || {}), // Keep existing state
              ...(data.gameState || {}) // Overwrite with new data
            };
            console.log('CLIENT DEBUG: Updated gameState:', newState);
            return newState;
          });
          
          // Check for player identification info in the gameState message
          if (data.playerInfo) {
            console.log('CLIENT DEBUG: Received playerInfo in gameState message:', data.playerInfo);
            // Update currentPlayer with the server's direct identification
            setCurrentPlayer(prev => {
              // Create updated player data from direct server identification
              // plus any existing state we want to preserve
              const updatedPlayer: Player = {
                id: data.playerInfo.id,
                name: data.playerInfo.name,
                score: prev?.score || 0,
                isReady: prev?.isReady || false,
                hasGuessedCorrectly: prev?.hasGuessedCorrectly || false,
                isPartyLeader: data.playerInfo.isPartyLeader || false
              };
              
              // Only update if ID actually changed to avoid loops
              if (!prev || prev.id !== updatedPlayer.id || prev.name !== updatedPlayer.name || prev.isPartyLeader !== updatedPlayer.isPartyLeader) {
                console.log('CLIENT DEBUG: Updating currentPlayer from gameState playerInfo:', updatedPlayer);
                // Also update the stored player ID
                if (updatedPlayer.id && updatedPlayer.id !== playerId) {
                  console.log(`CLIENT DEBUG: Updating stored player ID from ${playerId} to ${updatedPlayer.id}`);
                  setPlayerId(updatedPlayer.id);
                  sessionStorage.setItem('playerId', updatedPlayer.id);
                }
                return updatedPlayer;
              }
              return prev; // No change needed
            });
          }
          
          break;
        }
        case 'gameSettings':
          setGameSettings(data.settings);
          break;
        case 'gameLeaderboard':
          console.log('Received game leaderboard:', data.players);
          setLeaderboard(data.players || []);
          
          // Optionally, add a system message if one wasn't provided by the server
          if (data.message) {
            const leaderboardMessage: ChatMessage = {
              id: `leaderboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'system',
              playerName: 'System',
              content: data.message,
              timestamp: Date.now()
            };
            setMessages(prev => [...prev, leaderboardMessage]);
          }
          // Game state should be updated separately by the 'gameState' message with status 'ended'
          break;
        case 'clear':
          // Canvas clearing event is handled by the DrawingCanvas component
          // Dispatch a custom event so DrawingCanvas can handle it
          if (typeof window !== 'undefined') {
            console.log('Dispatching clear canvas event');
            window.dispatchEvent(new CustomEvent('drawing-data', { 
              detail: { ...data, type: 'clear' }
            }));
          }
          break;
        case 'draw':
          // Drawing data from the server
          // Forward it to the DrawingCanvas component via a custom event
          if (typeof window !== 'undefined') {
            console.log('Dispatching drawing data event:', data);
            // Ensure timestamp is present and use current time if not
            if (!data.timestamp) {
              data.timestamp = Date.now();
            }
            window.dispatchEvent(new CustomEvent('drawing-data', { 
              detail: data
            }));
          }
          break;
        case 'drawerWord':
          // Handle word to draw for the current drawer
          console.log('Received word to draw:', data.word);
          // Add the word to the game state
          setGameState(prevState => {
            if (!prevState) return prevState;
            return {
              ...prevState,
              word: data.word,
            };
          });
          // Also add a system message
          setMessages(prev => [...prev, {
            id: `drawerWord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'system',
            playerName: 'System',
            content: data.content || `Your word to draw is: ${data.word}`,
            timestamp: Date.now()
          }]);
          break;
        case 'timeUpdate':
          // Update the game state with the new time
          setGameState(prevState => {
            if (!prevState) return prevState;
            
            return {
              ...prevState,
              timeLeft: data.timeLeft
            };
          });
          break;
        case 'error':
          // Handle server error messages
          console.error('Server error:', data.message || data.content);
          setConnectionError(data.message || data.content || 'Unknown server error');
          
          // Add error message to chat for visibility
          setMessages(prev => [...prev, {
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'system',
            playerName: 'System',
            content: data.message || data.content || 'Unknown server error',
            timestamp: Date.now()
          }]);
          break;
        case 'joined': {
          console.log('Successfully joined room:', data.roomId);
          
          // Reset connection errors and attempts on successful join
          setConnectionError(null);
          reconnectAttemptsRef.current = 0;
          setReconnectAttempts(0);
          consecutiveFailuresRef.current = 0;
          setIsReconnecting(false);

          // Set the current player AND store the received player ID
          if (data.playerDetails) {
            const receivedPlayerId = data.playerDetails.id;
            console.log('CLIENT DEBUG: Received playerDetails in joined handler:', data.playerDetails);
            if (!receivedPlayerId) {
               console.error('CLIENT ERROR: Received playerDetails but ID is missing!', data.playerDetails);
               return; // Stop processing if ID is missing
            }
            console.log(`CLIENT DEBUG: Setting player ID state to: ${receivedPlayerId}`);
            setPlayerId(receivedPlayerId);
            sessionStorage.setItem('playerId', receivedPlayerId);
            console.log(`CLIENT DEBUG: Stored playerId in sessionStorage: ${receivedPlayerId}`);

            const newCurrentPlayer: Player = {
              id: receivedPlayerId,
              name: data.playerDetails.name,
              score: data.playerDetails.score || 0,
              isReady: data.playerDetails.isReady || false,
              hasGuessedCorrectly: false,
              isPartyLeader: data.playerDetails.isPartyLeader || false
            };
            setCurrentPlayer(newCurrentPlayer);
            console.log('CLIENT DEBUG: currentPlayer set in joined handler:', newCurrentPlayer);
          } else {
             console.warn('CLIENT WARN: Joined message missing playerDetails. Player ID might be incorrect.');
            // Fallback logic removed as it was problematic and ID should come from server
          }
          break;
        }
        case 'incorrectGuess':
          setMessages(prev => [...prev, {
            id: `incorrect_${data.guesserName}_${Date.now()}`,
            type: 'system', // Display as a system message
            playerName: 'System',
            content: `${data.guesserName} guessed incorrectly.`,
            timestamp: Date.now()
          }]);
          break;
        default:
          console.log('Unhandled message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }, [playerId, setCurrentPlayer, setPlayers, setPlayerId]); // Add setPlayerId dependency

  // Manual retry function for when automatic reconnects fail
  const retryConnection = useCallback(() => {
    // Don't retry if we don't have credentials
    if (!roomId || !playerName) {
      console.error("Cannot retry: Missing roomId or playerName");
      return;
    }
    
    // Exit any cooldown state
    if (inCooldownRef.current) {
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
        cooldownTimeoutRef.current = null;
      }
      inCooldownRef.current = false;
    }
    
    // Reset connection state
    consecutiveFailuresRef.current = 0;
    reconnectThrottleTimeRef.current = 1000;
    setReconnectAttempts(0);
    setConnectionError(null);
    setIsReconnecting(true);
    
    // Attempt to connect
    console.log("Manual connection retry initiated");
    connect(roomId, playerName);
  }, [roomId, playerName]);
  
  // Track reconnecting state
  useEffect(() => {
    // Set reconnecting state based on reconnect attempts
    if (reconnectAttempts > 0 && !isConnected) {
      setIsReconnecting(true);
    } else if (isConnected) {
      setIsReconnecting(false);
    }
  }, [reconnectAttempts, isConnected]);

  // Function to put connection into cooldown
  const enterCooldownMode = useCallback((duration: number) => {
    inCooldownRef.current = true;
    
    // Clear any existing cooldown
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
    }
    
    console.log(`Entering connection cooldown for ${duration/1000} seconds`);
    
    // Set a timeout to exit cooldown mode
    cooldownTimeoutRef.current = setTimeout(() => {
      console.log('Exiting connection cooldown mode');
      inCooldownRef.current = false;
      cooldownTimeoutRef.current = null;
      
      // Also update UI to indicate cooldown is done
      setConnectionError(prev => 
        prev && prev.includes("throttled") 
          ? "Connection cooldown period ended. You can retry connecting now." 
          : prev
      );
    }, duration);
  }, []);

  // Improved scheduleReconnect function - REPLACING the existing one
  const scheduleReconnect = useCallback((roomId: string, playerName: string) => {
    if (!roomId || !playerName) {
      setConnectionError('Missing room ID or player name');
      return;
    }

    // Don't schedule reconnect if manually disconnected
    if (manualDisconnectRef.current) {
      console.log('Manual disconnect flag set, not scheduling reconnect');
      return;
    }
    
    // Don't schedule reconnect if in cooldown
    if (inCooldownRef.current) {
      console.log('In connection cooldown, not scheduling reconnect');
      return;
    }

    // Clear any existing reconnect attempt
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Calculate backoff time with exponential increase
    const nextReconnectAttempt = reconnectAttemptsRef.current + 1;
    const baseDelay = 1000; // Start with 1 second
    const maxDelay = 30000; // Max 30 seconds
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s, ...
    const backoffTime = Math.min(baseDelay * Math.pow(2, nextReconnectAttempt - 1), maxDelay);
    
    console.log(`Scheduling reconnect in ${backoffTime/1000} seconds (attempt ${nextReconnectAttempt})`);
    setIsReconnecting(true);
    
    // Add a system message about reconnection
    setMessages(prev => [...prev, {
      id: `reconnect_scheduled_${Date.now()}`,
      type: 'system',
      playerName: 'System',
      content: `Reconnecting in ${Math.ceil(backoffTime/1000)} seconds (attempt ${nextReconnectAttempt}/10)...`,
      timestamp: Date.now()
    }]);
    
    // Stop after 10 reconnect attempts and enter cooldown
    if (nextReconnectAttempt > 10) {
      console.log('Maximum reconnect attempts reached (10), entering cooldown');
      setConnectionError('Unable to establish a stable connection after multiple attempts. Please refresh the page or try again later.');
      setIsReconnecting(false);
      enterCooldownMode(120000); // 2 minute cooldown
      return;
    }
    
    // Schedule the reconnect with exponential backoff
    reconnectTimeoutRef.current = setTimeout(() => {
      // Update attempt counter
      reconnectAttemptsRef.current = nextReconnectAttempt;
      setReconnectAttempts(nextReconnectAttempt);
      
      // Attempt reconnection if not connected, not manually disconnected, and not in cooldown
      if (!isConnected && !manualDisconnectRef.current && !inCooldownRef.current) {
        console.log(`Attempting reconnect ${nextReconnectAttempt}/10...`);
        connect(roomId, playerName);
      }
    }, backoffTime);
  }, [isConnected, enterCooldownMode]);

  // Improved connect function - REPLACING the existing one
  const connect = useCallback((roomId: string, playerName: string) => {
    if (!roomId || !playerName) {
      console.error('Missing roomId or playerName');
      setConnectionError('Missing room information');
      return;
    }

    // Store room and player name
    setRoomId(roomId);
    setPlayerName(playerName);
    
    // Retrieve stored playerId for reconnection attempts
    const storedPlayerId = playerId || sessionStorage.getItem('playerId');
    console.log(`Connect called. Room: ${roomId}, Name: ${playerName}, Stored ID: ${storedPlayerId}`);
    setPlayerId(storedPlayerId); // Ensure state reflects storage

    // Check if we're connecting too frequently
    if (isConnectingTooFrequently()) {
      console.log('Connecting too frequently, enforcing client-side cooldown');
      setConnectionError('Connecting too frequently. Please wait a moment before trying again.');
      
      // Enforce a cooldown period
      if (!inCooldownRef.current) {
        enterCooldownMode(3000);
      }
      
      return;
    }

    // Record this connection attempt
    recordConnectionAttempt();

    // If a connection attempt is already in progress, don't start another
    if (connectionInProgressRef.current) {
      console.log('Connection already in progress, skipping...');
      return;
    }

    // Prevent making a new connection if we have a valid one
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      
      // Re-send join message to ensure we're properly registered
      try {
        console.log('Re-sending join message');
        wsRef.current.send(JSON.stringify({
          type: 'join',
          roomId,
          playerName,
          playerId: storedPlayerId
        }));
        return;
      } catch (error) {
        console.error('Error re-sending join message:', error);
        // Continue to create a new connection if sending failed
      }
    }

    // Set connection in progress flag
    connectionInProgressRef.current = true;

    // Clear any existing connection
    if (wsRef.current) {
      try {
        console.log('Closing existing connection before creating a new one');
        wsRef.current.close(1000, "Reconnecting");
      } catch (error) {
        console.error('Error closing existing connection:', error);
      }
      wsRef.current = null;
    }

    try {
      console.log(`Creating new WebSocket connection to ${getWebSocketURL(roomId)}`);
      
      // Create WebSocket with proper error handling
      const ws = new WebSocket(getWebSocketURL(roomId)) as ExtendedWebSocket;
      wsRef.current = ws;
      
      // Track room and player info
      ws.roomId = roomId;
      
      // Handle connection opened
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        
        setConnectionError(null);
        setIsConnected(true);
        connectionInProgressRef.current = false;
        
        // Reset reconnection state
        reconnectAttemptsRef.current = 0;
        setReconnectAttempts(0);
        consecutiveFailuresRef.current = 0;
        reconnectThrottleTimeRef.current = 1000;
        
        // Reset manual disconnect flag when successfully connecting
        manualDisconnectRef.current = false;
        
        // Ensure connection error is cleared on successful connection
        setTimeout(() => {
          setConnectionError(null);
        }, 100);
        
        // Send join message with playerId if available
        try {
          const joinMessage = {
            type: 'join',
            roomId,
            playerName,
            playerId: storedPlayerId
          };
          console.log("Sending join message:", joinMessage);
          ws.send(JSON.stringify(joinMessage));
        } catch (error) {
          console.error('Error sending join message:', error);
        }
      };

      // Handle incoming messages
      ws.onmessage = handleWebSocketMessage;

      // Handle connection closed
      ws.onclose = (event) => {
        console.log(`WebSocket closed: code=${event.code}, reason=${event.reason || 'No reason'}`);
        
        setIsConnected(false);
        connectionInProgressRef.current = false;
        
        // Check for throttling close code (4000)
        if (event.code === 4000 && event.reason === "Connection throttled") {
          console.log('Connection throttled by server, entering cooldown');
          setConnectionError(`Connection throttled by server. Please wait before reconnecting.`);
          
          // Enter cooldown mode for 5 seconds on throttling
          enterCooldownMode(5000);
          return;
        }
        
        // Different behavior based on close reason
        if (event.code === 1000 && event.reason === "User disconnected") {
          console.log('User initiated disconnect, not reconnecting');
          return;
        }
        
        if (manualDisconnectRef.current) {
          console.log('Manual disconnect flag set, not reconnecting');
          return;
        }
        
        // For unexpected closures, try to reconnect
        console.log('Unexpected connection close, scheduling reconnect');
        
        // Add an error message
        if (event.code !== 1000 || event.reason !== "Reconnecting") {
          consecutiveFailuresRef.current++;
          
          setMessages(prev => [...prev, {
            id: `connection_reset_${Date.now()}`,
            type: 'system',
            playerName: 'System',
            content: `Connection lost. Attempting to reconnect...`,
            timestamp: Date.now()
          }]);
          
          // Schedule reconnect for unexpected closure
          scheduleReconnect(roomId, playerName);
        }
      };

      // Handle connection errors
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
        connectionInProgressRef.current = false;
        consecutiveFailuresRef.current++;
        
        // Only trigger reconnect if not already reconnecting
        if (!isReconnecting) {
          scheduleReconnect(roomId, playerName);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionError('Failed to establish connection');
      connectionInProgressRef.current = false;
      consecutiveFailuresRef.current++;
      
      // Schedule reconnect on error
      scheduleReconnect(roomId, playerName);
    }
  }, [isConnectingTooFrequently, recordConnectionAttempt, handleWebSocketMessage, scheduleReconnect, playerId]);

  // Remove heartbeat system
  const startPingInterval = (ws: WebSocket) => {
    // No-op - we don't want to use heartbeats anymore
  };

  // Improved disconnect function to prevent auto-reconnect
  const disconnect = useCallback(() => {
    // Set flag that this is a manual disconnect and should not trigger auto-reconnect
    manualDisconnectRef.current = true;
    
    // Reset the cooldown and reconnection state
    inCooldownRef.current = false;
    
    console.log('Manually disconnecting WebSocket connection');
    
    // Clear any pending reconnect attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear cooldown timeout
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }
    
    // Reset connection state
    setReconnectAttempts(0);
    setIsConnected(false);
    setCurrentPlayer(null);
    setPlayers([]);
    setMessages([]);
    setGameState(null);
    setLeaderboard(null);
    
    // Close WebSocket connection if it exists
    if (wsRef.current) {
      try {
        // Only try to send a leave message if the connection is open
        if (wsRef.current.readyState === WebSocket.OPEN && roomId && playerName) {
          // Tell the server we're leaving
          wsRef.current.send(JSON.stringify({
            type: "leave",
            roomId,
            playerName,
            disconnecting: true // Flag that this is a real disconnect, not a reconnect
          }));
          
          // Allow time for the server to process leave message
          setTimeout(() => {
            if (wsRef.current) {
              wsRef.current.close(1000, "User disconnected");
              wsRef.current = null;
            }
          }, 300);
        } else {
          // If not open, just close it directly
          wsRef.current.close(1000, "User disconnected");
          wsRef.current = null;
        }
      } catch (e) {
        console.error("Error disconnecting WebSocket:", e);
        wsRef.current = null;
      }
    }
    
    // Reset the room ID to disconnect from the current game
    setRoomId('');
    setPlayerName('');
    
    // Reset connection error
    setConnectionError(null);
    
    // Reset the throttle time
    reconnectThrottleTimeRef.current = 1000;
    
    // Reset consecutive failures count
    consecutiveFailuresRef.current = 0;
  }, [roomId, playerName]);

  // Add a connection stabilizer to prevent connection flapping
  useEffect(() => {
    // Only run this effect when connection state changes
    if (!isConnected || !roomId || !playerName) return;
    
    // Keep track of connection stability
    let connectionStabilityTimeout: NodeJS.Timeout | null = null;
    
    // Mark the connection as stable after 3 seconds of being connected
    // This helps prevent the "flapping" connection behavior
    connectionStabilityTimeout = setTimeout(() => {
      if (isConnected && wsRef.current) {
        console.log("Connection seems stable, resetting reconnect attempts");
        setReconnectAttempts(0);
        reconnectThrottleTimeRef.current = 1000; // Reset throttle time
        consecutiveFailuresRef.current = 0; // Reset failure counter
      }
    }, 3000);
    
    return () => {
      if (connectionStabilityTimeout) {
        clearTimeout(connectionStabilityTimeout);
      }
    };
  }, [isConnected, roomId, playerName]);

  // Handle ready state toggle
  const handleReady = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, attempting to reconnect...");
      scheduleReconnect(roomId, playerName);
      return;
    }
    
    console.log("Sending ready message...");
    wsRef.current.send(JSON.stringify({
      type: "ready",
      roomId,
      playerName,
      // Don't send isReady, let the server toggle it
    }));
  }, [roomId, playerName, scheduleReconnect]);

  // Handler for sending chat messages
  const sendMessage = useCallback((messageText: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, can't send message");
      return;
    }
    
    console.log(`Sending chat message: ${messageText}`);
    
    // If game is in active state, send as guess, otherwise as chat
    const messageType = gameState && gameState.status === 'playing' ? "guess" : "chat";
    
    wsRef.current.send(JSON.stringify({
      type: messageType,
      roomId,
      playerName,
      guess: messageText,
      content: messageText
    }));
  }, [roomId, playerName, gameState]);

  // Handle drawing data
  const handleDraw = useCallback((drawingData: DrawingData) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, can't send drawing data");
      return;
    }
    
    // Add timestamp to all drawing data to help with synchronization
    const drawingWithMeta = {
      ...drawingData,
      timestamp: Date.now(),
      roomId
    };
    
    wsRef.current.send(JSON.stringify(drawingWithMeta));
  }, [roomId]);

  // Update game settings
  const updateGameSettings = useCallback((settings: GameSettings) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, can't update game settings");
      return;
    }
    
    // Ensure all properties are properly formatted
    const formattedSettings: GameSettings = {
      maxRounds: settings.maxRounds ?? DEFAULT_GAME_SETTINGS.maxRounds,
      timePerRound: settings.timePerRound ?? DEFAULT_GAME_SETTINGS.timePerRound,
      customWords: Array.isArray(settings.customWords) ? settings.customWords : [],
      useOnlyCustomWords: settings.useOnlyCustomWords === true
    };
    
    // Send the settings update to the server
    wsRef.current.send(JSON.stringify({
      type: "gameSettings",
      roomId,
      settings: formattedSettings
    }));
    
    // Also update local settings
    setGameSettings(formattedSettings);
    
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
    
    console.log('Updated game settings:', formattedSettings);
  }, [roomId]);

  // Replace the existing startNewGame function
  const startNewGame = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, cannot start new game");
      setConnectionError("Not connected to server. Please wait or refresh.");
      return;
    }

    if (!currentPlayer?.isPartyLeader) {
      console.log("Only party leader can start a new game");
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        type: 'system', 
        playerName: 'System', 
        content: 'Only the party leader can start a new game.',
        timestamp: Date.now() 
      }]);
      return;
    }
    
    console.log('Requesting to start a new game...');
    wsRef.current.send(JSON.stringify({
      type: 'startNewGameRequest' // Send the new request type
    }));
    
    // Clear the leaderboard from the client state immediately
    setLeaderboard(null);

  }, [currentPlayer]); // Depend on currentPlayer to check isPartyLeader

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
    isReconnecting,
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
    startNewGame,
    retryConnection
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;