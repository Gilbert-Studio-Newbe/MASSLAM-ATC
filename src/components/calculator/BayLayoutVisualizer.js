"use client";

import React from 'react';

/**
 * Bay Layout Visualizer component for displaying the structural grid layout
 * This is extracted directly from the previous implementation without modifications
 */
const BayLayoutVisualizer = ({
  results,
  buildingLength,
  buildingWidth,
  lengthwiseBays,
  widthwiseBays,
  joistsRunLengthwise,
  customLengthwiseBayWidths = [],
  customWidthwiseBayWidths = [],
  useCustomBayDimensions = false,
  isMobile = false,
  onToggleJoistDirection = () => {}, // Add function prop for toggling joist direction
  onToggleCustomBayDimensions = () => {},
  onLengthwiseBayWidthChange = () => {},
  onWidthwiseBayWidthChange = () => {}
}) => {
  // Function to calculate bay dimensions (copied from TimberCalculator.js)
  const calculateBayDimensions = () => {
    if (!useCustomBayDimensions) {
      // If not using custom dimensions, create equal bays
      const equalLengthwiseBayWidths = Array(lengthwiseBays).fill(buildingLength / lengthwiseBays);
      const equalWidthwiseBayWidths = Array(widthwiseBays).fill(buildingWidth / widthwiseBays);
      
      return {
        lengthwiseBayWidths: equalLengthwiseBayWidths,
        widthwiseBayWidths: equalWidthwiseBayWidths
      };
    }
    
    // Check if custom bay dimensions have been properly initialized
    if (customLengthwiseBayWidths.length !== lengthwiseBays || customWidthwiseBayWidths.length !== widthwiseBays) {
      console.warn('Custom bay dimensions do not match the number of bays, falling back to equal distribution');
      const equalLengthwiseBayWidths = Array(lengthwiseBays).fill(buildingLength / lengthwiseBays);
      const equalWidthwiseBayWidths = Array(widthwiseBays).fill(buildingWidth / widthwiseBays);
      
      return {
        lengthwiseBayWidths: equalLengthwiseBayWidths,
        widthwiseBayWidths: equalWidthwiseBayWidths
      };
    }
    
    // Get the totals to check if we need to normalize
    const totalLengthwise = customLengthwiseBayWidths.reduce((sum, width) => sum + width, 0);
    const totalWidthwise = customWidthwiseBayWidths.reduce((sum, width) => sum + width, 0);
    
    // Normalize if needed
    let normalizedLengthwiseBayWidths = [...customLengthwiseBayWidths];
    let normalizedWidthwiseBayWidths = [...customWidthwiseBayWidths];
    
    if (Math.abs(totalLengthwise - buildingLength) > 0.01) {
      const scaleFactor = buildingLength / totalLengthwise;
      normalizedLengthwiseBayWidths = normalizedLengthwiseBayWidths.map(width => width * scaleFactor);
    }
    
    if (Math.abs(totalWidthwise - buildingWidth) > 0.01) {
      const scaleFactor = buildingWidth / totalWidthwise;
      normalizedWidthwiseBayWidths = normalizedWidthwiseBayWidths.map(width => width * scaleFactor);
    }
    
    return {
      lengthwiseBayWidths: normalizedLengthwiseBayWidths,
      widthwiseBayWidths: normalizedWidthwiseBayWidths
    };
  };

  return (
    <div className="apple-visualization mb-3">
      {/* CSS for toggle switch */}
      <style>
        {`
          .toggle-checkbox {
            right: 0;
            z-index: 5;
            opacity: 0;
            top: 0;
          }
          .toggle-label {
            position: relative;
            display: block;
            height: 24px;
            width: 40px;
            background-color: #e2e8f0;
            border-radius: 9999px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          .toggle-checkbox:checked + .toggle-label {
            background-color: #3b82f6;
          }
          .toggle-checkbox:checked + .toggle-label:after {
            left: calc(100% - 2px);
            transform: translateX(-100%);
          }
          .toggle-label:after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background-color: white;
            border-radius: 9999px;
            transition: all 0.2s;
          }
        `}
      </style>

      {/* Display custom bay dimensions UI when enabled */}
      {useCustomBayDimensions && (
        <div className="custom-bay-dimensions mb-6">
          <div className={`${isMobile ? '' : 'grid grid-cols-2 gap-4'}`}>
            {/* Column Widths */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Column Widths (m)</label>
              <div className="space-y-2">
                {Array.from({ length: lengthwiseBays }).map((_, index) => (
                  <div key={`lengthwise-bay-${index}`} className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2 w-6">{String.fromCharCode(65 + index)}:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.1"
                      value={customLengthwiseBayWidths[index]}
                      onChange={(e) => onLengthwiseBayWidthChange(index, parseFloat(e.target.value))}
                      className="block w-full py-1 px-2 border border-gray-300 rounded-md shadow-sm text-sm"
                    />
                    <span className="ml-1">m</span>
                  </div>
                ))}
                <div className="text-xs text-gray-500 mt-1">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span>{customLengthwiseBayWidths.reduce((sum, width) => sum + width, 0).toFixed(2)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target:</span>
                    <span>{buildingLength.toFixed(2)}m</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Row Heights */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Row Heights (m)</label>
              <div className="space-y-2">
                {Array.from({ length: widthwiseBays }).map((_, index) => (
                  <div key={`widthwise-bay-${index}`} className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2 w-6">{index + 1}:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.1"
                      value={customWidthwiseBayWidths[index]}
                      onChange={(e) => onWidthwiseBayWidthChange(index, parseFloat(e.target.value))}
                      className="block w-full py-1 px-2 border border-gray-300 rounded-md shadow-sm text-sm"
                    />
                    <span className="ml-1">m</span>
                  </div>
                ))}
                <div className="text-xs text-gray-500 mt-1">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span>{customWidthwiseBayWidths.reduce((sum, width) => sum + width, 0).toFixed(2)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target:</span>
                    <span>{buildingWidth.toFixed(2)}m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Checkbox for Custom Bay Dimensions */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Customize Bay Dimensions</label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input
              type="checkbox"
              name="toggle"
              id="customBayToggle"
              checked={useCustomBayDimensions}
              onChange={() => onToggleCustomBayDimensions(!useCustomBayDimensions)}
              className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            />
            <label
              htmlFor="customBayToggle"
              className="toggle-label"
            ></label>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="relative w-full h-full" style={{ 
          minHeight: '300px', // Reduced from 400px for better mobile fit
          border: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden'
        }}>
          {/* SVG-based Bay Layout */}
          {(() => {
            const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();
            
            // Calculate total dimensions
            const totalWidth = lengthwiseBayWidths.reduce((sum, w) => sum + w, 0);
            const totalHeight = widthwiseBayWidths.reduce((sum, h) => sum + h, 0);
            
            // Calculate positions for each bay
            const bayPositionsX = [];
            let currentX = 0;
            for (let i = 0; i < lengthwiseBayWidths.length; i++) {
              bayPositionsX.push(currentX);
              currentX += lengthwiseBayWidths[i];
            }
            
            const bayPositionsY = [];
            let currentY = 0;
            for (let i = 0; i < widthwiseBayWidths.length; i++) {
              bayPositionsY.push(currentY);
              currentY += widthwiseBayWidths[i];
            }
            
            // Adjust padding for mobile
            const viewBoxPadding = isMobile ? 2.5 : 2;
                    
            return (
              <svg 
                width="100%" 
                height="100%" 
                viewBox={`-${viewBoxPadding} -${viewBoxPadding} ${totalWidth + viewBoxPadding*2} ${totalHeight + viewBoxPadding*2}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ 
                  background: 'white', 
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
              >
                {/* Background grid - invisible now */}
                <g className="debug-grid">
                  {/* Vertical grid lines */}
                  {bayPositionsX.map((x, i) => (
                    <line 
                      key={`vgrid-${i}`}
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={totalHeight}
                      stroke="rgba(0,0,0,0)"
                      strokeWidth="0"
                      strokeDasharray="0,0"
                    />
                  ))}
                  {/* Add final vertical line */}
                  <line 
                    key="vgrid-final"
                    x1={totalWidth}
                    y1={0}
                    x2={totalWidth}
                    y2={totalHeight}
                    stroke="rgba(0,0,0,0)"
                    strokeWidth="0"
                    strokeDasharray="0,0"
                  />
                  
                  {/* Horizontal grid lines */}
                  {bayPositionsY.map((y, i) => (
                    <line 
                      key={`hgrid-${i}`}
                      x1={0}
                      y1={y}
                      x2={totalWidth}
                      y2={y}
                      stroke="rgba(0,0,0,0)"
                      strokeWidth="0"
                      strokeDasharray="0,0"
                    />
                  ))}
                  {/* Add final horizontal line */}
                  <line 
                    key="hgrid-final"
                    x1={0}
                    y1={totalHeight}
                    x2={totalWidth}
                    y2={totalHeight}
                    stroke="rgba(0,0,0,0)"
                    strokeWidth="0"
                    strokeDasharray="0,0"
                  />
                </g>
                
                {/* Light grey border around the outside */}
                <rect
                  x="0"
                  y="0"
                  width={totalWidth}
                  height={totalHeight}
                  fill="none"
                  stroke="#cccccc"
                  strokeWidth="0.05"
                />
                
                {/* Joist lines */}
                <g className="joists">
                  {(() => {
                    // Calculate joist spacing in SVG units (800mm = 0.8m)
                    const joistSpacingM = 0.8;
                    const joists = [];
                    
                    if (!joistsRunLengthwise) {
                      // Vertical joists (running along length)
                      for (let bayIndex = 0; bayIndex < widthwiseBays; bayIndex++) {
                        const bayStartY = bayPositionsY[bayIndex];
                        const bayHeight = widthwiseBayWidths[bayIndex];
                        const bayEndY = bayStartY + bayHeight;
                        
                        for (let bayWidthIndex = 0; bayWidthIndex < lengthwiseBays; bayWidthIndex++) {
                          const bayStartX = bayPositionsX[bayWidthIndex];
                          const bayWidth = lengthwiseBayWidths[bayWidthIndex];
                          const bayEndX = bayStartX + bayWidth;
                          
                          // Calculate number of joists in this bay
                          const numJoists = Math.floor(bayWidth / joistSpacingM);
                          const actualSpacing = bayWidth / (numJoists + 1);
                          
                          // Draw joists
                          for (let i = 1; i <= numJoists; i++) {
                            const joistX = bayStartX + i * actualSpacing;
                            joists.push(
                              <line
                                key={`joist-v-${bayWidthIndex}-${bayIndex}-${i}`}
                                x1={joistX}
                                y1={bayStartY}
                                x2={joistX}
                                y2={bayEndY}
                                stroke="#cccccc"
                                strokeWidth="0.03"
                                strokeDasharray="0.1,0.1"
                              />
                            );
                          }
                        }
                      }
                    } else {
                      // Horizontal joists (running along width)
                      for (let bayIndex = 0; bayIndex < lengthwiseBays; bayIndex++) {
                        const bayStartX = bayPositionsX[bayIndex];
                        const bayWidth = lengthwiseBayWidths[bayIndex];
                        const bayEndX = bayStartX + bayWidth;
                        
                        for (let bayHeightIndex = 0; bayHeightIndex < widthwiseBays; bayHeightIndex++) {
                          const bayStartY = bayPositionsY[bayHeightIndex];
                          const bayHeight = widthwiseBayWidths[bayHeightIndex];
                          const bayEndY = bayStartY + bayHeight;
                          
                          // Calculate number of joists in this bay
                          const numJoists = Math.floor(bayHeight / joistSpacingM);
                          const actualSpacing = bayHeight / (numJoists + 1);
                          
                          // Draw joists
                          for (let i = 1; i <= numJoists; i++) {
                            const joistY = bayStartY + i * actualSpacing;
                            joists.push(
                              <line
                                key={`joist-h-${bayIndex}-${bayHeightIndex}-${i}`}
                                x1={bayStartX}
                                y1={joistY}
                                x2={bayEndX}
                                y2={joistY}
                                stroke="#cccccc"
                                strokeWidth="0.03"
                                strokeDasharray="0.1,0.1"
                              />
                            );
                          }
                        }
                      }
                    }
                    
                    return joists;
                  })()}
                </g>
                
                {/* Beams connecting columns - perpendicular to joists */}
                <g className="beams">
                  {(() => {
                    const beams = [];
                    
                    if (joistsRunLengthwise) {
                      // When joists run lengthwise (horizontal), beams run widthwise (vertical)
                      // Draw vertical beams along each column line
                      for (let col = 0; col <= lengthwiseBays; col++) {
                        const x = col === lengthwiseBays 
                          ? bayPositionsX[col-1] + lengthwiseBayWidths[col-1] 
                          : bayPositionsX[col];
                        
                        // Draw beam from top to bottom
                        beams.push(
                          <line
                            key={`beam-v-${col}`}
                            x1={x}
                            y1={0}
                            x2={x}
                            y2={totalHeight}
                            stroke="#555555"
                            strokeWidth="0.08"
                            strokeLinecap="square"
                          />
                        );
                      }
                    } else {
                      // When joists run widthwise (vertical), beams run lengthwise (horizontal)
                      // Draw horizontal beams along each row line
                      for (let row = 0; row <= widthwiseBays; row++) {
                        const y = row === widthwiseBays 
                          ? bayPositionsY[row-1] + widthwiseBayWidths[row-1] 
                          : bayPositionsY[row];
                        
                        // Draw beam from left to right
                        beams.push(
                          <line
                            key={`beam-h-${row}`}
                            x1={0}
                            y1={y}
                            x2={totalWidth}
                            y2={y}
                            stroke="#555555"
                            strokeWidth="0.08"
                            strokeLinecap="square"
                          />
                        );
                      }
                    }
                    
                    return beams;
                  })()}
                </g>
                
                {/* Column letters and bay numbers */}
                <g className="labels">
                  {/* Column letters at the top */}
                  {Array.from({ length: lengthwiseBays }).map((_, i) => {
                    const x = bayPositionsX[i] + lengthwiseBayWidths[i] / 2;
                    const letter = String.fromCharCode(65 + i); // A, B, C, ...
                    
                    // Calculate scale factor based on building size and screen size
                    const baseFontSize = 0.3;
                    const scaleFactor = Math.max(totalWidth, totalHeight) / 10;
                    const screenSizeFactor = isMobile ? 1.2 : 1; // Increase font size on mobile
                    const fontSize = baseFontSize * scaleFactor * screenSizeFactor;
                    
                    // Ensure minimum font size for readability
                    const finalFontSize = Math.max(fontSize, 0.35);
                    
                    return (
                      <text
                        key={`col-label-${i}`}
                        x={x}
                        y={-0.8 * (isMobile ? 1.5 : 1.2)} // Move further out on mobile
                        textAnchor="middle"
                        fontSize={finalFontSize}
                        fontWeight={isMobile ? "bold" : "normal"}
                        fill="#666666"
                      >
                        {letter}
                      </text>
                    );
                  })}
                  
                  {/* Row numbers on the left */}
                  {Array.from({ length: widthwiseBays }).map((_, i) => {
                    const y = bayPositionsY[i] + widthwiseBayWidths[i] / 2;
                    const number = i + 1; // 1, 2, 3, ...
                    
                    // Calculate scale factor based on building size and screen size
                    const baseFontSize = 0.3;
                    const scaleFactor = Math.max(totalWidth, totalHeight) / 10;
                    const screenSizeFactor = isMobile ? 1.2 : 1; // Increase font size on mobile
                    const fontSize = baseFontSize * scaleFactor * screenSizeFactor;
                    
                    // Ensure minimum font size for readability
                    const finalFontSize = Math.max(fontSize, 0.35);
                    
                    return (
                      <text
                        key={`row-label-${i}`}
                        x={-0.8 * (isMobile ? 1.5 : 1.2)} // Move further out on mobile
                        y={y + 0.1} // Slight adjustment for vertical centering
                        textAnchor="middle"
                        fontSize={finalFontSize}
                        fontWeight={isMobile ? "bold" : "normal"}
                        fill="#666666"
                      >
                        {number}
                      </text>
                    );
                  })}
          
                  {/* Building width dimension on the right (rotated 90 degrees) */}
                  {(() => {
                    // Calculate scale factor based on building size and screen size
                    const baseFontSize = 0.3;
                    const scaleFactor = Math.max(totalWidth, totalHeight) / 10;
                    const screenSizeFactor = isMobile ? 1.2 : 1; // Increase font size on mobile
                    const fontSize = baseFontSize * scaleFactor * screenSizeFactor;
                    
                    // Ensure minimum font size for readability
                    const finalFontSize = Math.max(fontSize, 0.35);
                    
                    // Position adjustment for mobile
                    const positionOffset = isMobile ? 1.2 : 1.0;
                    
                    return (
                      <text
                        key="width-dimension"
                        x={totalWidth + positionOffset}
                        y={totalHeight / 2}
                        textAnchor="middle"
                        fontSize={finalFontSize}
                        fontWeight={isMobile ? "bold" : "normal"}
                        fill="#666666"
                        transform={`rotate(90, ${totalWidth + positionOffset}, ${totalHeight / 2})`}
                      >
                        {buildingWidth.toFixed(1)}m
                      </text>
                    );
                  })()}
                  
                  {/* Building length dimension at the bottom */}
                  {(() => {
                    // Calculate scale factor based on building size and screen size
                    const baseFontSize = 0.3;
                    const scaleFactor = Math.max(totalWidth, totalHeight) / 10;
                    const screenSizeFactor = isMobile ? 1.2 : 1; // Increase font size on mobile
                    const fontSize = baseFontSize * scaleFactor * screenSizeFactor;
                    
                    // Ensure minimum font size for readability
                    const finalFontSize = Math.max(fontSize, 0.35);
                    
                    // Position adjustment for mobile
                    const positionOffset = isMobile ? 1.2 : 1.0;
                    
                    return (
                      <text
                        key="length-dimension"
                        x={totalWidth / 2}
                        y={totalHeight + positionOffset}
                        textAnchor="middle"
                        fontSize={finalFontSize}
                        fontWeight={isMobile ? "bold" : "normal"}
                        fill="#666666"
                      >
                        {buildingLength.toFixed(1)}m
                      </text>
                    );
                  })()}
                </g>
                
                {/* Columns at grid intersections */}
                <g className="columns">
                  {/* Generate columns at all grid intersections */}
                  {Array.from({ length: (lengthwiseBays + 1) * (widthwiseBays + 1) }).map((_, index) => {
                    const row = Math.floor(index / (lengthwiseBays + 1));
                    const col = index % (lengthwiseBays + 1);
                    
                    // Calculate column size based on actual dimensions, but scaled down
                    // Use a scaling factor of 400
                    const columnWidth = Math.max(results?.columnSize?.width / 400 || 0.25, 0.2);
                    const columnHeight = Math.max(results?.columnSize?.depth / 400 || 0.25, 0.2);
                    
                    // Make column size proportional to building size but with a minimum size
                    const buildingSizeScaleFactor = Math.max(
                      Math.min(totalWidth / 30, totalHeight / 30),
                      0.8 // Minimum scale factor to ensure columns are visible
                    );
                    
                    // Swap width and height based on joist direction
                    let scaledColumnWidth, scaledColumnHeight;
                    if (joistsRunLengthwise) {
                      // When joists run lengthwise (vertical joists), columns are oriented with width along the length
                      scaledColumnWidth = columnWidth * buildingSizeScaleFactor;
                      scaledColumnHeight = columnHeight * buildingSizeScaleFactor;
                    } else {
                      // When joists run widthwise (horizontal joists), columns are rotated 90 degrees
                      scaledColumnWidth = columnHeight * buildingSizeScaleFactor;
                      scaledColumnHeight = columnWidth * buildingSizeScaleFactor;
                    }
                    
                    // Calculate column position
                    let x, y;
                    
                    const isLeftEdge = col === 0;
                    const isRightEdge = col === lengthwiseBays;
                    const isTopEdge = row === 0;
                    const isBottomEdge = row === widthwiseBays;
                    
                    // Check if we have valid positions for this column
                    if (col < 0 || col > lengthwiseBays || row < 0 || row > widthwiseBays) {
                      return null; // Skip invalid positions
                    }
                    
                    // Make sure we have a valid position in the bayPositions arrays
                    const xPos = isRightEdge ? bayPositionsX[col-1] + lengthwiseBayWidths[col-1] : bayPositionsX[col];
                    const yPos = isBottomEdge ? bayPositionsY[row-1] + widthwiseBayWidths[row-1] : bayPositionsY[row];
                    
                    if (isLeftEdge) {
                      // Left edge column - move inside by half width
                      x = xPos + scaledColumnWidth/2;
                    } else if (isRightEdge) {
                      // Right edge column - move inside by half width
                      x = xPos - scaledColumnWidth/2;
                    } else {
                      // Interior column - centered on grid line
                      x = xPos;
                    }
                    
                    if (isTopEdge) {
                      // Top edge column - move inside by half height
                      y = yPos + scaledColumnHeight/2;
                    } else if (isBottomEdge) {
                      // Bottom edge column - move inside by half height
                      y = yPos - scaledColumnHeight/2;
                    } else {
                      // Interior column - centered on grid line
                      y = yPos;
                    }
                    
                    return (
                      <g key={`column-${row}-${col}`}>
                        <rect
                          x={x - scaledColumnWidth/2}
                          y={y - scaledColumnHeight/2}
                          width={scaledColumnWidth}
                          height={scaledColumnHeight}
                          fill="#555"
                          stroke="#333"
                          strokeWidth="0.02"
                          rx="0.02"
                          ry="0.02"
                        />
                      </g>
                    );
                  })}
                </g>
              </svg>
            );
          })()}
        </div>
      </div>
      
      {/* Moved this section below the visualization as requested */}
      <div className="text-center text-sm mt-4" style={{ color: 'var(--apple-text-secondary)' }}>
        {!useCustomBayDimensions ? (
          <div className="text-xs md:text-sm">Grid Cell Size: {(buildingLength / lengthwiseBays).toFixed(2)}m × {(buildingWidth / widthwiseBays).toFixed(2)}m</div>
        ) : (
          <div className="text-xs md:text-sm">Custom grid cell sizes applied</div>
        )}
        
        {/* Joist direction toggle buttons */}
        <div className="mt-3 mb-3">
          <div className="flex rounded-md overflow-hidden w-full max-w-md mx-auto">
            <button 
              className={`flex-1 py-2 px-4 text-center ${joistsRunLengthwise ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              onClick={() => !joistsRunLengthwise && onToggleJoistDirection()}
            >
              Vertical Joists ↕
            </button>
            <button 
              className={`flex-1 py-2 px-4 text-center ${!joistsRunLengthwise ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              onClick={() => joistsRunLengthwise && onToggleJoistDirection()}
            >
              Horizontal Joists ↔
            </button>
          </div>
          
          <p className="text-center text-xs text-gray-500 mt-2">
            ↔ / ↕ Arrows indicate joist span direction (click arrows or use toggle above to change direction)
          </p>
          <p className="text-center text-xs text-gray-500 mt-1">
            Joists are spaced at 800mm centres
          </p>
        </div>
      </div>
    </div>
  );
};

export default BayLayoutVisualizer; 