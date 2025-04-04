import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for storing the leaderboard
export const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// Default word list
export const DEFAULT_WORDS = [
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

// Default game settings - use maxRounds
export const DEFAULT_SETTINGS = {
  maxRounds: 3,
  timePerRound: 60,
  customWords: null,
  useOnlyCustomWords: false
};

// Load leaderboard from file or create new one
export function loadLeaderboard() { // Removed TS return type
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
function saveLeaderboard(leaderboard) { // Removed TS param type
  try {
    const data = JSON.stringify(leaderboard, null, 2);
    fs.writeFileSync(LEADERBOARD_FILE, data, 'utf8');
  } catch (error) {
    console.error('Error saving leaderboard:', error);
  }
}

// Update player's entry in the global leaderboard
function updateLeaderboard(playerName, score, wordsGuessed) { // Removed TS param types
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
export function getTopPlayers(count = 10) { // Removed TS return type
  const leaderboard = loadLeaderboard();
  return leaderboard.sort((a, b) => b.score - a.score).slice(0, count);
}

// Map to store room data
const rooms = new Map(); // Removed TS Map type

// Statistics tracking (optional, could be moved or removed if not needed by this logic)
let totalConnectionCount = 0;

// --- Utility Functions ---

// Helper function to safely send messages
function safeSend(ws, messageData) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(messageData));
    } catch (error) {
      console.error(`Error sending message: ${error}. Data:`, messageData);
    }
  } else {
    console.warn(`Attempted to send message to closed/closing WebSocket. Player: ${ws?.playerName || ws?.playerId || 'unknown'}`);
  }
}

// Function to generate unique player IDs
function generateUniquePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Broadcast message to all players in a room except the sender (optional)
function broadcastToRoom(room, message, senderWs = null) { // Removed TS types
    if (!room || !room.players) return;
    const messageString = JSON.stringify(message);
    room.players.forEach(player => {
        if (player && player.ws && player.ws !== senderWs && player.ws.readyState === WebSocket.OPEN) {
            try {
                player.ws.send(messageString);
            } catch (error) {
                console.error(`Failed to send message to player ${player.id}:`, error);
            }
        }
    });
}

// Broadcast a system message to everyone in the room
function broadcastSystemMessage(room, content) { // Removed TS types
    broadcastToRoom(room, {
        id: generateUniquePlayerId(),
        type: 'system',
        playerName: 'System',
        content,
        timestamp: Date.now()
    });
}

// Send the current game state to a specific player or the whole room
function sendGameState(room, player) {
    if (!room || !player || !player.ws || player.ws.readyState !== WebSocket.OPEN) return;
    
    // Ensure all gameState properties are properly initialized with defaults
    const currentGameState = room.gameState || { 
        status: 'waiting', 
        currentRound: 0, 
        maxRounds: room.settings.maxRounds || 3, 
        totalTurns: 0, 
        timeLeft: 0 
    };

    console.log(`Sending game state to ${player.name} (ID: ${player.id}) Status: ${currentGameState.status}`);
    
    // Create a payload with game state AND player identification info
    const payload = {
        type: "gameState",
        gameState: {
            status: currentGameState.status,
            currentRound: currentGameState.currentRound || 0,
            maxRounds: currentGameState.maxRounds || room.settings.maxRounds || 3,
            totalTurns: currentGameState.totalTurns || 0, 
            timeLeft: currentGameState.timeLeft || 0,
        },
        // Include direct identification info in EVERY game state message
        playerInfo: {
            id: player.id,
            name: player.name,
            isDrawer: room.currentDrawer ? player.id === room.currentDrawer.id : false,
            isPartyLeader: player.isPartyLeader || false
        }
    };

    // Add drawer/word info if applicable
    if (currentGameState.status === 'playing' && room.currentDrawer) {
        // Always include drawer info
        payload.gameState.drawer = {
            id: room.currentDrawer.id,
            name: room.currentDrawer.name
        };

        // Only send the word to the drawer
        if (player.id === room.currentDrawer.id) {
            console.log(`Sending word "${room.currentWord}" to drawer ${player.name}`);
            payload.gameState.word = room.currentWord;
        }
    }

    try {
        player.ws.send(JSON.stringify(payload));
    } catch (err) {
        console.error(`Error sending game state to ${player.name}:`, err);
    }
}

// --- Game Logic Functions (Keep these top-level) ---
function checkAllPlayersReady(room) {
    if (!room || !Array.isArray(room.players)) return false;
    const activePlayers = room.players.filter(p => p && !p.disconnected);
    return activePlayers.length >= 2 && activePlayers.every(p => p.isReady);
}

