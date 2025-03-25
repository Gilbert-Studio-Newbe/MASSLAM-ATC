"use client";

import React from 'react';

/**
 * Bay Layout Visualizer Component
 * 
 * Displays an SVG visualization of the building's bay layout with columns, beams, and joists.
 * This is extracted from the original TimberCalculator.js component.
 */
const BayLayoutVisualizer = ({ 
  buildingData, 
  results, 
  isMobile,
  useCustomBayDimensions,
  customLengthwiseBayWidths,
  customWidthwiseBayWidths,
  handleToggleCustomBayDimensions,
  handleJoistDirectionChange,
}) => {
  const {
    buildingLength,
    buildingWidth,
    lengthwiseBays,
    widthwiseBays,
    joistsRunLengthwise
  } = buildingData;

  // Calculate SVG dimensions based on building size and screen
  const baseSize = 600; // Base size for SVG
  const aspectRatio = buildingLength / buildingWidth;
  let svgWidth, svgHeight;
  
  if (aspectRatio > 1) {
    // Building is longer than it is wide
    svgWidth = baseSize;
    svgHeight = baseSize / aspectRatio;
  } else {
    // Building is wider than it is long
    svgHeight = baseSize;
    svgWidth = baseSize * aspectRatio;
  }

  // Adjust for mobile
  if (isMobile) {
    const mobileScale = 0.8;
    svgWidth *= mobileScale;
    svgHeight *= mobileScale;
  }

  // Calculate bay dimensions based on whether custom dimensions are used
  const calculateBayDimensions = () => {
    if (!useCustomBayDimensions) {
      // Use equal distribution
      return {
        lengthwiseBayWidths: Array(lengthwiseBays).fill(buildingLength / lengthwiseBays),
        widthwiseBayWidths: Array(widthwiseBays).fill(buildingWidth / widthwiseBays)
      };
    }
    
    // Ensure the sum of custom dimensions matches the building dimensions
    const totalLengthwise = customLengthwiseBayWidths.reduce((sum, width) => sum + width, 0);
    const totalWidthwise = customWidthwiseBayWidths.reduce((sum, width) => sum + width, 0);
    
    // Normalize if needed
    let normalizedLengthwiseBayWidths = [...customLengthwiseBayWidths];
    let normalizedWidthwiseBayWidths = [...customWidthwiseBayWidths];
    
    if (Math.abs(totalLengthwise - buildingLength) > 0.01) {
      const scaleFactor = buildingLength / totalLengthwise;
      normalizedLengthwiseBayWidths = customLengthwiseBayWidths.map(width => width * scaleFactor);
    }
    
    if (Math.abs(totalWidthwise - buildingWidth) > 0.01) {
      const scaleFactor = buildingWidth / totalWidthwise;
      normalizedWidthwiseBayWidths = customWidthwiseBayWidths.map(width => width * scaleFactor);
    }
    
    return {
      lengthwiseBayWidths: normalizedLengthwiseBayWidths,
      widthwiseBayWidths: normalizedWidthwiseBayWidths
    };
  };

  return (
    <div className="flex flex-col items-center">
      {/* SVG visualization */}
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="border border-gray-200 rounded"
      >
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
                  const columnWidth = Math.max(results.columnSize.width / 400, 0.2);
                  const columnHeight = Math.max(results.columnSize.depth / 400, 0.2);
                  
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
                  
                  // Ensure we're using the correct variable for edge detection
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
      </svg>

      <div className="text-center text-sm mt-4" style={{ color: 'var(--apple-text-secondary)' }}>
        {!useCustomBayDimensions ? (
          <div className="text-xs md:text-sm">Grid Cell Size: {(buildingLength / lengthwiseBays).toFixed(2)}m × {(buildingWidth / widthwiseBays).toFixed(2)}m</div>
        ) : (
          <div className="text-xs md:text-sm">Custom grid cell sizes applied</div>
        )}
      </div>
    </div>
  );
};

export default BayLayoutVisualizer; 