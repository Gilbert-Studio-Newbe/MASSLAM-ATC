"use client";

import { createContext, useState, useContext } from 'react';
import NotificationMessage from '../components/common/NotificationMessage';

// Create the notification context
const NotificationContext = createContext(undefined);

// Provider component
export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);
  
  const showNotification = (message, type = 'info', duration = 5000) => {
    setNotification({ message, type, duration });
  };
  
  const hideNotification = () => {
    setNotification(null);
  };
  
  // Convenience methods for different notification types
  const showInfo = (message, duration = 5000) => showNotification(message, 'info', duration);
  const showSuccess = (message, duration = 5000) => showNotification(message, 'success', duration);
  const showWarning = (message, duration = 5000) => showNotification(message, 'warning', duration);
  const showError = (message, duration = 5000) => showNotification(message, 'error', duration);
  
  // Alert replacement - by default, warnings don't auto-dismiss
  const showAlert = (message, type = 'warning', duration = 0) => showNotification(message, type, duration);
  
  // Value provided to consumers
  const value = {
    notification,
    showNotification,
    hideNotification,
    showInfo,
    showSuccess,
    showWarning,
    showError,
    showAlert
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notification && (
        <NotificationMessage
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onDismiss={hideNotification}
          showCloseButton={true}
        />
      )}
    </NotificationContext.Provider>
  );
}

// Custom hook for using the context
export function useNotification() {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
}

export default NotificationContext; 