// Check if all non-drawing players have guessed correctly
function checkAllPlayersGuessed(room) {
    if (!room || !room.players || !room.currentDrawer) return false;
    
    // Get all active non-drawer players
    const activePlayers = room.players.filter(p => 
        !p.disconnected && p.id !== room.currentDrawer.id
    );
    
    // If no active players to guess, return false
    if (activePlayers.length === 0) return false;
    
    // Check if all active non-drawer players have guessed correctly
    const allGuessed = activePlayers.every(p => p.hasGuessedCorrectly);
    
    console.log(`Room ${room.id}: All players guessed: ${allGuessed} (${activePlayers.filter(p => p.hasGuessedCorrectly).length}/${activePlayers.length})`);
    
    return allGuessed;
}

function getWordForRound(room) {
    if (!room || !room.settings) {
        console.error("Cannot get word: Invalid room or settings.");
        return DEFAULT_WORDS[0]; // Fallback
    }
    // Determine the word list to use
  let wordList = DEFAULT_WORDS;
    if (Array.isArray(room.settings.customWords) && room.settings.customWords.length > 0) {
    if (room.settings.useOnlyCustomWords) {
      wordList = room.settings.customWords;
    } else {
            // Combine default and custom words, removing duplicates
            wordList = [...new Set([...DEFAULT_WORDS, ...room.settings.customWords])];
        }
    }

    if (!Array.isArray(wordList) || wordList.length === 0) {
      console.error('Word list is empty or invalid. Using fallback.');
      wordList = DEFAULT_WORDS; // Ensure fallback
      if (wordList.length === 0) return "error"; // Final fallback
    }
    
    const randomIndex = Math.floor(Math.random() * wordList.length);
    const selectedWord = wordList[randomIndex];
    console.log(`Selected word: ${selectedWord} from ${wordList.length} total words`);
    return selectedWord;
}

// Function to start the timer for a round
function startTimer(room) {
    // Clear any existing timers
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
  
  // Set initial time in the room and gameState
  room.timeLeft = room.settings.timePerRound;
  if (room.gameState) room.gameState.timeLeft = room.settings.timePerRound;
  
  console.log(`Starting timer for room ${room.id}, ${room.timeLeft} seconds`);
  
  // Broadcast initial time
  broadcastTimeUpdate(room);
  
  // Set up interval for timer countdown
  room.timer = setInterval(() => {
    // Decrement time
    room.timeLeft--;
    if (room.gameState) room.gameState.timeLeft = room.timeLeft;
    
    // Log occasionally to track timer
    if (room.timeLeft % 10 === 0 || room.timeLeft <= 5) {
      console.log(`Timer for room ${room.id}: ${room.timeLeft}s remaining`);
    }
    
    // Broadcast time update to all clients
    broadcastTimeUpdate(room);
    
    // End round when time expires
    if (room.timeLeft <= 0) {
      console.log(`Timer expired for room ${room.id}`);
      clearInterval(room.timer);
      room.timer = null;
      endRound(room);
    }
  }, 1000);
}

// Function to broadcast time updates
function broadcastTimeUpdate(room) {
  if (!room || !room.players) return;
  
  const timeUpdate = {
    type: 'gameState',
    gameState: {
      status: room.status || 'playing',
      currentTurn: room.currentTurn || 0,
      maxTurns: room.maxTurns || 0,
      timeLeft: room.timeLeft || 0
    }
  };
  
  // Send time update to each player with appropriate information
  room.players.forEach(player => {
    if (player && !player.disconnected && player.ws && player.ws.readyState === WebSocket.OPEN) {
      // Add player-specific data (drawer gets the word)
      const playerUpdate = {...timeUpdate};
      
      if (player.isDrawing) {
        playerUpdate.gameState.word = room.currentWord;
        playerUpdate.gameState.isDrawing = true;
      } else if (room.currentDrawer) {
        playerUpdate.gameState.drawer = {
          id: room.currentDrawer.id,
          name: room.currentDrawer.name
        };
        playerUpdate.gameState.isDrawing = false;
      }
      
      player.ws.send(JSON.stringify(playerUpdate));
    }
  });
}

function assignNewPartyLeader(room) {
  const activePlayers = room.players.filter(p => !p.disconnected);
  if (activePlayers.length === 0) return;
  room.players.forEach(p => { p.isPartyLeader = false; });
  const newLeader = activePlayers[0];
  newLeader.isPartyLeader = true;
  console.log(`${newLeader.name} is now the party leader`);
  broadcastSystemMessage(room, `${newLeader.name} is now the party leader`);
}

