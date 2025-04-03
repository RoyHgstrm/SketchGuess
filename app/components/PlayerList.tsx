import React, { useState } from 'react';
import { useWebSocket } from '~/context/WebSocketContext';
import GameSettings from './GameSettings';

interface PlayerListProps {
  darkMode: boolean;
}

// Player List Component
const PlayerList: React.FC<PlayerListProps> = ({ darkMode }) => {
  const { 
    players, 
    currentPlayer, 
    gameState, 
    gameSettings, 
    handleReady, 
    updateGameSettings,
    kickPlayer
  } = useWebSocket();

  // Only use currentPlayer.id for comparison to prevent UI glitches
  const currentPlayerId = currentPlayer?.id;

  // Sort players: party leader first, then current drawer, then by score
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isPartyLeader !== b.isPartyLeader) return a.isPartyLeader ? -1 : 1;
    if (a.isDrawing !== b.isDrawing) return a.isDrawing ? -1 : 1;
    return b.score - a.score;
  });

  const allPlayersReady = players.every(p => p.isReady);
  const amIReady = currentPlayer?.isReady || false;
  const amIPartyLeader = currentPlayer?.isPartyLeader || false;
  const minPlayers = 2;
  const canStartGame = players.length >= minPlayers && allPlayersReady;
  const isGameInProgress = gameState?.status === 'playing';
  const isGameEnded = gameState?.status === 'ended';

  const handleKickPlayer = (playerName: string) => {
    if (amIPartyLeader && playerName !== currentPlayer?.name) {
      if (window.confirm(`Are you sure you want to kick ${playerName} from the room?`)) {
        kickPlayer(playerName);
      }
    }
  };

  return (
    <div className="h-full flex flex-col p-2 md:p-4">
      {/* Header */}
      <div className="mb-2 md:mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Players</h3>
          {!isGameInProgress && !isGameEnded && (
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${
                canStartGame ? 'text-green-500' : 
                players.length < minPlayers ? 'text-yellow-500' : 
                'text-blue-500'
              }`}>
                {canStartGame ? 'Ready to Start!' : 
                 players.length < minPlayers ? `Need ${minPlayers - players.length} more player${minPlayers - players.length === 1 ? '' : 's'}` : 
                 'Waiting for players...'}
              </span>
            </div>
          )}
          {isGameInProgress && (
            <div className="text-sm text-green-400">Game in progress</div>
          )}
          {isGameEnded && (
            <div className="text-sm text-purple-400">Game Ended</div>
          )}
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <span>{players.length} player{players.length !== 1 ? 's' : ''} in room</span>
          {!isGameInProgress && !isGameEnded && (
            <>
              <span>•</span>
              <span>{players.filter(p => p.isReady).length} ready</span>
            </>
          )}
          {isGameInProgress && (
            <>
              <span>•</span>
              <span>Round {gameState?.currentRound || 0}/{gameState?.maxRounds || 0}</span>
            </>
          )}
          {isGameEnded && (
             <>
               <span>•</span>
               <span>Final Scores</span>
             </>
          )}
        </div>
      </div>

      {/* Party Leader Badge - Show if user is party leader */}
      {amIPartyLeader && (
        <div className="mb-2 md:mb-4 py-2 px-4 bg-indigo-600/20 border border-indigo-600/30 rounded-lg text-center">
          <span className="text-indigo-400 font-medium flex items-center justify-center">
            <span className="mr-2">👑</span> You are the Party Leader
          </span>
          <p className="text-xs text-gray-400 mt-1">You can {isGameInProgress ? 'kick players' : 'change game settings and kick players'}</p>
        </div>
      )}

      {/* Game Settings */}
      {amIPartyLeader && !isGameInProgress && (
        <div className="mb-4">
          <GameSettings
            settings={gameSettings}
            onUpdate={updateGameSettings}
            darkMode={darkMode}
          />
        </div>
      )}

      {/* Ready Button - only show when not in a game */}
      {!isGameInProgress && !isGameEnded && (
        <button
          onClick={handleReady}
          className={`mb-2 md:mb-4 w-full py-3 px-4 rounded-lg transition-all ${
            amIReady
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          } relative overflow-hidden group`}
        >
          <div className="relative z-10 flex items-center justify-center">
            {amIReady ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Ready!
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Click when Ready
              </>
            )}
          </div>
          <div className={`absolute inset-0 transition-transform duration-300 ${
            amIReady ? 'translate-x-0' : '-translate-x-full'
          } bg-opacity-20 bg-white`} />
        </button>
      )}

      {/* Game Stats - show when in game */}
      {isGameInProgress && (
        <div className="mb-2 md:mb-4 p-3 rounded-lg bg-gray-700/30 border border-gray-600/30">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-300">Round</div>
              <div className="text-xl font-bold">{gameState?.currentRound || 0}/{gameState?.maxRounds || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-300">Time Left</div>
              <div className="text-xl font-bold">{gameState?.timeLeft || 0}s</div>
            </div>
          </div>
        </div>
      )}

      {/* Player List */}
      <div className="flex-1 overflow-y-auto space-y-1 md:space-y-2 pr-1 md:pr-2 custom-scrollbar">
        {sortedPlayers.map((player) => (
          <div
            key={player.id}
            className={`flex items-center justify-between p-2 md:p-4 rounded-lg transition-all ${
              player.name === currentPlayer?.name ? 'ring-2 ring-indigo-500 ring-opacity-50' : ''
            } ${
              player.isPartyLeader ? 'bg-indigo-500/20 border border-indigo-500/30' :
              player.isDrawing ? 'bg-green-500/20 border border-green-500/30' : 
              player.hasGuessedCorrectly && isGameInProgress ? 'bg-blue-500/20 border border-blue-500/30' :
              isGameEnded ? 'bg-gray-500/20 border border-gray-500/30' :
              'bg-gray-500/10 border border-gray-500/30'
            } relative group hover:transform hover:scale-[1.02] hover:shadow-lg transition-all duration-200`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                isGameEnded ? 'bg-purple-500' :
                isGameInProgress 
                  ? (player.hasGuessedCorrectly ? 'bg-blue-500' : 'bg-gray-500') 
                  : (player.isReady ? 'bg-green-500' : 'bg-yellow-500')
              }`} />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm md:text-base">{player.name}</span>
                  {player.isPartyLeader && (
                    <span className="text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full text-xs" title="Party Leader">👑 Leader</span>
                  )}
                  {player.isDrawing && isGameInProgress && (
                    <span className="text-green-400 animate-bounce" title="Currently Drawing">✏️</span>
                  )}
                  {player.name === currentPlayer?.name && (
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">You</span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  {!isGameInProgress && !isGameEnded && (
                    <span>{player.isReady ? 'Ready' : 'Not Ready'}</span>
                  )}
                  {isGameInProgress && player.hasGuessedCorrectly && (
                    <span className="text-blue-400">Guessed correctly!</span>
                  )}
                  {isGameInProgress && player.isDrawing && (
                    <span className="text-green-400">Drawing now</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="font-bold text-base md:text-lg">{player.score}</div>
                <div className="text-xs text-gray-400">points</div>
              </div>
              
              {/* Kick button - only show if I'm the party leader and this isn't me */}
              {amIPartyLeader && player.id !== currentPlayerId && !isGameInProgress && (
                <button
                  onClick={() => handleKickPlayer(player.name)}
                  className="p-1.5 rounded-full hover:bg-red-500/20 text-red-400 transition-colors"
                  title={`Kick ${player.name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList; 