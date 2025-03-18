"use client";

import { useEffect, useState } from 'react';

/**
 * SuccessMessage component for displaying temporary notification messages
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the message in milliseconds (default: 3000)
 * @param {function} onDismiss - Callback when message is dismissed
 */
const SuccessMessage = ({ message, duration = 3000, onDismiss }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    if (!message) return;
    
    // Set a timer to hide the message after the specified duration
    const timer = setTimeout(() => {
      setVisible(false);
      if (onDismiss) onDismiss();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);
  
  if (!message || !visible) return null;
  
  return (
    <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
      <span className="block sm:inline">{message}</span>
    </div>
  );
};

export default SuccessMessage; 