// Start a new turn, cycling through players
function startNewTurn(room) {
    if (!room || !room.players || room.players.length === 0) return false;
    
    console.log(`[Room ${room.id}] --- Executing startNewTurn ---`);
    
    // Force clear canvas for everyone at the start of a new turn
    console.log(`[Room ${room.id}] Broadcasting clear canvas command for new turn.`);
    broadcastToRoom(room, { type: "clear" });
    
    // Clear any existing timeouts (redundant check, but safe)
    if (room.timer) {
        clearTimeout(room.timer);
        room.timer = null;
    }
    if (room.timerInterval) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
    }

    // Reset player guess status
    room.players.forEach(player => {
        if (!player.disconnected) {
            player.hasGuessedCorrectly = false;
            player.correctGuess = false;
            player.guessTime = null;
        }
    });

    // Find non-disconnected players
    const activePlayers = room.players.filter(p => !p.disconnected);
    
    if (activePlayers.length < 2) {
        console.log(`Not enough active players to start a new turn. Room ${room.id}`);
        return false;
    }

    let currentRound = room.gameState.currentRound || 0;
    let turnWithinRound = (room.gameState.turnWithinRound ?? -1) + 1; // Increment turn index
    
    // Check if we need to advance the round
    if (turnWithinRound >= activePlayers.length) {
        currentRound++;
        turnWithinRound = 0; // Reset turn index for new round
        console.log(`[Room ${room.id}] Starting Round ${currentRound}`);
    } 
    // Ensure first round is 1 if starting from 0
    if (currentRound === 0) {
        currentRound = 1;
    }

    const nextDrawerIndex = turnWithinRound % activePlayers.length; // Index based on new turn number
    const nextDrawer = activePlayers[nextDrawerIndex];
    
    // Get the word first so we can properly log it
    const newWord = getWordForRound(room);
    
    // Update room state with the new drawer and word
    room.currentDrawer = nextDrawer;
    room.currentWord = newWord;
    
    console.log(`New turn started. Round: ${currentRound}, Turn Index In Round: ${turnWithinRound}, Drawer: ${nextDrawer.name}, Word: ${room.currentWord}`);
    
    // Update game state
    room.gameState.status = 'playing';
    room.gameState.currentRound = currentRound;
    room.gameState.turnWithinRound = turnWithinRound;
    room.gameState.timeLeft = room.settings.timePerRound;
    room.gameState.word = newWord;
    room.gameState.drawer = { id: nextDrawer.id, name: nextDrawer.name };
    
    // Broadcast updated player list and game state
    broadcastPlayerList(room);
    broadcastGameState(room);
    
    // Start the timer for this round
    startTimer(room);
    
    return true;
}

// Update endRound function
function endRound(room) {
  if (!room || room.status !== 'playing') return;
  
  console.log(`[Room ${room.id}] --- Executing endRound ---`);
  
  // Clear timers
  if (room.timer) {
    console.log(`[Room ${room.id}] Clearing timer in endRound.`);
    clearInterval(room.timer);
    room.timer = null;
  }
  if (room.timerInterval) {
      console.log(`[Room ${room.id}] Clearing interval timer in endRound.`);
      clearInterval(room.timerInterval);
      room.timerInterval = null;
  }

  // room.isRoundActive = false; // REMOVED - Let room.status handle state
  console.log(`[Room ${room.id}] Ending Round ${room.gameState.currentRound}, Turn ${room.gameState.turnWithinRound || 0}`);

  // Reveal word to all players
  // Broadcast round end details (like the word)
  broadcastSystemMessage(room, `Round ${room.gameState.currentRound} finished! The word was: ${room.gameState.word}`);

  // ... (Award points logic remains the same) ...
    const correctGuessers = room.players.filter(p => !p.disconnected && p.hasGuessedCorrectly);
    if (room.currentDrawer && !room.currentDrawer.disconnected) {
      room.currentDrawer.score += 100;
    }
    correctGuessers.forEach(p => {
        const timeBonus = Math.max(0, 60 - (p.guessTime || 60)); 
        p.score += 50 + timeBonus; 
    });
    broadcastPlayerList(room);
    broadcastSystemMessage(room, `Round ended! Correct word was: ${room.currentWord}`);

  // Check if game should end
  const activePlayerCount = room.players.filter(p => !p.disconnected).length;
  // Calculate the turn number that just finished
  const lastTurnNumber = ((room.gameState.currentRound || 0) * activePlayerCount) + (room.gameState.turnWithinRound || 0) + 1;
  const totalTurnsRequired = room.gameState.totalTurns || (room.settings.maxRounds * activePlayerCount); // Use stored or recalculate
  
  console.log(`[Room ${room.id}] EndRound Check: Last Turn Completed=${lastTurnNumber}, Total Turns Required=${totalTurnsRequired}`);
  
  if (lastTurnNumber >= totalTurnsRequired && totalTurnsRequired > 0) {
    console.log(`[Room ${room.id}] Game should end after this turn. Calling endGame...`);
    broadcastSystemMessage(room, `All rounds completed! (${room.gameState.currentRound}/${room.gameState.maxRounds})`);
    endGame(room); 
  } else {
    // Call startNewTurn directly
    if(room.status === 'playing') {
        startNewTurn(room);
    } else {
        console.log(`[Room ${room.id}] Room status changed to ${room.status} before startNewTurn could be called.`);
    }
  }
}

