import React, { useState, useEffect } from 'react';
import { calculateFireResistance, CHARRING_RATES } from '@/utils/masslamProperties';

/**
 * Component to calculate and display fire resistance properties
 */
export default function FireResistanceCalculator({ charringRate = CHARRING_RATES.softwood, dimensions = { width: 90, depth: 240 }, selectedFRL = "0" }) {
  // State for calculation results
  const [results, setResults] = useState(null);
  
  // Parse FRL value (e.g., "60/60/60" -> 60)
  const getFRLMinutes = (frl) => {
    if (frl === '0' || frl === 'none') return 0;
    return parseInt(frl.split('/')[0]) || 0;
  };
