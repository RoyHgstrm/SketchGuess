import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '~/context/WebSocketContext';

interface ChatSystemProps {
  darkMode: boolean;
}

const ChatSystem: React.FC<ChatSystemProps> = ({ darkMode }) => {
  const { messages, sendMessage, currentPlayer, gameState } = useWebSocket();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Check if current player is drawing
  const amIDrawing = currentPlayer?.isDrawing || false;

  // Improved auto-scroll behavior
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Force scroll to bottom without animation
  const forceScrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  };

  // Check if the user is scrolled near the bottom
  const isNearBottom = () => {
    if (!messagesContainerRef.current) return true;
    
    const container = messagesContainerRef.current;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 100;
  };

  // Handle scroll events to determine if auto-scroll should be enabled
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    // If user manually scrolled up, disable auto-scroll
    // If user scrolled back to bottom, enable auto-scroll
    setAutoScroll(isNearBottom());
  };

  // Auto-scroll when new messages arrive (if auto-scroll is enabled)
  useEffect(() => {
    if (messages.length > 0 && autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

  // Set up scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      // Initial scroll to bottom
      forceScrollToBottom();
      
      // Add scroll event listener
      container.addEventListener('scroll', handleScroll);
      
      // Clean up listener on unmount
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !amIDrawing) {
      sendMessage(message.trim());
      setMessage("");
      
      // Re-enable auto-scroll when sending a message
      setAutoScroll(true);
      
      // Force immediate scroll to bottom
      setTimeout(forceScrollToBottom, 50);
    }
  };

  // Toggle auto-scroll button handler
  const toggleAutoScroll = () => {
    const newState = !autoScroll;
    setAutoScroll(newState);
    
    if (newState) {
      // If enabling auto-scroll, immediately scroll to bottom
      forceScrollToBottom();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat header */}
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className="font-medium">Chat</h3>
        {amIDrawing && gameState?.status === 'playing' && (
          <div className="mt-1 text-sm text-amber-500">
            You're drawing! Others are trying to guess.
          </div>
        )}
        {!amIDrawing && gameState?.status === 'playing' && (
          <div className="mt-1 text-sm text-blue-400">
            Type your guess in the chat below
          </div>
        )}
      </div>
      
      {/* Messages area with container ref */}
      <div className="relative flex-1 overflow-hidden">
        <div 
          ref={messagesContainerRef}
          className="absolute inset-0 overflow-y-auto p-4 space-y-2 custom-scrollbar"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>No messages yet</p>
                <p className="text-sm mt-1">Chat messages will appear here</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg animate-fade-in ${
                  msg.type === 'system' ? 'bg-gray-600/20 text-center' :
                  msg.type === 'correct' ? 'bg-green-500/20 border-l-4 border-green-500' :
                  msg.type === 'incorrect' ? 'bg-red-500/20' :
                  'bg-blue-500/20'
                }`}
              >
                {msg.type !== 'system' && (
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`font-semibold ${
                      msg.type === 'correct' ? 'text-green-400' :
                      msg.type === 'incorrect' ? 'text-red-400' :
                      'text-blue-400'
                    }`}>
                      {msg.playerName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className={msg.type === 'system' ? 'text-gray-400 italic' : ''}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Auto-scroll toggle button */}
        {messages.length > 10 && !autoScroll && (
          <button
            onClick={toggleAutoScroll}
            className="absolute bottom-4 right-4 p-2 rounded-full bg-indigo-500 text-white shadow-lg hover:bg-indigo-600 focus:outline-none transform transition-transform hover:scale-110"
            title="Scroll to bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M15.707 4.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L10 8.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M15.707 10.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L10 14.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={amIDrawing ? "You're drawing right now..." : "Type your guess..."}
            disabled={amIDrawing}
            className={`w-full px-4 py-3 rounded-lg transition-colors ${
              darkMode 
                ? 'bg-gray-700 text-white placeholder-gray-400' 
                : 'bg-gray-100 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          <button
            type="submit"
            disabled={!message.trim() || amIDrawing}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatSystem; 