// Also add log to endGame start
function endGame(room) {
    console.log(`[Room ${room.id}] --- Executing endGame ---`);
    
    if (room.timer) { clearInterval(room.timer); room.timer = null; }
    if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = null; } // Clear interval too

    broadcastSystemMessage(room, "Game Over! Final scores are being calculated.");

    // Update game status immediately
    room.status = 'ended';
    room.gameState.status = 'ended';
    
    // Ensure gameState exists before modifying
    room.gameState = room.gameState || {}; 
    room.gameState.status = 'ended';
    room.gameState.currentRound = 0; 
    room.gameState.turnWithinRound = 0; // Use consistent naming
    room.gameState.drawer = null;
    room.gameState.word = null;
    room.gameState.timeLeft = 0;
    room.isRoundActive = false;

    console.log(`Ending game in room ${room.id}`);
    
    // Sort players by score for the leaderboard
    const sortedPlayers = [...room.players]
        .filter(p => !p.disconnected)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .map(p => ({ // Map to the structure expected by the client component
            id: p.id,
            name: p.name,
            score: p.score || 0,
            isPartyLeader: p.isPartyLeader || false
        }));
  
    // Send final scores using the correct message type
    console.log(`[Room ${room.id}] Broadcasting gameLeaderboard.`);
    broadcastToRoom(room, {
      type: 'gameLeaderboard', // Correct type
      players: sortedPlayers
    });

    // Reset player states for the next potential game (isReady)
    room.players.forEach(p => {
      p.isReady = false;
      // Keep score until next game starts, reset drawing/guess status if needed
      p.hasGuessedCorrectly = false;
    });

    // Update clients with the final ended game state and player list (with isReady=false)
    broadcastGameState(room); // Sends gameState with status: 'ended'
    broadcastPlayerList(room); // Sends player list with isReady: false
    
    // Update global leaderboard (if implemented)
    // sortedPlayers.forEach(p => updateLeaderboard(p.name, p.score, 0)); // Assuming wordsGuessed is tracked elsewhere
}

function tryStartGame(room) {
    if (!room) return;

    const activePlayers = room.players.filter(p => !p.disconnected);
    const numPlayers = activePlayers.length;
    const allReady = numPlayers >= 2 && activePlayers.every(p => p.isReady);
    
    console.log(`[Room ${room.id}] tryStartGame check - Players: ${numPlayers}, All Ready: ${allReady}`);

    if (allReady && room.status === 'waiting') {
        room.status = 'playing'; 
        const maxRounds = room.settings.maxRounds;
        const totalTurns = maxRounds * numPlayers; // Correct total turns calculation

        console.log(`Starting game: ${maxRounds} rounds, ${numPlayers} players, ${totalTurns} total turns.`);
        
        room.gameState = {
           status: 'playing',
           currentRound: 0,
           turnWithinRound: -1, // Start at -1 so first turn becomes 0
           maxRounds: maxRounds, 
           totalTurns: totalTurns, // Store correct total turns
           timeLeft: room.settings.timePerRound,
           drawer: null,
           word: null
        };
        room.isRoundActive = false;

        startNewTurn(room); // Start the first turn

    } else if (room.status === 'waiting') {
        console.log(`[Room ${room.id}] Not starting game. Conditions not met.`);
    }
}

