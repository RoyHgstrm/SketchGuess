import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "@remix-run/react";
import React from 'react';
import NotificationSystem, { useNotifications } from "~/components/NotificationSystem";
import ConnectionStatus from "~/components/ConnectionStatus";
import ChatSystem from "~/components/ChatSystem";
import PlayerList from "~/components/PlayerList";
import DrawingCanvas from "~/components/DrawingCanvas";
import GameLeaderboard from "~/components/GameLeaderboard";
import { useWebSocket } from "~/context/WebSocketContext";
import WebSocketErrorBoundary from "~/components/WebSocketErrorBoundary";

// Custom styles
const styles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.5);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.7);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
  }

  .animate-slide-in {
    animation: slideIn 0.3s ease-out forwards;
  }

  .hover-scale {
    transition: transform 0.2s ease-out;
  }

  .hover-scale:hover {
    transform: scale(1.02);
  }
`;

// Add style tag to document
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);
}

export default function Room() {
  const params = useParams();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);
  const [playerName, setPlayerName] = useState<string>("");
  const [copiedState, setCopiedState] = useState(false);
  const { notifications, removeNotification } = useNotifications();
  const { 
    connect, 
    isConnected, 
    gameState, 
    players, 
    leaderboard,
    startNewGame 
  } = useWebSocket();

  // Add local state for leaderboard
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(params.roomId || "").then(() => {
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    }).catch(err => {
      console.error('Failed to copy room code: ', err);
    });
  }, [params.roomId]);

  useEffect(() => {
    // Get player name from session storage
    const savedName = sessionStorage.getItem("playerName");
    if (savedName) {
      setPlayerName(savedName);
      if (params.roomId) {
        connect(params.roomId, savedName);
      }
    } else {
      // If no name is saved, redirect to home
      navigate('/');
    }
  }, [navigate, params.roomId, connect]);

  // Effect to control leaderboard visibility based on context
  useEffect(() => {
    if (leaderboard && gameState?.status === 'ended') {
      setShowLeaderboard(true);
    } else {
      // Hide leaderboard if game is not ended or no leaderboard data
      setShowLeaderboard(false);
    }
  }, [leaderboard, gameState?.status]);

  // Define the handler to close the leaderboard (using local state)
  const handleCloseLeaderboard = useCallback(() => {
    setShowLeaderboard(false); // Set local state to hide
  }, []); // No dependencies needed

  return (
    <WebSocketErrorBoundary>
      <div className={`h-screen flex flex-col overflow-hidden ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        {/* Room Code Display */}
        <div className={`w-full py-1 px-2 md:py-2 md:px-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} flex items-center justify-between flex-wrap gap-2`}>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Room Code:</span>
              <button
                onClick={copyRoomCode}
                className={`px-3 py-1 rounded-lg font-mono text-lg font-bold relative transition-all duration-200 ${ 
                  darkMode ? 'bg-gray-700' : 'bg-white' 
                } ${ 
                  copiedState ? 'bg-green-500 text-white' : (darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100')
                }`}
              >
                {params.roomId}
                <span 
                  className={`absolute -bottom-7 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-white text-xs transition-opacity duration-300 ${ 
                    copiedState ? 'opacity-100 bg-green-600' : 'opacity-0' 
                  }`}
                >
                  Copied!
                </span>
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Players: {players.length}</span>
          </div>
        </div>

        {/* Game Status Banner */}
        {gameState && (
          <div className={`w-full py-2 text-center text-sm font-medium animate-fade-in ${
            gameState.status === 'waiting' ? 'bg-yellow-500/80 text-yellow-950' :
            gameState.status === 'playing' ? 'bg-green-500/80 text-green-950' :
            'bg-purple-500/80 text-purple-950'
          }`}>
            {gameState.status === 'playing' 
              ? `Round ${gameState.currentRound}/${gameState.maxRounds} - ${gameState.timeLeft}s left`
              : gameState.status === 'waiting'
              ? 'Waiting for players...'
              : 'Game ended!'
            }
          </div>
        )}
        
        {/* Main Game Container - Changed flex direction for mobile */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Player List (Order 1 on mobile) */}
          <div className="w-full md:w-1/4 p-2 md:p-4 order-1 md:order-1 h-auto md:h-full overflow-hidden">
            <div className={`rounded-xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} flex-1 flex flex-col h-full p-2 md:p-4 overflow-hidden`}>
              <PlayerList darkMode={darkMode} />
            </div>
          </div>
          
          {/* Drawing Canvas (Order 3 on mobile) */}
          <div className="flex-1 p-2 md:p-4 order-3 md:order-2 flex justify-center items-center overflow-hidden min-h-0">
            <div className={`w-full h-full ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-1 md:p-4 flex justify-center items-center`}>
              <DrawingCanvas darkMode={darkMode} />
            </div>
          </div>
          
          {/* Chat System (Order 2 on mobile) */}
          <div className="w-full md:w-64 p-2 md:p-4 order-2 md:order-3 h-1/3 md:h-full flex flex-col overflow-hidden min-h-0">
            <div className={`rounded-xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} flex-1 flex flex-col h-full overflow-hidden`}>
              <ChatSystem darkMode={darkMode} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Connection Status */}
      <ConnectionStatus darkMode={darkMode} />
      
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        onDismiss={removeNotification} 
      />

      {/* Game Leaderboard - Show based on local state */}
      {showLeaderboard && leaderboard && (
        <GameLeaderboard 
          players={leaderboard} 
          darkMode={darkMode}
          onClose={handleCloseLeaderboard} // Pass the handler that updates local state
        />
      )}
    </WebSocketErrorBoundary>
  );
} 