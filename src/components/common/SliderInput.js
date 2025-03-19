"use client";

import { useState, useRef, useEffect } from 'react';

/**
 * SliderInput component - A text input with label and unit
 * 
 * @param {string} label - The label for the input
 * @param {number} value - The current value
 * @param {function} onChange - Function to call when value changes
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} step - Step size for increments (default: 1)
 * @param {string} unit - Unit to display after value (default: "")
 * @param {string|null} description - Optional description text to show below label
 * @param {boolean} disabled - Whether the input is disabled (default: false)
 * @param {boolean} showTicks - Whether to show ticks in the slider (default: true)
 * @param {boolean} isInteger - Whether values should be integers only (default: false)
 */
const SliderInput = ({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step = 1, 
  unit = "", 
  description = null,
  disabled = false,
  showTicks = true,
  isInteger = false
}) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isEditing, setIsEditing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [clientDescription, setClientDescription] = useState(description);
  const inputRef = useRef(null);
  
  // Set isClient to true when component mounts on client
  useEffect(() => {
    setIsClient(true);
    // If description contains dynamic values, we store them client-side only
    if (description) {
      setClientDescription(description);
    }
  }, [description]);
  
  // Update local state when prop value changes
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);
  
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setIsEditing(true);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    
    // Parse the value and ensure it's within bounds
    let parsedValue = isInteger ? parseInt(inputValue, 10) : parseFloat(inputValue);
    
    // Handle invalid input
    if (isNaN(parsedValue)) {
      setInputValue(value.toString());
      return;
    }
    
    // Clamp the value between min and max
    parsedValue = Math.max(min, Math.min(max, parsedValue));
    
    // Update the input value and trigger the onChange
    setInputValue(parsedValue.toString());
    onChange(parsedValue);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.target.blur(); // Trigger the blur event to apply the change
    }
  };

  const startEditing = () => {
    if (disabled) return;
    
    setIsEditing(true);
    
    // Use setTimeout to ensure the input is rendered before trying to focus
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 10);
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <div className="flex-grow">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          {isClient && clientDescription && (
            <div className="text-xs text-gray-500">{clientDescription}</div>
          )}
        </div>
        <div className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={isEditing ? inputValue : value}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyPress}
            onClick={startEditing}
            className="w-20 px-2 py-1 text-right border border-gray-300 rounded-md text-sm"
            disabled={disabled}
          />
          <span className="ml-1 text-sm text-gray-500 min-w-8 text-left">{unit}</span>
        </div>
      </div>
    </div>
  );
};

export default SliderInput; 