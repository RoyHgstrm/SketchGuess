import React, { useState, useEffect } from 'react';
import { useWebSocket } from '~/context/WebSocketContext';

interface ConnectionStatusProps {
  darkMode?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ darkMode = true }) => {
  const { 
    isConnected, 
    connectionError, 
    reconnectAttempts,
    isReconnecting,
    retryConnection
  } = useWebSocket();
  
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showError, setShowError] = useState(false);

  // Control error visibility with delay
  useEffect(() => {
    let errorTimer: NodeJS.Timeout | null = null;
    
    // Only show errors after 5 seconds of failed connection attempts
    if (connectionError || reconnectAttempts >= 2) {
      errorTimer = setTimeout(() => {
        setShowError(true);
        setIsVisible(true);
      }, 5000);
    } else {
      setShowError(false);
    }
    
    // Always hide the component when connected
    if (isConnected) {
      if (errorTimer) {
        clearTimeout(errorTimer);
      }
      setShowError(false);
      
      // Auto-hide after 2 seconds when connected
      const connectedTimer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      
      return () => {
        clearTimeout(connectedTimer);
        if (errorTimer) clearTimeout(errorTimer);
      };
    }
    
    return () => {
      if (errorTimer) clearTimeout(errorTimer);
    };
  }, [isConnected, connectionError, reconnectAttempts]);

  // Show troubleshooting tips for persistent connection problems
  useEffect(() => {
    if (reconnectAttempts >= 3) {
      setShowTroubleshooting(true);
    }
  }, [reconnectAttempts]);

  // Don't render anything if not visible
  if (!isVisible && !showError) {
    return null;
  }

  // When minimized, just show a status dot
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className={`w-6 h-6 rounded-full ${
          connectionError ? 'bg-red-500' : 
          isReconnecting ? 'bg-yellow-500' : 
          'bg-green-500'
        } shadow-lg ${
          isReconnecting ? 'animate-pulse' : ''
        }`} />
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className={`p-4 rounded-lg shadow-lg ${
        connectionError
          ? 'bg-red-100 border-2 border-red-400 text-red-900 dark:bg-red-900 dark:text-red-100'
          : isReconnecting
            ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100'
            : 'bg-green-100 border-2 border-green-400 text-green-900 dark:bg-green-900 dark:text-green-100'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-2">
            {connectionError ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : isReconnecting ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 dark:text-yellow-300 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-medium">
              {connectionError ? 'Connection Error' : 
               isReconnecting ? 'Reconnecting...' : 
               'Connected'}
            </h3>
            
            {/* Only show message content if there's an error or reconnecting */}
            {(connectionError || isReconnecting) && (
              <div className="mt-1 text-sm">
                {connectionError ? (
                  <p>{connectionError}</p>
                ) : isReconnecting ? (
                  <p>Attempting to reconnect...</p>
                ) : null}
              </div>
            )}

            {/* Only show retry buttons for connection problems */}
            {(connectionError || reconnectAttempts >= 2) && (
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={retryConnection}
                  className="px-3 py-1 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Retry
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 text-sm font-medium rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Refresh
                </button>
              </div>
            )}
            
            {/* Only show troubleshooting for persistent problems */}
            {(reconnectAttempts >= 3) && (
              <button
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                className="mt-2 text-xs underline hover:no-underline focus:outline-none"
              >
                {showTroubleshooting ? 'Hide tips' : 'Show tips'}
              </button>
            )}
          </div>

          <button 
            onClick={() => {
              if (isConnected) {
                setIsVisible(false);
              } else {
                setIsMinimized(true);
              }
            }} 
            className="ml-auto flex-shrink-0 -mt-1 -mr-1 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
            title="Close"
          >
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isReconnecting && (
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full animate-pulse" 
              style={{ width: '100%' }}
            ></div>
          </div>
        )}
        
        {showTroubleshooting && (
          <div className="mt-3 p-3 text-sm bg-black/10 dark:bg-white/10 rounded-lg">
            <h4 className="font-medium mb-1">Tips:</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Check your internet connection</li>
              <li>Try refreshing the page</li>
              <li>Close other tabs with the game open</li>
              <li>Try using a private/incognito window</li>
              <li>Clear your browser cache and cookies</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus; 