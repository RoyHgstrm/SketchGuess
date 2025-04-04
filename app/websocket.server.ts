import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DrawingData {
  type: "draw";
  x: number;
  y: number;
  color: string;
  size: number;
  tool: "brush" | "eraser";
}

interface ClearData {
  type: "clear";
}

interface JoinData {
  type: "join";
  roomId: string;
  playerName: string;
}

interface GuessData {
  type: "guess";
  guess: string;
  playerName: string;
}

interface ReadyData {
  type: "ready";
  playerName: string;
  isReady: boolean;
}

interface SystemMessageData {
  type: "system";
  content: string;
}

interface GameSettingsData {
  type: "gameSettings";
  settings: GameSettings;
}

interface GameSettings {
  maxRounds: number;
  timePerRound: number;
  customWords: string[] | null;
}

type Message = DrawingData | ClearData | JoinData | GuessData | ReadyData | SystemMessageData | GameSettingsData;

interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
  isDrawing: boolean;
  hasGuessedCorrectly: boolean;
  isPartyLeader: boolean;
  ws: WebSocket;
  lastActive: number;
}

interface Room {
  id: string;
  players: Player[];
  gameState: {
    status: 'waiting' | 'playing' | 'ended';
    currentRound: number;
    maxRounds: number;
    timeLeft: number;
    word?: string;
    drawer?: Player;
  };
  settings: GameSettings;
  timer?: NodeJS.Timeout;
}

interface LeaderboardEntry {
  playerName: string;
  score: number;
  gamesPlayed: number;
  wordsGuessed: number;
  date: string;
}

