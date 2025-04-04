import React from 'react';

interface LeaderboardPlayer {
  id: string;
  name: string;
  score: number;
  isPartyLeader: boolean;
}

interface GameLeaderboardProps {
  players: LeaderboardPlayer[];
  darkMode: boolean;
  onClose: () => void;
}

const GameLeaderboard: React.FC<GameLeaderboardProps> = ({ players, darkMode, onClose }) => {
  // Sort players by score in descending order
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  // Determine winners (in case of tie for first place)
  const highestScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;
  const winners = sortedPlayers.filter(player => player.score === highestScore);
  
  // Award emojis based on placement
  const getPlacementEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🏅';
    }
  };

  const handleContinue = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`relative w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      } animate-scale-in`}>
        {/* Header with confetti effect */}
        <div className={`relative py-6 px-8 ${
          darkMode ? 'bg-indigo-900' : 'bg-indigo-600'
        } text-white`}>
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div 
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: ['#FFD700', '#FF4500', '#7CFC00', '#FF69B4', '#1E90FF'][Math.floor(Math.random() * 5)],
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 10 + 5}px`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '0',
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${Math.random() * 3 + 3}s`
                }}
              />
            ))}
          </div>
          <h2 className="relative text-center text-2xl font-bold tracking-wider">GAME OVER!</h2>
          <p className="relative text-center mt-1 text-indigo-200">Final Standings</p>
        </div>

        {/* Leaderboard content */}
        <div className="py-6 px-8">
          {winners.length > 0 && (
            <div className={`mb-6 p-4 rounded-lg text-center ${darkMode ? 'bg-indigo-900/20' : 'bg-indigo-100'}`}>
              <p className="text-lg">
                {winners.length === 1 
                  ? <span>🎉 <strong>{winners[0].name}</strong> wins the game! 🎉</span>
                  : <span>🎉 It's a tie between {
                      winners.map((w, i) => (
                        <React.Fragment key={w.id}>
                          {i > 0 && <span>{i === winners.length - 1 ? ' and ' : ', '}</span>}
                          <strong>{w.name}</strong>
                        </React.Fragment>
                      ))
                    }! 🎉</span>
                }
              </p>
            </div>
          )}

          <div className="space-y-3">
            {sortedPlayers.map((player, index) => (
              <div 
                key={player.id}
                className={`flex items-center p-4 rounded-lg ${
                  index === 0 
                    ? darkMode ? 'bg-yellow-900/30 border border-yellow-800' : 'bg-yellow-100 border border-yellow-300'
                    : darkMode ? 'bg-gray-700/30 border border-gray-700' : 'bg-gray-100 border border-gray-200'
                } ${
                  index === 0 ? 'animate-pulse-soft' : ''
                }`}
              >
                <div className="flex-shrink-0 text-2xl mr-3">
                  {getPlacementEmoji(index)}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="font-medium text-lg">{player.name}</span>
                    {player.isPartyLeader && (
                      <span className="ml-2 text-indigo-400 text-xs bg-indigo-500/20 px-2 py-0.5 rounded-full">👑 Leader</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{player.score}</div>
                    <div className="text-xs opacity-70">points</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* New game button */}
          <div className="mt-8 text-center">
            <button
              onClick={handleContinue}
              className={`py-3 px-8 rounded-lg ${
                darkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-700' 
                  : 'bg-indigo-500 hover:bg-indigo-600'
              } text-white font-medium transition-colors`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLeaderboard;