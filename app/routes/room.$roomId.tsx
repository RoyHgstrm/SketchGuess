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
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
  const { notifications, removeNotification } = useNotifications();
  const { 
    connect, 
    isConnected, 
    gameState, 
    players, 
    leaderboard,
    startNewGame 
  } = useWebSocket();

  // Add copy functions
  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(params.roomId || "");
    setShowCopiedTooltip(true);
    setTimeout(() => setShowCopiedTooltip(false), 2000);
  }, [params.roomId]);

  const copyRoomLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopiedTooltip(true);
    setTimeout(() => setShowCopiedTooltip(false), 2000);
  }, []);

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

  return (
    <WebSocketErrorBoundary>
      <div className={`h-screen flex flex-col overflow-hidden ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        {/* Room Code Display */}
        <div className={`w-full py-2 px-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} flex items-center justify-between`}>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Room Code:</span>
              <div className="relative">
                <button
                  onClick={copyRoomCode}
                  className={`px-3 py-1 rounded-lg font-mono text-lg font-bold ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'
                  } transition-colors`}
                >
                  {params.roomId}
                  <span className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded bg-black text-white text-xs ${
                    showCopiedTooltip ? 'opacity-100' : 'opacity-0'
                  } transition-opacity`}>
                    Copied!
                  </span>
                </button>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={copyRoomLink}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'
                } transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Share Link</span>
                <span className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded bg-black text-white text-xs ${
                  showCopiedTooltip ? 'opacity-100' : 'opacity-0'
                } transition-opacity`}>
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
        
        {/* Main Game Container */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar - Players */}
          <div className="w-full md:w-1/4 p-4 flex flex-col h-full overflow-hidden">
            <div className={`rounded-xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} flex-1 flex flex-col overflow-hidden h-full animate-fade-in p-4`}>
              <PlayerList darkMode={darkMode} />
            </div>
          </div>
          
          {/* Main Content - Drawing Area */}
          <div className="flex-1 p-4">
            <div className={`w-full h-full ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
              <DrawingCanvas darkMode={darkMode} />
            </div>
          </div>
          
          {/* Right sidebar - Chat */}
          <div className="w-full md:w-64 p-4 flex flex-col h-full">
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

      {/* Game Leaderboard - Show when game ends and leaderboard is available */}
      {leaderboard && gameState?.status === 'ended' && (
        <GameLeaderboard 
          players={leaderboard} 
          darkMode={darkMode}
          onNewGame={startNewGame}
        />
      )}
    </WebSocketErrorBoundary>
  );
} 