const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// Default word list
const DEFAULT_WORDS = [
  "Pac-Man", "bow", "Apple", "chest", "six pack", "nail", "tornado", "Mickey Mouse", "Youtube", "lightning",
  "traffic light", "waterfall", "McDonalds", "Donald Trump", "Patrick", "stop sign", "Superman", "tooth", "sunflower", "keyboard",
  "island", "Pikachu", "Harry Potter", "Nintendo Switch", "Facebook", "eyebrow", "Peppa Pig", "SpongeBob", "Creeper", "octopus",
  "church", "Eiffel tower", "tongue", "snowflake", "fish", "Twitter", "pan", "Jesus Christ", "butt cheeks", "jail",
  "Pepsi", "hospital", "pregnant", "thunderstorm", "smile", "skull", "flower", "palm tree", "Angry Birds", "America",
  "lips", "cloud", "compass", "mustache", "Captain America", "pimple", "Easter Bunny", "chicken", "Elmo", "watch",
  "prison", "skeleton", "arrow", "volcano", "Minion", "school", "tie", "lighthouse", "fountain", "Cookie Monster",
  "Iron Man", "Santa", "blood", "river", "bar", "Mount Everest", "chest hair", "Gumball", "north", "water",
  "cactus", "treehouse", "bridge", "short", "thumb", "beach", "mountain", "Nike", "flag", "Paris",
  "eyelash", "Shrek", "brain", "iceberg", "fingernail", "playground", "ice cream", "Google", "dead", "knife",
  "spoon", "unibrow", "Spiderman", "black", "graveyard", "elbow", "golden egg", "yellow", "Germany", "Adidas",
  "nose hair", "Deadpool", "Homer Simpson", "Bart Simpson", "rainbow", "ruler", "building", "raindrop", "storm", "coffee shop",
  "windmill", "fidget spinner", "yo-yo", "ice", "legs", "tent", "mouth", "ocean", "Fanta", "homeless",
  "tablet", "muscle", "Pinocchio", "tear", "nose", "snow", "nostrils", "Olaf", "belly button", "Lion King",
  "car wash", "Egypt", "Statue of Liberty", "Hello Kitty", "pinky", "Winnie the Pooh", "guitar", "Hulk", "Grinch", "Nutella",
  "cold", "flagpole", "Canada", "rainforest", "blue", "rose", "tree", "hot", "mailbox", "Nemo",
  "crab", "knee", "doghouse", "Chrome", "cotton candy", "Barack Obama", "hot chocolate", "Michael Jackson", "map", "Samsung",
  "shoulder", "Microsoft", "parking", "forest", "full moon", "cherry blossom", "apple seed", "Donald Duck", "leaf", "bat",
  "earwax", "Italy", "finger", "seed", "lilypad", "brush", "record", "wrist", "thunder", "gummy",
  "Kirby", "fire hydrant", "overweight", "hot dog", "house", "fork", "pink", "Sonic", "street", "Nasa",
  "arm", "fast", "tunnel", "full", "library", "pet shop", "Yoshi", "Russia", "drum kit", "Android",
  "Finn and Jake", "price tag", "Tooth Fairy", "bus stop", "rain", "heart", "face", "tower", "bank", "cheeks",
  "Batman", "speaker", "Thor", "skinny", "electric guitar", "belly", "cute", "ice cream truck", "bubble gum", "top hat",
  "Pink Panther", "hand", "bald", "freckles", "clover", "armpit", "Japan", "thin", "traffic", "spaghetti",
  "Phineas and Ferb", "broken heart", "fingertip", "funny", "poisonous", "Wonder Woman", "Squidward", "Mark Zuckerberg", "twig", "red",
  "China", "dream", "Dora", "daisy", "France", "Discord", "toenail", "positive", "forehead", "earthquake",
  "iron", "Zeus", "Mercedes", "Big Ben", "supermarket", "Bugs Bunny", "Yin and Yang", "drink", "rock", "drum",
  "piano", "white", "bench", "fall", "royal", "seashell", "Audi", "stomach", "aquarium", "Bitcoin",
  "volleyball", "marshmallow", "Cat Woman", "underground", "Green Lantern", "bottle flip", "toothbrush", "globe", "sand", "zoo",
  "west", "puddle", "lobster", "North Korea", "Luigi", "bamboo", "Great Wall", "Kim Jong-un", "bad", "credit card",
  "swimming pool", "Wolverine", "head", "hair", "Yoda", "Elsa", "turkey", "heel", "maracas", "clean",
  "droplet", "cinema", "poor", "stamp", "Africa", "whistle", "Teletubby", "wind", "Aladdin", "tissue box",
  "fire truck", "Usain Bolt", "water gun", "farm", "iPad", "well", "warm", "booger", "WhatsApp", "Skype",
  "landscape", "pine cone", "Mexico", "slow", "organ", "fish bowl", "teddy bear", "John Cena", "Frankenstein", "tennis racket",
  "gummy bear", "Mount Rushmore", "swing", "Mario", "lake", "point", "vein", "cave", "smell", "chin",
  "desert", "scary", "Dracula", "airport", "kiwi", "seaweed", "incognito", "Pluto", "statue", "hairy",
  "strawberry", "low", "invisible", "blindfold", "tuna", "controller", "Paypal", "King Kong", "neck", "lung",
  "weather", "Xbox", "tiny", "icicle", "flashlight", "scissors", "emoji", "strong", "saliva", "firefighter",
  "salmon", "basketball", "spring", "Tarzan", "red carpet", "drain", "coral reef", "nose ring", "caterpillar", "Wall-e",
  "seat belt", "polar bear", "Scooby Doo", "wave", "sea", "grass", "pancake", "park", "lipstick", "pickaxe",
  "east", "grenade", "village", "Flash", "throat", "dizzy", "Asia", "petal", "Gru", "country",
  "spaceship", "restaurant", "copy", "skin", "glue stick", "Garfield", "equator", "blizzard", "golden apple", "Robin Hood",
  "fast food", "barbed wire", "Bill Gates", "Tower of Pisa", "neighborhood", "lightsaber", "video game", "high heels", "dirty", "flamethrower",
  "pencil sharpener", "hill", "old", "flute", "cheek", "violin", "fireball", "spine", "bathtub", "cell phone",
  "breath", "open", "Australia", "toothpaste", "Tails", "skyscraper", "cowbell", "rib", "ceiling fan", "Eminem",
  "Jimmy Neutron", "photo frame", "barn", "sandstorm", "Jackie Chan", "Abraham Lincoln", "T-rex", "pot of gold", "KFC", "shell",
  "poison", "acne", "avocado", "study", "bandana", "England", "Medusa", "scar", "Skittles", "Pokemon",
  "branch", "Dumbo", "factory", "Hollywood", "deep", "knuckle", "popular", "piggy bank", "Las Vegas", "microphone",
  "Tower Bridge", "butterfly", "slide", "hut", "shovel", "hamburger", "shop", "fort", "Ikea", "planet",
  "cat", "dog", "house", "tree", "car", "bicycle", "sun", "moon", "star", "flower",
  "bird", "fish", "book", "computer", "phone", "chair", "table", "door", "window",
  "cloud", "rain", "snow", "mountain", "beach", "ocean", "bridge", "train", "bus",
  "airplane", "rocket", "robot", "monster", "ghost", "dragon", "unicorn", "castle",
  "pizza", "hamburger", "ice cream", "cake", "cookie", "apple", "banana", "guitar",
  "piano", "camera", "hat", "shirt", "shoes", "bag", "key", "lock", "pen", "pencil"
];

const DEFAULT_SETTINGS: GameSettings = {
  maxRounds: 3,
  timePerRound: 60,
  customWords: null
};

// Load leaderboard from file or create new one
function loadLeaderboard(): LeaderboardEntry[] {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
  
  return [];
}

// Save leaderboard to file
function saveLeaderboard(leaderboard: LeaderboardEntry[]): void {
  try {
    const data = JSON.stringify(leaderboard, null, 2);
    fs.writeFileSync(LEADERBOARD_FILE, data, 'utf8');
  } catch (error) {
    console.error('Error saving leaderboard:', error);
  }
}

// Update player's entry in the global leaderboard
function updateLeaderboard(playerName: string, score: number, wordsGuessed: number): void {
  const leaderboard = loadLeaderboard();
  const existingEntry = leaderboard.find(entry => entry.playerName === playerName);
  
  if (existingEntry) {
    existingEntry.score += score;
    existingEntry.gamesPlayed += 1;
    existingEntry.wordsGuessed += wordsGuessed;
    existingEntry.date = new Date().toISOString();
  } else {
    leaderboard.push({
      playerName,
      score,
      gamesPlayed: 1,
      wordsGuessed,
      date: new Date().toISOString()
    });
  }
  
  saveLeaderboard(leaderboard);
}

// Get top 10 players from leaderboard
function getTopPlayers(count = 10): LeaderboardEntry[] {
  const leaderboard = loadLeaderboard();
  return leaderboard.sort((a, b) => b.score - a.score).slice(0, count);
}

// Store rooms in memory
const rooms = new Map<string, Room>();

// Utility functions
function generateId(): string {
  // Generate a random 4-digit number between 1000 and 9999
  const roomCode = Math.floor(Math.random() * 9000) + 1000;
  // Convert to string and ensure it's 4 digits
  return roomCode.toString().padStart(4, '0');
}

function broadcastToRoom(room: Room, message: any) {
  room.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  });
}

function updateGameState(room: Room) {
  broadcastToRoom(room, {
    type: 'gameState',
    state: room.gameState
  });
}

function updatePlayers(room: Room) {
  const playerData = room.players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    isReady: p.isReady,
    isDrawing: p.isDrawing,
    hasGuessedCorrectly: p.hasGuessedCorrectly,
    isPartyLeader: p.isPartyLeader
  }));

  broadcastToRoom(room, {
    type: 'players',
    players: playerData
  });
}

function checkAllPlayersReady(room: Room): boolean {
  return room.players.length >= 2 && room.players.every(p => p.isReady);
}

function selectRandomWord(room: Room): string {
  const wordList = room.settings.customWords && room.settings.customWords.length > 0 
    ? room.settings.customWords 
    : DEFAULT_WORDS;
  return wordList[Math.floor(Math.random() * wordList.length)];
}