// Generate a 4-digit numerical room ID
function generateRoomId() {
    // Generate a 4-digit number (1000-9999)
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Define the createNewRoom helper function
function createNewRoom(roomId) {
    console.log(`Creating new room structure for ${roomId}`);
    return {
        id: roomId,
        players: [],
        settings: { ...DEFAULT_SETTINGS }, // Deep copy default settings
        status: 'waiting',
        gameState: { // Initialize gameState properly
            status: 'waiting',
            currentRound: 0,
            turnWithinRound: -1, // Initialize turn index
            maxRounds: DEFAULT_SETTINGS.maxRounds,
            totalTurns: 0,
            timeLeft: 0,
            drawer: null,
            word: null
        },
        // Remove redundant top-level state properties if gameState holds them
        // currentRound: 0, 
        // maxRounds: DEFAULT_SETTINGS.maxRounds,
        // timeLeft: 0,
        isRoundActive: false,
        currentWord: null,
        currentDrawer: null,
        timer: null, // For round timer
        timerInterval: null // For decrementing timer display
    };
}

// --- Refactored Message Handlers (Exported) ---
export function handleJoin(ws, message, rooms, totalConnections) {
    const { roomId: targetRoomId, playerName } = message;
    let roomId = targetRoomId;
    let room;

    // Validate player name
    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0 || playerName.length > 15) {
        safeSend(ws, { type: "error", content: "Invalid player name." });
        ws.close(1008, "Invalid player name");
        return;
    }
    const cleanedPlayerName = playerName.trim();

    // Find or create room
    if (!roomId) {
        roomId = generateRoomId();
        console.log(`No room ID provided, generated new room ID: ${roomId}`);
    }

    if (rooms.has(roomId)) {
        room = rooms.get(roomId);
    } else {
        console.log(`Creating new room ${roomId}`);
        room = createNewRoom(roomId);
        rooms.set(roomId, room);
    }

    // Check if room is full (Example: limit to 10 players)
    if (room.players.filter(p => !p.disconnected).length >= 10) {
        safeSend(ws, { type: "error", content: "Room is full." });
        ws.close(1008, "Room full");
        return;
    }

    // Check for existing player name
    if (room.players.some(p => !p.disconnected && p.name === cleanedPlayerName)) {
         safeSend(ws, { type: "error", content: "Player name already taken in this room." });
         ws.close(1008, "Name taken");
         return;
    }

    // Create the new player object
    const newPlayer = {
        id: generateUniquePlayerId(),
        name: cleanedPlayerName,
        score: 0,
        isReady: false,
        hasGuessedCorrectly: false,
        isPartyLeader: false, // Initially set to false
        ws: ws,
        lastActive: Date.now(),
        disconnected: false
    };

    // Add player to room BEFORE assigning leader
    room.players.push(newPlayer);

    // Assign leader status reliably
    // Check if there are any *other* active leaders
    const otherActiveLeaders = room.players.filter(p => p.id !== newPlayer.id && !p.disconnected && p.isPartyLeader);
    if (otherActiveLeaders.length === 0) {
        // If no other active leader, this new player becomes the leader
        newPlayer.isPartyLeader = true;
        console.log(`[Room ${roomId}] Assigned ${newPlayer.name} (ID: ${newPlayer.id}) as Party Leader (no other active leaders).`);
    } else {
        console.log(`[Room ${roomId}] ${newPlayer.name} (ID: ${newPlayer.id}) joined. Leader is already ${otherActiveLeaders[0].name}.`);
    }
    
    // Link WebSocket to player and room
    ws.roomId = roomId;
    ws.playerId = newPlayer.id;
    ws.playerName = newPlayer.name;

    console.log(`[Room ${roomId}] ${newPlayer.name} (ID: ${newPlayer.id}) joined. Leader: ${newPlayer.isPartyLeader}. Total players: ${room.players.filter(p => !p.disconnected).length}`);

    // Send confirmation and initial state to the new player
    safeSend(ws, {
        type: "joined",
        roomId,
        playerDetails: { 
            id: newPlayer.id, 
            name: newPlayer.name, 
            isPartyLeader: newPlayer.isPartyLeader 
        },
        settings: room.settings
    });
    sendGameState(room, newPlayer); // Send initial game state

    // Broadcast updated player list to everyone
    broadcastPlayerList(room);
    broadcastSystemMessage(room, `${newPlayer.name} has joined the room.`);
}

export function handlePlayerLeave(ws, rooms) {
    const roomId = ws.roomId;
    const playerId = ws.playerId;
    
    if (!roomId || !playerId || !rooms.has(roomId)) {
        console.log(`Attempted to handle leave for unknown player/room. PlayerID: ${playerId}, RoomID: ${roomId}`);
        return;
    }

    const room = rooms.get(roomId);
    const leavingPlayerIndex = room.players.findIndex(p => p.id === playerId);

    if (leavingPlayerIndex === -1) {
        console.log(`Player ${playerId} not found in room ${roomId} during leave.`);
        return; // Player already removed or never existed
    }

    const leavingPlayer = room.players[leavingPlayerIndex];
    
    // Mark as disconnected instead of immediate removal
    leavingPlayer.disconnected = true;
    leavingPlayer.isReady = false; // Mark as not ready
    const wasLeader = leavingPlayer.isPartyLeader;
    leavingPlayer.isPartyLeader = false; // Ensure they are no longer leader

    console.log(`[Room ${roomId}] Player ${leavingPlayer.name} (ID: ${playerId}) marked as disconnected. Was leader: ${wasLeader}.`);
    broadcastSystemMessage(room, `${leavingPlayer.name} has left the room.`);

    // Assign a new leader if the leaving player was the leader
    if (wasLeader) {
        assignNewPartyLeader(room);
    }

    // Check game state implications
    const activePlayers = room.players.filter(p => !p.disconnected);
    if (room.status === 'playing' && activePlayers.length < 2) {
        console.log(`[Room ${roomId}] Not enough players to continue after leave. Ending game.`);
        broadcastSystemMessage(room, "Not enough players left. Game ending.");
        endGame(room); // End the game if < 2 players remain
    } else if (room.status === 'playing' && leavingPlayer === room.currentDrawer) {
        console.log(`[Room ${roomId}] Drawer left. Ending current round.`);
        broadcastSystemMessage(room, "The drawer left. Ending round.");
        endRound(room); // End the current round if the drawer leaves
    } else {
        // If game continues or is waiting, just update lists
        broadcastPlayerList(room); // Update player list for everyone
        // Optionally, check if all remaining players ready if in waiting state
        if (room.status === 'waiting') {
             tryStartGame(room);
        }
    }
    
    // Clean up the room if it becomes empty after a delay
    // This happens in the interval cleanup or if another player leaves
}

