import { useEffect, useState } from "react";
import { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "SketchGuess Admin - Game Statistics" },
    { name: "description", content: "Admin dashboard for the SketchGuess drawing game" },
  ];
};

// Types for our statistics
interface PlayerStats {
  playerName: string;
  score: number;
  gamesPlayed: number;
  wordsGuessed: number;
  date: string;
}

interface RoomPlayer {
  name: string;
  score: number;
  isReady: boolean;
  isDrawing?: boolean;
  correctGuess?: boolean;
}

interface Room {
  roomId: string;
  playerCount: number;
  isActive: boolean;
  currentRound?: number;
  maxRounds?: number;
  timeLeft?: number;
  players?: RoomPlayer[];
  currentWord?: string;
  settings?: {
    maxRounds: number;
    timePerRound: number;
    customWords: string[] | null;
    useOnlyCustomWords?: boolean;
  };
}

interface ServerStats {
  uptime: number;
  totalConnections: number;
  activeConnections: number;
  totalRooms: number;
  activeRooms: number;
  startTime: string;
  defaultWords?: string[];
}

export default function Admin() {
  const [topPlayers, setTopPlayers] = useState<PlayerStats[]>([]);
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [defaultWords, setDefaultWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Apply dark mode
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      // Use direct port for WebSocket server
      const leaderboardUrl = "http://localhost:8080/leaderboard";
      console.log("Fetching leaderboard from:", leaderboardUrl);
      
      // Fetch leaderboard from the server
      const leaderboardResponse = await fetch(leaderboardUrl);
      if (!leaderboardResponse.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      const leaderboardData = await leaderboardResponse.json();
      setTopPlayers(Array.isArray(leaderboardData) ? leaderboardData : []);

      // Use direct port for WebSocket server
      const statsUrl = "http://localhost:8080/admin/stats";
      console.log("Fetching stats from:", statsUrl);
      
      // Fetch real server stats from the new endpoint
      const statsResponse = await fetch(statsUrl);
      if (!statsResponse.ok) {
        throw new Error("Failed to fetch server statistics");
      }
      const statsData = await statsResponse.json();
      setServerStats(statsData);
      setActiveRooms(statsData.activeRoomsList || []);
      
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      
      // If we can't connect to the WebSocket server, show an error message
      if (err instanceof Error && err.message.includes("fetch")) {
        setError("Cannot connect to WebSocket server. Make sure the server is running on port 8080.");
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Set up auto refresh
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchData();
      }, refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Handle refresh interval change
  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshInterval(parseInt(e.target.value));
  };

  // Format uptime as readable string
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  const formatTimeLeft = (seconds?: number) => {
    if (seconds === undefined) return "N/A";
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Header */}
      <header className={`py-4 px-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            SketchGuess Admin
          </h1>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Auto refresh:</span>
              <label className="inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoRefresh} 
                  onChange={() => setAutoRefresh(!autoRefresh)} 
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Interval:</span>
              <select 
                value={refreshInterval} 
                onChange={handleIntervalChange}
                className="bg-gray-700 text-white text-sm rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="5000">5s</option>
                <option value="15000">15s</option>
                <option value="30000">30s</option>
                <option value="60000">1m</option>
              </select>
            </div>
            
            <button 
              onClick={fetchData} 
              disabled={refreshing}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {refreshing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </>
              )}
            </button>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-6">
        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-500 text-white rounded-lg shadow-md">
            <p className="font-semibold flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Error fetching data:
            </p>
            <p>{error}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !error && (
          <div className="mb-8 flex justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Real-time indicator */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                <span className="text-sm text-gray-400">
                  {autoRefresh ? 'Live data • ' : 'Data • '}
                  Last updated: {lastRefreshed ? new Date(lastRefreshed).toLocaleTimeString() : 'Never'} 
                  {refreshing && ' • Refreshing...'}
                </span>
              </div>
            </div>

            {/* Server Stats Section */}
            <section className={`mb-8 rounded-xl shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className="text-xl font-semibold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                  Server Statistics
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {serverStats && (
                    <>
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Server Uptime</div>
                        <div className="text-2xl font-semibold mt-1 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatUptime(serverStats.uptime)}
                        </div>
                        <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                          Started: {new Date(serverStats.startTime).toLocaleString()}
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Connections</div>
                        <div className="text-2xl font-semibold mt-1 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          {serverStats.activeConnections} active
                        </div>
                        <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                          {serverStats.totalConnections} total connections
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Game Rooms</div>
                        <div className="text-2xl font-semibold mt-1 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {serverStats.activeRooms} active
                        </div>
                        <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                          {serverStats.totalRooms} total rooms created
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* Active Rooms Section - Enhanced */}
            <section className={`mb-8 rounded-xl shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className="text-xl font-semibold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Active Game Rooms ({activeRooms.length})
                </h2>
              </div>
              <div className="p-6 overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                      <th className="px-4 py-2 text-left">Room ID</th>
                      <th className="px-4 py-2 text-left">Players</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Round</th>
                      <th className="px-4 py-2 text-left">Time Left</th>
                      <th className="px-4 py-2 text-left">Players</th>
                    </tr>
                  </thead>
                  <tbody className={darkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}>
                    {activeRooms.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center">No active rooms</td>
                      </tr>
                    ) : (
                      activeRooms.map((room) => (
                        <tr key={room.roomId} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3 font-mono">{room.roomId}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              {room.playerCount}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {room.isActive ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                In Progress
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                Waiting
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {room.isActive ? (
                              <span>
                                {room.currentRound} / {room.maxRounds}
                              </span>
                            ) : (
                              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                                -
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {room.isActive ? (
                              <span>
                                {formatTimeLeft(room.timeLeft)}
                              </span>
                            ) : (
                              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                                -
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {room.players && room.players.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {room.players.map(player => (
                                  <span key={player.name} className={`text-xs px-2 py-1 rounded-full ${player.isDrawing 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                    : player.isReady 
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {player.name} {player.isDrawing ? '✏️' : ''} {player.score > 0 ? `(${player.score})` : ''}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Leaderboard Section */}
            <section className={`rounded-xl shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className="text-xl font-semibold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Top Players
                </h2>
              </div>
              <div className="p-6 overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                      <th className="px-4 py-2 text-left">Rank</th>
                      <th className="px-4 py-2 text-left">Player</th>
                      <th className="px-4 py-2 text-left">Score</th>
                      <th className="px-4 py-2 text-left">Games</th>
                      <th className="px-4 py-2 text-left">Words Guessed</th>
                      <th className="px-4 py-2 text-left">Last Played</th>
                    </tr>
                  </thead>
                  <tbody className={darkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}>
                    {topPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center">No player data available</td>
                      </tr>
                    ) : (
                      topPlayers.map((player, index) => (
                        <tr key={player.playerName} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3">
                            {index === 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-400 text-white rounded-full">
                                1
                              </span>
                            ) : index === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-400 text-white rounded-full">
                                2
                              </span>
                            ) : index === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-600 text-white rounded-full">
                                3
                              </span>
                            ) : (
                              index + 1
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">{player.playerName}</td>
                          <td className="px-4 py-3">{player.score}</td>
                          <td className="px-4 py-3">{player.gamesPlayed}</td>
                          <td className="px-4 py-3">{player.wordsGuessed}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(player.date).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Word Lists Section */}
            <section className={`my-8 rounded-xl shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className="text-xl font-semibold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Word Lists
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Default Words */}
                  <div>
                    <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Default Words
                    </h3>
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} max-h-60 overflow-y-auto`}>
                      <div className="flex flex-wrap gap-2">
                        {serverStats?.defaultWords ? (
                          serverStats.defaultWords.map((word, index) => (
                            <span 
                              key={`${word}-${index}`} 
                              className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}
                            >
                              {word}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400">Default words not available</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Custom Words in Active Rooms */}
                  <div>
                    <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Custom Words by Room
                    </h3>
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} max-h-60 overflow-y-auto`}>
                      {activeRooms.some(room => room.settings?.customWords && room.settings.customWords.length > 0) ? (
                        activeRooms.map((room) => 
                          room.settings?.customWords && room.settings.customWords.length > 0 ? (
                            <div key={room.roomId} className="mb-4">
                              <div className="flex items-center mb-2">
                                <span className="font-mono">{room.roomId}</span>
                                {room.settings.useOnlyCustomWords && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                                    Custom words only
                                  </span>
                                )}
                                {room.currentWord && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                    Current: {room.currentWord}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 pl-4">
                                {room.settings.customWords.map((word, index) => (
                                  <span 
                                    key={`${room.roomId}-${word}-${index}`} 
                                    className={`text-xs px-2 py-1 rounded-full ${
                                      word === room.currentWord
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                    }`}
                                  >
                                    {word}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null
                        )
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No custom words set in any active room</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className={`py-4 mt-12 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="container mx-auto px-6 text-center">
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            © {new Date().getFullYear()} SketchGuess Admin Dashboard | 
            <a href="/" className="ml-2 text-indigo-500 hover:text-indigo-400 transition-colors">
              Back to Game
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
} 