function startGame(room: Room) {
  // Reset scores
  room.players.forEach(p => {
    p.score = 0;
    p.isDrawing = false;
    p.hasGuessedCorrectly = false;
  });

  // Set initial game state
  room.gameState = {
    status: 'playing',
    currentRound: 1,
    maxRounds: room.settings.maxRounds,
    timeLeft: room.settings.timePerRound
  };

  // Select first drawer randomly
  const randomDrawer = room.players[Math.floor(Math.random() * room.players.length)];
  randomDrawer.isDrawing = true;
  room.gameState.drawer = randomDrawer;
  room.gameState.word = selectRandomWord(room);

  // Start round timer
  startRoundTimer(room);

  // Update all clients
  updateGameState(room);
  updatePlayers(room);

  // Send word to drawer
  if (randomDrawer.ws.readyState === WebSocket.OPEN) {
    randomDrawer.ws.send(JSON.stringify({
      type: 'word',
      word: room.gameState.word
    }));
  }
}

function startRoundTimer(room: Room) {
  if (room.timer) {
    clearInterval(room.timer);
  }

  room.timer = setInterval(() => {
    room.gameState.timeLeft--;

    if (room.gameState.timeLeft <= 0) {
      endRound(room);
    } else {
      updateGameState(room);
    }
  }, 1000);
}

function endRound(room: Room) {
  if (room.timer) {
    clearInterval(room.timer);
  }

  // Reveal word to all players
  broadcastToRoom(room, {
    type: 'roundEnd',
    word: room.gameState.word
  });

  // Check if game should end
  if (room.gameState.currentRound >= room.gameState.maxRounds) {
    endGame(room);
    return;
  }

  // Prepare next round
  setTimeout(() => {
    // Reset player states
    room.players.forEach(p => {
      p.isDrawing = false;
      p.hasGuessedCorrectly = false;
    });

    // Select next drawer (rotate through players)
    const currentDrawerIndex = room.players.findIndex(p => p === room.gameState.drawer);
    const nextDrawerIndex = (currentDrawerIndex + 1) % room.players.length;
    const nextDrawer = room.players[nextDrawerIndex];
    
    nextDrawer.isDrawing = true;
    room.gameState.drawer = nextDrawer;
    room.gameState.word = selectRandomWord(room);
    room.gameState.currentRound++;
    room.gameState.timeLeft = room.settings.timePerRound;

    // Start new round
    startRoundTimer(room);
    updateGameState(room);
    updatePlayers(room);

    // Send word to new drawer
    if (nextDrawer.ws.readyState === WebSocket.OPEN) {
      nextDrawer.ws.send(JSON.stringify({
        type: 'word',
        word: room.gameState.word
      }));
    }
  }, 3000); // Show round end screen for 3 seconds
}

function endGame(room: Room) {
  if (room.timer) {
    clearInterval(room.timer);
  }

  room.gameState.status = 'ended';
  
  // Sort players by score
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  
  // Send final scores
  broadcastToRoom(room, {
    type: 'gameEnd',
    players: sortedPlayers.map(p => ({
      name: p.name,
      score: p.score
    }))
  });

  // Reset player states
  room.players.forEach(p => {
    p.isReady = false;
    p.isDrawing = false;
    p.hasGuessedCorrectly = false;
    p.score = 0;
  });

  updateGameState(room);
  updatePlayers(room);
}

