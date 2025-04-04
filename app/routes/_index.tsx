import type { MetaFunction } from "@remix-run/node";
import { useState, useCallback } from "react";
import { useNavigate } from "@remix-run/react";

export const meta: MetaFunction = () => {
  const title = "SketchGuess - Real-Time Drawing & Guessing Game";
  const description = "Join or create a room and play a fun multiplayer drawing and guessing game with friends online. Free to play!";
  // const imageUrl = "https://yourdomain.com/og-image-home.jpg"; // Replace with your actual domain and image
  
  return [
    { title: title },
    { name: "description", content: description },
    // Open Graph / Facebook
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    // { property: "og:image", content: imageUrl },
    // { property: "og:url", content: "https://yourdomain.com/" }, // Optional: Explicit URL for homepage
    
    // Twitter
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    // { name: "twitter:image", content: imageUrl }, 
    // { name: "twitter:card", content: "summary_large_image" } // Default is already set in root
  ];
};

export default function Index() {
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode] = useState(true); // For simplicity, default to dark mode
  const navigate = useNavigate();

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const validateInput = () => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return false;
    }
    setError(null);
    return true;
  };

  const createRoom = useCallback(() => {
    if (!validateInput()) return;

    setIsCreating(true);
    const newRoomId = generateRoomId();
    
    // Save player name to session storage
    sessionStorage.setItem("playerName", playerName.trim());
    
    setTimeout(() => {
      setIsCreating(false);
      navigate(`/room/${newRoomId}`);
    }, 800);
  }, [navigate, playerName]);

  const joinRoom = useCallback(() => {
    if (!validateInput()) return;
    
    if (!roomId.trim()) {
      setError("Please enter a room code");
      return;
    }

    // Save player name to session storage
    sessionStorage.setItem("playerName", playerName.trim());
    navigate(`/room/${roomId.trim()}`);
  }, [roomId, navigate, playerName]);

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      {/* Hero section */}
      <div className="flex-1 flex flex-col md:flex-row items-center">
        {/* Left side - game description */}
        <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center">
          <div className="max-w-lg mx-auto md:mx-0">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient bg-300% animate-bg-scroll">
              SketchGuess
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-gray-600 dark:text-gray-300 leading-relaxed font-medium max-w-2xl">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Draw</span>, <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">guess</span>, and <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-indigo-400">have fun</span> with friends! A multiplayer drawing and guessing game where creativity meets competition.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900 p-3 text-indigo-600 dark:text-indigo-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Draw</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Take turns drawing words and watch others guess</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 rounded-full bg-purple-100 dark:bg-purple-900 p-3 text-purple-600 dark:text-purple-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Guess</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Guess what others are drawing to score points</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 rounded-full bg-green-100 dark:bg-green-900 p-3 text-green-600 dark:text-green-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Compete</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Climb the leaderboard and challenge your friends</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - join/create game */}
        <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center items-center ">
          <div className="w-full max-w-md p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-[1.01] hover:shadow-3xl">
            <h2 className="text-3xl font-extrabold mb-8 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Let's Play!
            </h2>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-300 rounded-xl text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="space-y-8">
              <div className="space-y-1">
                <label htmlFor="playerName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your Name
                </label>
                <input
                  id="playerName"
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200/70 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 bg-white/70 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400/70 backdrop-blur-sm"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="roomId" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Room Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400/80" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="roomId"
                    type="text"
                    placeholder="Enter room code"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') joinRoom();
                    }}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200/70 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 bg-white/70 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400/70 backdrop-blur-sm"
                  />
                </div>
              </div>
              
              <button
                onClick={joinRoom}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/50 active:scale-95"
              >
                Join Room
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300/50 dark:border-gray-600/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 backdrop-blur-sm">or</span>
                </div>
              </div>
              
              <button
                onClick={createRoom}
                disabled={isCreating}
                className={`w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500/50 active:scale-95 ${
                  isCreating ? 'opacity-80 cursor-not-allowed' : ''
                }`}
              >
                {isCreating ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Room...
                  </div>
                ) : 'Create New Room'}
              </button>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400/80">
              © {new Date().getFullYear()} SketchGuess | All rights reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 