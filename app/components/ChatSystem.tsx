import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '~/context/WebSocketContext';

interface ChatSystemProps {
  darkMode: boolean;
}

const MAX_CHAT_LENGTH = 50; // Update max length constant

const ChatSystem: React.FC<ChatSystemProps> = ({ darkMode }) => {
  const { messages, sendMessage, currentPlayer, gameState } = useWebSocket();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Check if current player is drawing by comparing IDs
  const amIDrawing = gameState?.drawer?.id === currentPlayer?.id && gameState?.status === 'playing';

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
    const trimmedMessage = message.trim();
    // Add length check before sending
    if (trimmedMessage && !amIDrawing && trimmedMessage.length <= MAX_CHAT_LENGTH) {
      sendMessage(trimmedMessage);
      setMessage("");
      setAutoScroll(true);
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
      <div className={`p-2 xs:p-3 sm:p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className="font-medium text-xs xs:text-sm sm:text-base">Chat</h3>
        {amIDrawing && gameState?.status === 'playing' && (
          <div className="mt-1 text-[10px] xs:text-xs sm:text-sm text-amber-500">
            Drawing... Others are guessing.
          </div>
        )}
        {!amIDrawing && gameState?.status === 'playing' && (
          <div className="mt-1 text-[10px] xs:text-xs sm:text-sm text-blue-400">
            Type your guess below
          </div>
        )}
      </div>
      
      {/* Messages area */}
      <div className="relative flex-1 overflow-hidden">
        <div 
          ref={messagesContainerRef}
          className="absolute inset-0 overflow-y-auto p-1 xs:p-2 sm:p-3 space-y-1 custom-scrollbar"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 mx-auto mb-1 xs:mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-[10px] xs:text-xs sm:text-sm">No messages yet</p>
                <p className="text-[10px] mt-0.5 xs:mt-1 hidden xs:block">Chat messages will appear here</p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={`${msg.id}_${index}`}
                className={`p-1 xs:p-2 rounded-lg text-[10px] xs:text-xs sm:text-sm animate-fade-in ${
                  msg.type === 'system' ? 'bg-gray-600/20 text-center' :
                  msg.type === 'correct' ? 'bg-green-500/20 border-l-2 xs:border-l-4 border-green-500' :
                  msg.type === 'incorrect' ? 'bg-red-500/20' :
                  'bg-blue-500/20'
                }`}
              >
                {msg.type !== 'system' && (
                  <div className="flex items-center space-x-1 xs:space-x-1.5 mb-0.5">
                    <span className={`font-semibold ${
                      msg.type === 'correct' ? 'text-green-400' :
                      msg.type === 'incorrect' ? 'text-red-400' :
                      'text-blue-400'
                    }`}>
                      {msg.playerName}
                    </span>
                    <span className="text-[9px] xs:text-[10px] sm:text-xs text-gray-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div 
                  className={`${msg.type === 'system' ? 'text-gray-400 italic' : ''} break-words overflow-wrap-anywhere`}
                >
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
            className="absolute bottom-1 right-1 xs:bottom-2 xs:right-2 sm:bottom-4 sm:right-4 p-1 xs:p-1.5 sm:p-2 rounded-full bg-indigo-500 text-white shadow-lg hover:bg-indigo-600 focus:outline-none transform transition-transform hover:scale-110"
            title="Scroll to bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M15.707 4.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L10 8.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M15.707 10.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L10 14.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className={`p-1 xs:p-2 sm:p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              gameState?.status === 'playing' && amIDrawing ? "You're drawing right now..." :
              gameState?.status === 'playing' && !amIDrawing ? "Type your guess..." :
              "Type your message..."
            }
            disabled={gameState?.status === 'playing' && amIDrawing}
            maxLength={MAX_CHAT_LENGTH}
            className={`w-full px-2 py-1 xs:px-3 xs:py-2 sm:px-4 sm:py-2.5 rounded-lg transition-colors text-xs xs:text-sm sm:text-base ${
              darkMode
                ? 'bg-gray-700 text-white placeholder-gray-400'
                : 'bg-gray-100 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed pr-12 xs:pr-14`}
          />
          <span 
             className={`absolute right-8 xs:right-9 top-1/2 transform -translate-y-1/2 text-[10px] xs:text-xs pointer-events-none ${
               message.length > MAX_CHAT_LENGTH ? 'text-red-500 font-semibold' : 'text-gray-400'
             }`}
          >
             {message.length}/{MAX_CHAT_LENGTH}
          </span>
          <button
            type="submit"
            disabled={!message.trim() || (gameState?.status === 'playing' && amIDrawing) || message.length > MAX_CHAT_LENGTH}
            className="absolute right-0.5 xs:right-1 top-1/2 transform -translate-y-1/2 p-1 xs:p-1.5 sm:p-2 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatSystem; 