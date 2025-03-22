"use client";

import { useEffect, useState } from 'react';

/**
 * NotificationMessage component for displaying temporary notification messages
 * @param {string} message - The message to display
 * @param {string} type - The type of notification ('info', 'success', 'warning', 'error')
 * @param {number} duration - How long to show the message in milliseconds (default: 5000)
 * @param {function} onDismiss - Callback when message is dismissed
 * @param {boolean} showCloseButton - Whether to show a close button
 */
const NotificationMessage = ({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onDismiss,
  showCloseButton = true
}) => {
  const [visible, setVisible] = useState(true);
  
  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };
  
  useEffect(() => {
    if (!message) return;
    
    // Set a timer to hide the message after the specified duration
    // Only auto-dismiss if duration > 0
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [message, duration]);
  
  if (!message || !visible) return null;
  
  // Determine styling based on notification type
  const styles = {
    info: "bg-blue-100 border-blue-400 text-blue-700",
    success: "bg-green-100 border-green-400 text-green-700",
    warning: "bg-yellow-100 border-yellow-400 text-yellow-800",
    error: "bg-red-100 border-red-400 text-red-700"
  };
  
  return (
    <div className={`fixed inset-x-0 top-4 mx-auto max-w-md px-4 py-3 rounded border z-50 shadow-md flex items-center justify-between ${styles[type] || styles.info}`}>
      <span className="block">{message}</span>
      {showCloseButton && (
        <button 
          className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none" 
          onClick={handleDismiss}
          aria-label="Close notification"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default NotificationMessage; 