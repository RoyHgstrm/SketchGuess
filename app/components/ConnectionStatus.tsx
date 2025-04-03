import React, { useState, useEffect } from 'react';
import { useWebSocket } from '~/context/WebSocketContext';

const ConnectionStatus: React.FC = () => {
  const { 
    isConnected, 
    connectionError, 
    reconnectAttempts,
    isReconnecting,
    retryConnection
  } = useWebSocket();
  
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (reconnectAttempts >= 3 || (connectionError && connectionError.includes('throttled'))) {
      setShowTroubleshooting(true);
    }
    
    // Hide error message when connected
    if (isConnected) {
      // Clear connection error after 3 seconds when connection is established
      const timer = setTimeout(() => {
        setIsVisible(false); 
        setIsMinimized(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [reconnectAttempts, connectionError, isConnected]);

  // Auto-minimize after 5 seconds if no critical errors
  useEffect(() => {
    if (isConnected || (!connectionError && !isReconnecting)) {
      const timer = setTimeout(() => setIsMinimized(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, connectionError, isReconnecting]);

  if (!isVisible || (isConnected && !connectionError && isMinimized)) {
    return null;
  }

  const getStatusColor = () => {
    if (connectionError && connectionError.includes('throttled')) {
      return 'bg-orange-500';
    } else if (connectionError) {
      return 'bg-red-500';
    } else if (isReconnecting) {
      return 'bg-yellow-500';
    }
    return 'bg-blue-500';
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className={`w-6 h-6 rounded-full ${getStatusColor()} shadow-lg animate-pulse`} />
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className={`p-4 rounded-lg shadow-lg ${
        connectionError && connectionError.includes('throttled')
          ? 'bg-orange-100 border-2 border-orange-400 text-orange-900 dark:bg-orange-900 dark:text-orange-100'
          : connectionError 
            ? 'bg-red-100 border-2 border-red-400 text-red-900 dark:bg-red-900 dark:text-red-100'
            : isReconnecting
              ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100'
              : 'bg-blue-100 border-2 border-blue-400 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-2">
            {connectionError && connectionError.includes('throttled') ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500 dark:text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : connectionError ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : isReconnecting ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 dark:text-yellow-300 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-medium">
              {connectionError && connectionError.includes('throttled') ? 'Connection Throttled' :
               connectionError ? 'Connection Error' : 
               isReconnecting ? 'Reconnecting...' : 
               'Connection Status'}
            </h3>
            <div className="mt-1 text-sm">
              {connectionError ? (
                <p>{connectionError}</p>
              ) : isReconnecting ? (
                <p>Attempting to reconnect to the game server (Attempt {reconnectAttempts}/5)...</p>
              ) : (
                <p>Connecting to game server...</p>
              )}
            </div>

            {(connectionError || reconnectAttempts >= 2) && (
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={retryConnection}
                  className="px-3 py-1 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Manual Retry
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 text-sm font-medium rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Refresh Page
                </button>
              </div>
            )}
            
            {(connectionError || reconnectAttempts >= 2) && (
              <button
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                className="mt-2 text-xs underline hover:no-underline focus:outline-none"
              >
                {showTroubleshooting ? 'Hide troubleshooting tips' : 'Show troubleshooting tips'}
              </button>
            )}
          </div>

          <button 
            onClick={() => setIsVisible(false)} 
            className="ml-auto flex-shrink-0 -mt-1 -mr-1 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
            title="Close"
          >
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isReconnecting && !connectionError && (
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full animate-pulse" 
              style={{ width: '100%' }}
            ></div>
          </div>
        )}
        
        {showTroubleshooting && (
          <div className="mt-3 p-3 text-sm bg-black/10 dark:bg-white/10 rounded-lg">
            <h4 className="font-medium mb-1">Troubleshooting Tips:</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Check if other browser tabs with the game are open</li>
              <li>Make sure your internet connection is stable</li>
              <li>Try using a private/incognito browser window</li>
              <li>Disable browser extensions that might interfere with WebSockets</li>
              <li>If you're getting throttled, wait a full minute before trying again</li>
              <li>Try clearing your browser cache and cookies</li>
              <li>Check if your browser's WebSocket support is enabled</li>
              <li>If using a VPN, try disabling it temporarily</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus; 