// Create WebSocket server
const server = createServer((req, res) => {
  // Handle CORS preflight requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
  } else if (req.url === "/leaderboard" && req.method === "GET") {
    // Endpoint to get the top players
    const topPlayers = getTopPlayers();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(topPlayers));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req) => {
  console.log("New connection attempt");
  
  let currentPlayer: Player | null = null;
  let currentRoom: Room | null = null;

  // Send heartbeat to detect disconnections quickly
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      const type = data.type as 'join' | 'guess' | 'draw' | 'clear' | 'ready' | 'system' | 'gameSettings' | 'updateSettings';

      switch (type) {
        case 'join': {
          const { roomId, playerName } = data;
          
          // Create or get room
          if (!rooms.has(roomId)) {
            const room: Room = {
              id: roomId,
              players: [],
              gameState: {
                status: 'waiting',
                currentRound: 0,
                maxRounds: DEFAULT_SETTINGS.maxRounds,
                timeLeft: DEFAULT_SETTINGS.timePerRound
              },
              settings: DEFAULT_SETTINGS
            };
            rooms.set(roomId, room);
            currentRoom = room;
          } else {
            currentRoom = rooms.get(roomId)!;
          }

          // Create player
          currentPlayer = {
            id: generateId(),
            name: playerName,
            score: 0,
            isReady: false,
            isDrawing: false,
            hasGuessedCorrectly: false,
            isPartyLeader: currentRoom.players.length === 0, // First player is leader
            ws,
            lastActive: Date.now()
          };

          currentRoom.players.push(currentPlayer);
          
          // Send initial state
          ws.send(JSON.stringify({
            type: 'joined',
            roomId,
            playerId: currentPlayer.id
          }));

          updateGameState(currentRoom);
          updatePlayers(currentRoom);
          break;
        }
        
        case 'ready': {
          if (!currentPlayer || !currentRoom) return;
          
          currentPlayer.isReady = !currentPlayer.isReady;
          currentPlayer.lastActive = Date.now();
          
          updatePlayers(currentRoom);

          // Check if game should start
          if (checkAllPlayersReady(currentRoom)) {
            startGame(currentRoom);
          }
          break;
        }

        case 'updateSettings': {
          if (!currentPlayer || !currentRoom || !currentPlayer.isPartyLeader) return;
          
          interface SettingsMessage {
            type: 'updateSettings';
            settings: Partial<GameSettings>;
          }
          
          const settingsData = data as SettingsMessage;
          currentRoom.settings = {
            ...currentRoom.settings,
            ...settingsData.settings
          };

          broadcastToRoom(currentRoom, {
            type: 'settings',
            settings: currentRoom.settings
          });
          break;
        }

        case 'draw': {
          if (!currentPlayer || !currentRoom || !currentPlayer.isDrawing) return;
          
          // Create a drawing data object with timestamp and drawer ID
          const drawingData = {
            ...data,
            timestamp: Date.now(),
            drawerId: currentPlayer.id
          };
          
          // Broadcast drawing data to other players
          currentRoom.players.forEach(player => {
            if (player !== currentPlayer && player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(JSON.stringify(drawingData));
            }
          });
          break;
        }

        case 'guess': {
          if (!currentPlayer || !currentRoom || currentPlayer.isDrawing) return;
          
          // Only allow guesses during game
          if (currentRoom.gameState.status !== 'playing') {
            // Handle as chat message if game is not in progress
            broadcastToRoom(currentRoom, {
              type: 'chat',
              message: {
                id: generateId(),
                type: 'system',
                playerName: currentPlayer.name,
                content: data.guess,
                timestamp: Date.now()
              }
            });
            return;
          }

          const guess = data.guess.trim().toLowerCase();
          const word = currentRoom.gameState.word?.toLowerCase() || '';

          if (guess === word) {
            // Correct guess
            currentPlayer.hasGuessedCorrectly = true;
            currentPlayer.score += Math.ceil(currentRoom.gameState.timeLeft / 2);
            
            broadcastToRoom(currentRoom, {
              type: 'chat',
              message: {
                id: generateId(),
                type: 'correct',
                playerName: currentPlayer.name,
                content: 'Guessed correctly!',
                timestamp: Date.now()
              }
            });

            updatePlayers(currentRoom);

            // Check if all players have guessed
            if (currentRoom.players.every(p => p.isDrawing || p.hasGuessedCorrectly)) {
              endRound(currentRoom);
            }
          } else {
            // Check for partial matches
            const wordParts = word.split(' ');
            const guessParts = guess.split(' ');
            const partialMatches = wordParts.filter(part => 
              guessParts.some((guessPart: string) => part === guessPart)
            );

            // Send feedback only to the guesser
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'chat',
                message: {
                  id: generateId(),
                  type: 'incorrect',
                  playerName: 'System',
                  content: partialMatches.length > 0 
                    ? `Close! You got ${partialMatches.length} word${partialMatches.length > 1 ? 's' : ''} right!`
                    : 'Wrong guess, try again!',
                  timestamp: Date.now()
                }
              }));
            }

            // Broadcast to others that someone made a wrong guess
            currentRoom.players.forEach(player => {
              if (player !== currentPlayer && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                  type: 'chat',
                  message: {
                    id: generateId(),
                    type: 'system',
                    playerName: 'System',
                    content: `${currentPlayer?.name || 'A player'} made a guess`,
                    timestamp: Date.now()
                  }
                }));
              }
            });
          }
          break;
        }
        
        case 'system': {
          // Chat messages from players to everyone
          if (!currentRoom || !currentPlayer) return;
          
          broadcastToRoom(currentRoom, {
            type: "system",
            id: generateId(),
            playerName: currentPlayer.name,
            content: data.content,
            timestamp: Date.now()
          });
          break;
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      // Send error feedback to client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "system",
          content: "Error processing your request. Please try again."
        }));
      }
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`Connection closed with code ${code}${reason ? ': ' + reason : ''}`);
    clearInterval(pingInterval);
    
    if (!currentPlayer || !currentRoom) return;
    
    // Temporarily mark player as disconnected
    currentPlayer.isReady = false;
    
    // Notify other players
    currentRoom.players.forEach(player => {
      if (player !== currentPlayer && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({
          type: "system",
          content: `${currentPlayer?.name || ""} disconnected`
        }));
        
        // Update player list
        player.ws.send(JSON.stringify({
          type: "playerList",
          players: currentRoom !== null ? currentRoom.players.map(p => ({
            name: p.name,
            score: p.score,
            isReady: p.isReady
          })) : []
        }));
      }
    });
    
    // If drawer left, end the round
    if (currentPlayer.isDrawing && currentRoom.gameState.status === 'playing') {
      broadcastToRoom(currentRoom, {
        type: 'system',
        content: `The drawer (${currentPlayer?.name || ""}) disconnected. Ending round...`
      });
      endRound(currentRoom);
    }
    
    // Remove player after a short delay (to allow for reconnection)
    setTimeout(() => {
      if (!currentRoom || !currentPlayer) return;
      
      // Check if player is still in the room (hasn't reconnected)
      const playerStillExists = currentRoom.players.some(p => p === currentPlayer);
      if (playerStillExists && currentPlayer.ws.readyState !== WebSocket.OPEN) {
        // Permanently remove player
        currentRoom.players = currentRoom.players.filter(p => p !== currentPlayer);
        
        // If room is empty, remove it
        if (currentRoom.players.length === 0) {
          console.log(`Removing empty room ${currentRoom.id}`);
          rooms.delete(currentRoom.id);
        } else {
          // Notify remaining players that someone was removed
          currentRoom.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(JSON.stringify({
                type: "playerLeft",
                playerName: currentPlayer?.name || ""
              }));
              
              // Update player list
              player.ws.send(JSON.stringify({
                type: "playerList",
                players: currentRoom !== null ? currentRoom.players.map(p => ({
                  name: p.name,
                  score: p.score,
                  isReady: p.isReady
                })) : []
              }));
            }
          });
        }
      }
    }, 30000); // 30-second grace period for reconnection
  });

  ws.on('error', (error) => {
    console.error("WebSocket error:", error);
    clearInterval(pingInterval);
  });
  
  ws.on('pong', () => {
    // Client is still connected
  });
});

// Clean up disconnected players periodically
setInterval(() => {
  rooms.forEach(room => {
    // Remove players with closed connections
    const activePlayers = room.players.filter(player => 
      player.ws.readyState === WebSocket.OPEN
    );
    
    if (activePlayers.length < room.players.length) {
      console.log(`Removing ${room.players.length - activePlayers.length} disconnected players from room ${room.id}`);
      room.players = activePlayers;
    }
    
    // Remove empty rooms
    if (room.players.length === 0) {
      console.log(`Removing empty room ${room.id}`);
      rooms.delete(room.id);
    }
  });
}, 60000);

const PORT = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

// Start the server
server.listen(PORT, host, () => {
  console.log(`WebSocket server running on ${host}:${PORT}`);
  
  // Handle process termination
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}); 