import React, { useState, useEffect } from 'react';

const ConnectionStatus = ({ isConnected, error, reconnecting, darkMode }) => {
  const [visible, setVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    // Show component whenever connection state changes
    if (!isConnected) {
      setIsExiting(false);
      setVisible(true);
    } else if (isConnected && visible) {
      // If we're connected and component is visible, start exit animation
      const timeout = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => setVisible(false), 500); // Match transition duration
      }, 1500); // Keep visible for 1.5s after connection is established
      
      return () => clearTimeout(timeout);
    }
  }, [isConnected, visible]);

  // Don't render if should be hidden
  if (!visible || (isConnected && !error)) return null;
  
  // Determine status color and message based on state
  let statusColor, statusBg, statusIcon, statusMessage, statusBorder, statusRing;
  
  if (error) {
    statusColor = darkMode ? 'text-red-100' : 'text-red-800';
    statusBg = darkMode ? 'bg-red-900/90' : 'bg-red-100';
    statusBorder = darkMode ? 'border-red-700' : 'border-red-300';
    statusRing = 'ring-red-500';
    statusMessage = error;
    statusIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  } else if (reconnecting) {
    statusColor = darkMode ? 'text-orange-100' : 'text-orange-800';
    statusBg = darkMode ? 'bg-orange-900/90' : 'bg-orange-100';
    statusBorder = darkMode ? 'border-orange-700' : 'border-orange-300';
    statusRing = 'ring-orange-500';
    statusMessage = `Reconnecting (${reconnecting}/10)...`;
    statusIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  } else if (!isConnected) {
    statusColor = darkMode ? 'text-blue-100' : 'text-blue-800';
    statusBg = darkMode ? 'bg-blue-900/90' : 'bg-blue-100';
    statusBorder = darkMode ? 'border-blue-700' : 'border-blue-300';
    statusRing = 'ring-blue-500';
    statusMessage = "Connecting to game server...";
    statusIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
    );
  } else {
    statusColor = darkMode ? 'text-green-100' : 'text-green-800';
    statusBg = darkMode ? 'bg-green-900/90' : 'bg-green-100';
    statusBorder = darkMode ? 'border-green-700' : 'border-green-300';
    statusRing = 'ring-green-500';
    statusMessage = "Connected!";
    statusIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  }
  
  return (
    <div 
      className={`fixed bottom-4 left-4 z-50 transition-all duration-500 ease-in-out transform ${
        isExiting ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <div 
        className={`flex items-center space-x-3 rounded-lg shadow-lg py-3 px-4 ${statusBg} ${statusColor} border ${statusBorder} backdrop-blur-sm animate-pop-in ring-1 ${statusRing}`}
      >
        <div className="flex-shrink-0 bg-white/20 p-1.5 rounded-full">
          {statusIcon}
        </div>
        <div>
          <p className="font-medium">{statusMessage}</p>
          {reconnecting && (
            <div className="mt-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-orange-500 h-1.5 rounded-full transition-all duration-300 ease-out animate-pulse"
                  style={{ width: `${(reconnecting / 10) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs mt-1 opacity-80">Attempt {reconnecting} of 10</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus; 