export function handleReady(ws, data, rooms) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  const player = room && ws.playerId ? room.players.find(p => p.id === ws.playerId && !p.disconnected) : null;
  if (!room || !player || room.status === 'playing') {
      console.log(`[Room ${ws.roomId}] Ready toggle rejected (player: ${player?.name}, status: ${room?.status})`);
    return;
  }
  
  player.isReady = !player.isReady;
  console.log(`Player ${player.name} (ID: ${player.id}) is now ${player.isReady ? 'ready' : 'not ready'}`);
  broadcastSystemMessage(room, `${player.name} is ${player.isReady ? 'ready!' : 'no longer ready.'}`);
    broadcastPlayerList(room);
  tryStartGame(room); // Check if game can start now
}

export function handleGameSettings(ws, data, rooms) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    const player = room && ws.playerId ? room.players.find(p => p.id === ws.playerId && !p.disconnected) : null;
    if (!room || !player || !player.isPartyLeader) { 
        console.log(`[Room ${ws.roomId}] Settings update rejected: Player ${player?.name} (ID: ${ws.playerId}) is not party leader or invalid state.`);
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', content: 'Only the party leader can change settings.'}));
    return;
  }
  
    // Prevent settings changes while game is playing
    if (room.status === 'playing') {
         console.log(`[Room ${ws.roomId}] Settings update rejected: Game is in progress.`);
         if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', content: 'Cannot change settings while a game is in progress.'}));
    return;
  }
  
    const newSettings = data.settings;
    // Validate and apply settings - use maxRounds
    room.settings.maxRounds = Math.min(20, Math.max(1, parseInt(newSettings.maxRounds) || room.settings.maxRounds));
    room.settings.timePerRound = Math.min(180, Math.max(30, parseInt(newSettings.timePerRound) || room.settings.timePerRound));
    room.settings.customWords = Array.isArray(newSettings.customWords) ? newSettings.customWords.map(w => String(w).trim()).filter(w => w) : room.settings.customWords;
    room.settings.useOnlyCustomWords = typeof newSettings.useOnlyCustomWords === 'boolean' ? newSettings.useOnlyCustomWords : room.settings.useOnlyCustomWords;
    
    // Update maxRounds in gameState if it exists (for waiting state)
    if (room.gameState) {
        room.gameState.maxRounds = room.settings.maxRounds;
    }
    
    console.log(`[Room ${room.id}] Settings updated by leader ${player.name}:`, room.settings);
  
  // Broadcast updated settings to all players
    broadcastToRoom(room, { type: 'gameSettings', settings: room.settings });
    broadcastSystemMessage(room, `${player.name} updated the game settings.`);
}

export function handleLeave(ws, rooms) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    const player = room && ws.playerId ? room.players.find(p => p.id === ws.playerId && !p.disconnected) : null;
    if (!room || !player) return;
    console.log(`Player ${player.name} (ID: ${player.id}) requested to leave room ${room.id}`);
    handlePlayerLeave(ws, rooms);
    if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "User left room");
    }
}

export function handleDrawAction(ws, data, rooms) { // Covers draw, clear, pathStart, pathEnd
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    const player = room && ws.playerId ? room.players.find(p => p.id === ws.playerId && !p.disconnected) : null;
    if (!room || !player) return;
    if (player !== room.currentDrawer) return;
    
    const eventData = { ...data, timestamp: Date.now(), drawerId: player.id };
    // Broadcast only to non-drawer players
    room.players.forEach(p => {
        if (p.id !== player.id && p.ws && p.ws.readyState === WebSocket.OPEN && !p.disconnected) {
            try { p.ws.send(JSON.stringify(eventData)); }
            catch (error) { console.error(`Error sending ${data.type} data to ${p.name} (ID: ${p.id}):`, error); }
        }
    });
}

