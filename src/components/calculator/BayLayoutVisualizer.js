"use client";

import React from 'react';

/**
 * Bay Layout Visualizer Component
 * 
 * Displays an SVG visualization of the building's bay layout with columns, beams, and joists.
 */
const BayLayoutVisualizer = ({ 
  buildingData, 
  results, 
  isMobile,
  useCustomBayDimensions,
  customLengthwiseBayWidths,
  customWidthwiseBayWidths
}) => {
  const {
    buildingLength,
    buildingWidth,
    lengthwiseBays,
    widthwiseBays,
    joistsRunLengthwise
  } = buildingData;

  // Calculate SVG dimensions based on building size and screen
  const baseSize = 600;
  const aspectRatio = buildingLength / buildingWidth;
  const svgDimensions = (() => {
    let width, height;
    if (aspectRatio > 1) {
      width = baseSize;
      height = baseSize / aspectRatio;
    } else {
      height = baseSize;
      width = baseSize * aspectRatio;
    }
    
    if (isMobile) {
      const mobileScale = 0.8;
      width *= mobileScale;
      height *= mobileScale;
    }
    
    return { width, height };
  })();

  // Calculate bay dimensions based on whether custom dimensions are used
  const calculateBayDimensions = () => {
    if (!useCustomBayDimensions || !customLengthwiseBayWidths || !customWidthwiseBayWidths) {
      return {
        lengthwiseBayWidths: Array(lengthwiseBays).fill(buildingLength / lengthwiseBays),
        widthwiseBayWidths: Array(widthwiseBays).fill(buildingWidth / widthwiseBays)
      };
    }
    
    // Use custom dimensions and normalize if needed
    const totalLengthwise = customLengthwiseBayWidths.reduce((sum, width) => sum + width, 0);
    const totalWidthwise = customWidthwiseBayWidths.reduce((sum, width) => sum + width, 0);
    
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

  // Calculate bay positions and dimensions
  const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();
  const totalWidth = lengthwiseBayWidths.reduce((sum, w) => sum + w, 0);
  const totalHeight = widthwiseBayWidths.reduce((sum, h) => sum + h, 0);
  
  // Calculate positions for each bay
  const bayPositionsX = lengthwiseBayWidths.reduce((positions, width) => {
    const lastPos = positions.length > 0 ? positions[positions.length - 1] : 0;
    return [...positions, lastPos + width];
  }, [0]);
  
  const bayPositionsY = widthwiseBayWidths.reduce((positions, height) => {
    const lastPos = positions.length > 0 ? positions[positions.length - 1] : 0;
    return [...positions, lastPos + height];
  }, [0]);

  // SVG view settings
  const viewBoxPadding = isMobile ? 2.5 : 2;
  const viewBox = `-${viewBoxPadding} -${viewBoxPadding} ${totalWidth + viewBoxPadding*2} ${totalHeight + viewBoxPadding*2}`;

  // Render functions for different elements
  const renderJoists = () => {
    const joistSpacingM = 0.8;
    const joists = [];
    
    if (!joistsRunLengthwise) {
      // Vertical joists
      widthwiseBayWidths.forEach((bayHeight, bayIndex) => {
        const bayStartY = bayPositionsY[bayIndex];
        const bayEndY = bayStartY + bayHeight;
        
        lengthwiseBayWidths.forEach((bayWidth, bayWidthIndex) => {
          const bayStartX = bayPositionsX[bayWidthIndex];
          const numJoists = Math.floor(bayWidth / joistSpacingM);
          const actualSpacing = bayWidth / (numJoists + 1);
          
          Array.from({ length: numJoists }).forEach((_, i) => {
            const joistX = bayStartX + (i + 1) * actualSpacing;
            joists.push(
              <line
                key={`joist-v-${bayWidthIndex}-${bayIndex}-${i+1}`}
                x1={joistX}
                y1={bayStartY}
                x2={joistX}
                y2={bayEndY}
                stroke="#cccccc"
                strokeWidth="0.03"
                strokeDasharray="0.1,0.1"
              />
            );
          });
        });
      });
    } else {
      // Horizontal joists
      lengthwiseBayWidths.forEach((bayWidth, bayIndex) => {
        const bayStartX = bayPositionsX[bayIndex];
        const bayEndX = bayStartX + bayWidth;
        
        widthwiseBayWidths.forEach((bayHeight, bayHeightIndex) => {
          const bayStartY = bayPositionsY[bayHeightIndex];
          const numJoists = Math.floor(bayHeight / joistSpacingM);
          const actualSpacing = bayHeight / (numJoists + 1);
          
          Array.from({ length: numJoists }).forEach((_, i) => {
            const joistY = bayStartY + (i + 1) * actualSpacing;
            joists.push(
              <line
                key={`joist-h-${bayIndex}-${bayHeightIndex}-${i+1}`}
                x1={bayStartX}
                y1={joistY}
                x2={bayEndX}
                y2={joistY}
                stroke="#cccccc"
                strokeWidth="0.03"
                strokeDasharray="0.1,0.1"
              />
            );
          });
        });
      });
    }
    
    return joists;
  };

  const renderBeams = () => {
    const beams = [];
    
    if (joistsRunLengthwise) {
      // Vertical beams
      Array.from({ length: lengthwiseBays + 1 }).forEach((_, col) => {
        const x = col === lengthwiseBays 
          ? bayPositionsX[col-1] + lengthwiseBayWidths[col-1] 
          : bayPositionsX[col];
        
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
      });
    } else {
      // Horizontal beams
      Array.from({ length: widthwiseBays + 1 }).forEach((_, row) => {
        const y = row === widthwiseBays 
          ? bayPositionsY[row-1] + widthwiseBayWidths[row-1] 
          : bayPositionsY[row];
        
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
      });
    }
    
    return beams;
  };

  const renderColumns = () => {
    if (!results?.columnSize) return null;

    const buildingSizeScaleFactor = Math.max(
      Math.min(totalWidth / 30, totalHeight / 30),
      0.8
    );

    const baseColumnWidth = Math.max(results.columnSize.width / 400, 0.2);
    const baseColumnHeight = Math.max(results.columnSize.depth / 400, 0.2);

    return Array.from({ length: (lengthwiseBays + 1) * (widthwiseBays + 1) }).map((_, index) => {
      const row = Math.floor(index / (lengthwiseBays + 1));
      const col = index % (lengthwiseBays + 1);
      
      if (col < 0 || col > lengthwiseBays || row < 0 || row > widthwiseBays) return null;

      const isLeftEdge = col === 0;
      const isRightEdge = col === lengthwiseBays;
      const isTopEdge = row === 0;
      const isBottomEdge = row === widthwiseBays;

      const [scaledColumnWidth, scaledColumnHeight] = joistsRunLengthwise 
        ? [baseColumnWidth * buildingSizeScaleFactor, baseColumnHeight * buildingSizeScaleFactor]
        : [baseColumnHeight * buildingSizeScaleFactor, baseColumnWidth * buildingSizeScaleFactor];

      const xPos = isRightEdge ? bayPositionsX[col-1] + lengthwiseBayWidths[col-1] : bayPositionsX[col];
      const yPos = isBottomEdge ? bayPositionsY[row-1] + widthwiseBayWidths[row-1] : bayPositionsY[row];

      const x = isLeftEdge ? xPos + scaledColumnWidth/2 
        : isRightEdge ? xPos - scaledColumnWidth/2 
        : xPos;

      const y = isTopEdge ? yPos + scaledColumnHeight/2
        : isBottomEdge ? yPos - scaledColumnHeight/2
        : yPos;

      return (
        <rect
          key={`column-${row}-${col}`}
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
      );
    });
  };

  const renderLabels = () => {
    const baseFontSize = 0.3;
    const scaleFactor = Math.max(totalWidth, totalHeight) / 10;
    const screenSizeFactor = isMobile ? 1.2 : 1;
    const fontSize = Math.max(baseFontSize * scaleFactor * screenSizeFactor, 0.35);
    const positionOffset = isMobile ? 1.2 : 1.0;

    return (
      <>
        {/* Column letters */}
        {lengthwiseBayWidths.map((width, i) => (
          <text
            key={`col-label-${i}`}
            x={bayPositionsX[i] + width / 2}
            y={-0.8 * (isMobile ? 1.5 : 1.2)}
            textAnchor="middle"
            fontSize={fontSize}
            fontWeight={isMobile ? "bold" : "normal"}
            fill="#666666"
          >
            {String.fromCharCode(65 + i)}
          </text>
        ))}

        {/* Row numbers */}
        {widthwiseBayWidths.map((height, i) => (
          <text
            key={`row-label-${i}`}
            x={-0.8 * (isMobile ? 1.5 : 1.2)}
            y={bayPositionsY[i] + height / 2 + 0.1}
            textAnchor="middle"
            fontSize={fontSize}
            fontWeight={isMobile ? "bold" : "normal"}
            fill="#666666"
          >
            {i + 1}
          </text>
        ))}

        {/* Width dimension */}
        <text
          key="width-dimension"
          x={totalWidth + positionOffset}
          y={totalHeight / 2}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight={isMobile ? "bold" : "normal"}
          fill="#666666"
          transform={`rotate(90, ${totalWidth + positionOffset}, ${totalHeight / 2})`}
        >
          {buildingWidth.toFixed(1)}m
        </text>

        {/* Length dimension */}
        <text
          key="length-dimension"
          x={totalWidth / 2}
          y={totalHeight + positionOffset}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight={isMobile ? "bold" : "normal"}
          fill="#666666"
        >
          {buildingLength.toFixed(1)}m
        </text>
      </>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        width={svgDimensions.width}
        height={svgDimensions.height}
        viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
        className="rounded"
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          style={{ 
            background: 'white', 
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
          }}
        >
          {/* Remove border rect and just keep building elements */}
          <g className="joists">{renderJoists()}</g>
          <g className="beams">{renderBeams()}</g>
          <g className="columns">{renderColumns()}</g>
          <g className="labels">{renderLabels()}</g>
        </svg>
      </svg>

      <div className="text-center text-sm mt-4" style={{ color: 'var(--apple-text-secondary)' }}>
        {!useCustomBayDimensions ? (
          <div className="text-xs md:text-sm">
            Grid Cell Size: {(buildingLength / lengthwiseBays).toFixed(2)}m × {(buildingWidth / widthwiseBays).toFixed(2)}m
          </div>
        ) : (
          <div className="text-xs md:text-sm">Custom grid cell sizes applied</div>
        )}
      </div>
    </div>
  );
};

export default BayLayoutVisualizer; 