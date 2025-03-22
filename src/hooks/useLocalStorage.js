"use client";

import { useState, useEffect } from 'react';

/**
 * Custom hook for using localStorage with React state
 * @param {string} key - The localStorage key
 * @param {any} initialValue - Default value if nothing in localStorage
 * @returns {[any, function]} A stateful value and a function to update it
 */
function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // Log errors rather than crash
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };
  
  // Update local storage when the key changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        } else {
          window.localStorage.setItem(key, JSON.stringify(initialValue));
        }
      } catch (error) {
        console.error(`Error accessing localStorage for key "${key}":`, error);
      }
    }
  }, [key, initialValue]);
  
  return [storedValue, setValue];
}

// Utility function to clear all localStorage data
export function clearLocalStorage() {
  try {
    localStorage.clear();
    console.log('LocalStorage cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

export default useLocalStorage; 