// Modify handleGuess for generic incorrect message
export function handleGuess(ws, data, rooms) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room || room.status !== 'playing') return;
  
  const playerId = ws.playerId;
  const player = room.players.find(p => p.id === playerId && !p.disconnected);
  if (!player || player.isDrawing) return;
  
  const guess = data.guess?.trim().toLowerCase();
  if (!guess || guess.length < 1) return;
  
  console.log(`Player ${player.name} guessed: ${guess}`);
  
  if (player.hasGuessedCorrectly || player.correctGuess) {
    console.log(`Player ${player.name} already guessed correctly, ignoring`);
    return;
  }
  
  const currentWord = room.currentWord?.toLowerCase();
  if (!currentWord) {
    console.error(`No current word found for room ${room.id}`);
    return;
  }
  
  const calculateScore = () => {
    const baseScore = 100;
    const turnDuration = room.settings.timePerRound;
    const timeLeft = room.timeLeft || 0;
    const timeBonus = Math.floor((timeLeft / turnDuration) * 100);
    return baseScore + timeBonus;
  };
  
  const isCorrect = guess === currentWord;
  if (isCorrect) {
    // ... (Correct guess logic remains the same) ...
    player.score = (player.score || 0) + calculateScore();
    player.hasGuessedCorrectly = true;
    player.correctGuess = true;
    player.guessTime = Date.now();
    console.log(`Player ${player.name} guessed correctly! New score: ${player.score}`);
    broadcastSystemMessage(room, `${player.name} guessed the word! (+${calculateScore()} points)`);
    if (room.currentDrawer) {
        room.currentDrawer.score = (room.currentDrawer.score || 0) + 25;
        if (room.currentDrawer.ws && room.currentDrawer.ws.readyState === WebSocket.OPEN) {
            room.currentDrawer.ws.send(JSON.stringify({ type: 'system', content: `+25 points for ${player.name} guessing your drawing!` }));
        }
    }
  broadcastPlayerList(room);
    if (checkAllPlayersGuessed(room)) {
        console.log(`All players have guessed correctly in room ${room.id}. Ending round early.`);
        setTimeout(() => { endRound(room); }, 1000);
    }

  } else {
    // Incorrect Guess Logic:
    
    // 1. Broadcast generic message to OTHERS
    broadcastToRoom(room, {
      type: 'chat', 
      id: `guess_incorrect_${Date.now()}_${player.id}`,
      playerName: 'System', // Send as System message
      content: `${player.name} guessed incorrectly.`, // Generic message
      timestamp: Date.now(),
      messageType: 'incorrect_guess_notification' 
    }, player.ws); // Exclude the guesser
    
    // 2. Send the actual incorrect guess privately to the GUESSER
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: 'chat',
        id: `guess_self_${Date.now()}_${player.id}`,
        playerName: player.name, 
        content: guess, // Show their actual guess
        timestamp: Date.now(),
        messageType: 'incorrect_guess_self' // Special type for self
      }));
    }
    
    console.log(`Player ${player.name} guessed incorrectly.`);
  }
}

export function handleChat(ws, data, rooms) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    const player = room && ws.playerId ? room.players.find(p => p.id === ws.playerId && !p.disconnected) : null;
    if (!room || !player) return;

    const messageContent = (data.content || '').trim();
    if (!messageContent) return; // Ignore empty messages

    // Prevent drawer from chatting during the game (optional, depends on game rules)
    // if (room.status === 'playing' && player.isDrawing) {
    //     // Optionally send an error back to the drawer
    //     // ws.send(JSON.stringify({ type: 'error', content: 'You cannot chat while drawing.' }));
    //     // console.log(`[Room ${ws.roomId}] Drawer ${player.name} tried to chat.`);
    //     // return;
    // }

    console.log(`[Room ${ws.roomId}] Chat from ${player.name}: ${messageContent}`);

    broadcastToRoom(room, {
        id: generateUniquePlayerId(),
        type: 'chat', // Explicitly set type to 'chat'
        playerName: player.name,
        content: messageContent,
        timestamp: Date.now()
    });
}

export function handleStartNewGameRequest(ws, data, rooms) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    const player = room && ws.playerId ? room.players.find(p => p.id === ws.playerId && !p.disconnected) : null;
    if (!room || !player) return;
    // ... rest of handleStartNewGameRequest logic ...
    // Check leader, check player count, reset states, call tryStartGame
}

