import { useState, useEffect } from "react";
import { useNavigate } from "@remix-run/react";

export default function Index() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Check for system dark mode preference
  useEffect(() => {
    // Default to dark mode
    setDarkMode(true);
    document.documentElement.classList.toggle('dark', true);
    
    // Check if player name is in session storage
    const savedName = sessionStorage.getItem("playerName");
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
  };

  const generateRandomRoomCode = () => {
    // Generate a random 4-digit number between 1000 and 9999
    const roomCode = Math.floor(Math.random() * 9000) + 1000;
    // Convert to string and ensure it's 4 digits
    setRoomCode(roomCode.toString());
  };

  const validateInputs = () => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return false;
    }
    return true;
  };

  const createNewGame = () => {
    if (!validateInputs()) return;

    setIsCreatingGame(true);
    setError("");
    
    try {
      // Generate a random room code if not already set
      const finalRoomCode = roomCode.trim() || generateRandomRoomCode();
      
      // Store player name in session storage
      sessionStorage.setItem("playerName", playerName);
      console.log("Creating new game with room code:", finalRoomCode);
      
      // Navigate to the room
      navigate(`/room/${finalRoomCode}`);
    } catch (error) {
      console.error("Error creating game:", error);
      setError("Error creating game. Please try again.");
      setIsCreatingGame(false);
    }
  };

  const joinExistingGame = () => {
    if (!validateInputs()) return;
    
    if (!roomCode.trim()) {
      setError("Please enter a room code to join");
      return;
    }

    setIsJoiningGame(true);
    setError("");
    
    try {
      // Store player name in session storage
      sessionStorage.setItem("playerName", playerName);
      console.log("Joining game with room code:", roomCode);
      
      // Navigate to the room
      navigate(`/room/${roomCode}`);
    } catch (error) {
      console.error("Error joining game:", error);
      setError("Error joining game. Please try again.");
      setIsJoiningGame(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-purple-50 text-gray-800'}`}>
      {/* Header with theme toggle */}
      <header className={`w-full p-4 flex justify-between items-center ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
          SketchGuess
        </h1>
        <button 
          onClick={toggleDarkMode}
          className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-100 text-gray-700'}`}
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </header>

      <main className="flex-grow flex flex-col md:flex-row items-center justify-center p-4 gap-8">
        {/* Left side - Game info */}
        <div className="w-full md:w-1/2 max-w-lg">
          <div className={`relative overflow-hidden rounded-2xl shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full opacity-30"></div>
            <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-gradient-to-tr from-pink-500 to-orange-500 rounded-full opacity-30"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4">Draw, Guess, Win!</h2>
              <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Join friends in this fun drawing and guessing game. One player draws, others guess!
              </p>
              
              <div className="space-y-4">
                <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} flex items-center`}>
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium">Draw</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Get creative with drawing tools</p>
                  </div>
                </div>
                
                <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} flex items-center`}>
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium">Guess</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Race to identify the drawing first</p>
                  </div>
                </div>
                
                <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} flex items-center`}>
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium">Win</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Earn points and climb the leaderboard</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Join/Create game */}
        <div className="w-full md:w-1/2 max-w-md">
          <div className={`rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-8`}>
            <h2 className="text-2xl font-bold mb-6 text-center">Play Now</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg border border-red-200">
                {error}
              </div>
            )}
            
            <div className="space-y-6">
              <div>
                <label htmlFor="playerName" className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Your Name
                </label>
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              </div>
              
              <div>
                <label htmlFor="roomCode" className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Room Code
                </label>
                <div className="flex">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    id="roomCode"
                    value={roomCode}
                    onChange={(e) => {
                      // Only allow numbers and limit to 4 digits
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setRoomCode(value);
                    }}
                    placeholder="Enter 4-digit code"
                    className={`flex-1 px-4 py-3 rounded-l-lg border-y border-l ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    style={{ borderRight: 0 }}
                    maxLength={4}
                  />
                  <button
                    type="button"
                    onClick={generateRandomRoomCode}
                    className="px-4 py-3 rounded-r-lg border bg-indigo-500 text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Random
                  </button>
                </div>
                <p className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Leave empty to create a random room code
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={createNewGame}
                  disabled={isCreatingGame}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-lg transform transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingGame ? 'Creating...' : 'Create Game'}
                </button>
                
                <button
                  type="button"
                  onClick={joinExistingGame}
                  disabled={isJoiningGame || !roomCode.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg transform transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoiningGame ? 'Joining...' : 'Join Game'}
                </button>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                By playing, you agree to draw responsibly and have fun!
              </p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className={`p-6 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <p className="text-sm">
          © {new Date().getFullYear()} SketchGuess • Made with ❤️
        </p>
      </footer>
    </div>
  );
} 