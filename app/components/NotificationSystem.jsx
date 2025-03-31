import React, { useState, useEffect, useCallback } from 'react';

// Custom hook for notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  // Add a notification
  const addNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    
    setNotifications(prev => [
      ...prev,
      { id, message, type, duration }
    ]);
    
    // Auto remove notification after duration
    if (duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    
    return id;
  }, []);
  
  // Remove a notification by id
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  // Helper methods for specific notification types
  const notifySuccess = useCallback((message, duration) => 
    addNotification(message, 'success', duration), [addNotification]);
    
  const notifyError = useCallback((message, duration) => 
    addNotification(message, 'error', duration), [addNotification]);
    
  const notifyWarning = useCallback((message, duration) => 
    addNotification(message, 'warning', duration), [addNotification]);
    
  const notifyInfo = useCallback((message, duration) => 
    addNotification(message, 'info', duration), [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo
  };
};

// Notification component
const NotificationSystem = ({ notifications, onDismiss }) => {
  if (!notifications || notifications.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs" aria-live="polite">
      {notifications.map(notification => (
        <NotificationItem 
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

// Individual notification item
const NotificationItem = ({ notification, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  
  // Setup notification dismissal
  const dismiss = useCallback(() => {
    setIsExiting(true);
    
    // Only remove after exit animation completes
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300); // Match transition duration
  }, [notification.id, onDismiss]);
  
  useEffect(() => {
    // Handle clicking outside
    const handleClickOutside = (e) => {
      if (e.target.closest('.notification-item') !== document.getElementById(`notification-${notification.id}`)) {
        dismiss();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      dismiss();
    }, notification.duration || 3000);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
    };
  }, [notification.id, notification.duration, dismiss]);
  
  // Get type-specific styles and icon
  let bgColor, icon;
  
  switch (notification.type) {
    case 'success':
      bgColor = 'bg-gradient-to-r from-green-600 to-green-500 shadow-green-500/20';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
      break;
      
    case 'error':
      bgColor = 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/20';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
      break;
      
    case 'warning':
      bgColor = 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-yellow-400/20';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
      break;
      
    case 'info':
    default:
      bgColor = 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/20';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
      break;
  }
  
  return (
    <div 
      id={`notification-${notification.id}`}
      className={`notification-item p-3 rounded-lg shadow-xl flex items-center text-white transform transition-all duration-300 ease-out ${bgColor} ${
        isExiting 
          ? 'opacity-0 translate-x-full' 
          : 'opacity-100 translate-x-0 animate-fade-in-up'
      }`}
    >
      <div className="mr-3 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 pr-4 font-medium">{notification.message}</div>
      <button 
        onClick={dismiss} 
        className="ml-2 flex-shrink-0 text-white/80 hover:text-white transition-colors rounded-full p-1 hover:bg-white/20"
        aria-label="Dismiss notification"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default NotificationSystem; 