// Update handleKickPlayer to allow kicking mid-game
export function handleKickPlayer(ws, data, rooms) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    const player = room && ws.playerId ? room.players.find(p => p.id === ws.playerId && !p.disconnected) : null;
    
    // Allow kicking even if room.status is 'playing'
    if (!room || !player || !player.isPartyLeader) { 
        console.log(`[Room ${ws.roomId}] Kick rejected (player: ${player?.name}, leader: ${player?.isPartyLeader})`);
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', content: 'Only the party leader can kick players.'}));
        return;
    }

    const playerNameToKick = data.playerToKick;
    if (!playerNameToKick || playerNameToKick === player.name) { // Prevent self-kick
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', content: 'Invalid player name to kick.'}));
      return;
  }
  
    const playerToKickIndex = room.players.findIndex(p => p.name === playerNameToKick && !p.disconnected);
    if (playerToKickIndex === -1) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', content: `Player '${playerNameToKick}' not found or already disconnected.`}));
    return;
  }
  
    const playerToKick = room.players[playerToKickIndex];
    console.log(`[Room ${room.id}] Party leader ${player.name} is kicking ${playerToKick.name}`);

    // Send kick message to the kicked player
    if (playerToKick.ws && playerToKick.ws.readyState === WebSocket.OPEN) {
        playerToKick.ws.send(JSON.stringify({ type: 'kicked', reason: 'Kicked by the party leader.' }));
        // Close their connection after a short delay to ensure message is sent
        setTimeout(() => {
            if (playerToKick.ws && playerToKick.ws.readyState !== WebSocket.CLOSED) {
                playerToKick.ws.close(4003, 'Kicked by leader');
            }
        }, 500);
    }

    // Mark as disconnected and handle leave logic (which handles game state)
    playerToKick.disconnected = true;
    handlePlayerLeave(playerToKick.ws, rooms); // Reuse the leave logic
    
    // Notify others
    broadcastSystemMessage(room, `${playerToKick.name} was kicked by the party leader.`);
}

// --- Exportable WebSocket Initialization Logic ---
export function runWebSocketServerLogic(wssInstance) {
  console.log('Initializing WebSocket server logic (Heartbeat, Cleanup)...');

  // --- Heartbeat and Cleanup Intervals --- 
  const cleanupInterval = setInterval(() => {
    // ... existing cleanup logic using `rooms` map ...
  }, 60000);

  const heartbeatInterval = setInterval(() => {
    // ... existing heartbeat logic ...
  }, 30000);

  wssInstance.on('close', () => {
    console.log('WebSocket server closing, clearing intervals.');
    clearInterval(heartbeatInterval);
    clearInterval(cleanupInterval);
  });

  console.log('WebSocket Heartbeat and Cleanup initialized.');

  // Return functions needed by server.js (if any beyond handlers)
  // We keep stats calculation here as it uses the global `rooms` map
  const serverStartTime = Date.now();
  function getServerStats() {
     const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
     const activeConnections = getActiveConnectionCount();
     const totalRoomsCount = rooms.size;
     const activeRoomsCount = Array.from(rooms.values()).filter(room => 
        room.players.some(p => !p.disconnected)
    ).length;
     return {
        uptime,
        totalConnections: totalConnectionCount,
        activeConnections,
        totalRooms: totalRoomsCount,
        activeRooms: activeRoomsCount,
        startTime: new Date(serverStartTime).toISOString(),
        defaultWords: DEFAULT_WORDS.length
      };
  }
  function getActiveConnectionCount() {
    let count = 0;
    rooms.forEach(room => {
  room.players.forEach(player => {
        if (player.ws && player.ws.readyState === WebSocket.OPEN && !player.disconnected) {
          count++;
        }
      });
    });
    return count;
  }
  
  // Return necessary functions/state if needed by server.js
  return {
      getServerStats,
      getActiveRoomsList: () => { /* Implement using global rooms map */ },
      // No need to return handlers as they are exported directly
  };
}

// ... Standalone server startup logic remains wrapped ...
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // ... Start standalone server ...
}

// Send the current player list to all connected clients in a room
function broadcastPlayerList(room) {
    if (!room || !room.players) return;
    
    // Only include non-disconnected players
    const playerData = room.players
        .filter(p => !p.disconnected)
        .map(p => ({
            id: p.id,
            name: p.name,
            score: p.score || 0,
            isReady: p.isReady || false,
            hasGuessedCorrectly: p.hasGuessedCorrectly || false,
            isPartyLeader: p.isPartyLeader || false
        }));
    
    console.log(`Broadcasting player list update for room ${room.id}: ${playerData.length} active players`);
    broadcastToRoom(room, { type: 'playerList', players: playerData });
}

// Broadcast game state to all players in a room
function broadcastGameState(room) {
    if (!room || !room.players) return;
    
    room.players.forEach(player => {
        if (player && !player.disconnected && player.ws && player.ws.readyState === WebSocket.OPEN) {
            sendGameState(room, player);
        }
    });
}