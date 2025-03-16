# SVG Bay Layout Implementation Plan

## Overview
This document outlines the plan for replacing the current div-based bay layout visualization with an SVG-based approach. The SVG implementation will provide more precise control over the placement of structural elements like columns, beams, and joists.

## Goals
1. Create a visually accurate representation of the structural grid
2. Ensure columns appear at the correct grid intersections
3. Maintain proper spacing between bays where beams are located
4. Render joist lines within each bay
5. Display bay dimensions and labels
6. Ensure the visualization is responsive

## Implementation Steps

### 1. Create SVG Container
- Replace the current div-based grid with an SVG element
- Set the SVG viewBox based on building dimensions
- Maintain the same aspect ratio as the current implementation

### 2. Define Grid Structure
- Calculate grid lines based on bay dimensions
- Create a coordinate system where (0,0) is the top-left corner
- Map building dimensions to SVG coordinates

### 3. Render Structural Elements

#### 3.1 Bays
- Render each bay as an SVG `<rect>` element
- Position based on the calculated grid
- Apply appropriate styling (fill color, stroke)
- Include bay labels and dimensions as SVG `<text>` elements

#### 3.2 Columns
- Render columns as small SVG `<rect>` elements
- Place columns at grid intersections:
  - All four corners of the building
  - At each grid intersection where beams meet
  - Size columns proportionally based on calculated column dimensions

#### 3.3 Beams
- Represent beams as the gaps between bays
- Only show gaps where beams are located (based on joist direction)
- Adjust gap size to represent beam width

#### 3.4 Joists
- Render joists as thin lines within each bay
- Direction based on the `joistsRunLengthwise` setting
- Space joists at 800mm centers
- Use light gray color with appropriate opacity

### 4. Add Labels and Dimensions
- Add column labels (A, B, C, etc.) along the top
- Add row labels (1, 2, 3, etc.) along the left side
- Display bay dimensions within each bay

### 5. Implement Responsiveness
- Ensure the SVG scales appropriately with container size
- Maintain aspect ratio based on building dimensions
- Adjust text size and element proportions for different screen sizes

## SVG Structure
```svg
<svg viewBox="0 0 [buildingLength] [buildingWidth]" preserveAspectRatio="xMidYMid meet">
  <!-- Grid background -->
  <g class="grid-background">
    <!-- Bay rectangles -->
  </g>
  
  <!-- Structural elements -->
  <g class="structural-elements">
    <!-- Columns -->
    <!-- Beams (represented by gaps) -->
    <!-- Joists -->
  </g>
  
  <!-- Labels and dimensions -->
  <g class="labels">
    <!-- Column labels -->
    <!-- Row labels -->
    <!-- Bay dimensions -->
  </g>
</svg>
```

## Key Functions

### 1. Coordinate Mapping
- `mapBuildingToSVG(x, y)`: Convert building coordinates (in meters) to SVG coordinates
- `calculateBayPositions()`: Determine the position of each bay in SVG coordinates

### 2. Element Generation
- `generateBayRects()`: Create SVG rectangles for each bay
- `generateColumns()`: Create SVG rectangles for columns at grid intersections
- `generateJoistLines()`: Create SVG lines for joists within each bay
- `generateLabels()`: Create SVG text elements for labels and dimensions

### 3. Layout Management
- `calculateGridLayout()`: Determine the overall grid structure
- `adjustForJoistDirection()`: Modify the layout based on joist direction

## Implementation Considerations

### Performance
- Use SVG groups (`<g>`) to organize elements
- Apply transforms for positioning when appropriate
- Consider using SVG patterns for repetitive elements like joists

### Accessibility
- Include appropriate ARIA attributes
- Ensure sufficient color contrast
- Add descriptive titles and descriptions

### Maintainability
- Structure the code to separate layout calculation from rendering
- Use constants for styling values
- Add comments to explain the coordinate system and calculations

## Integration with Existing Code
- Replace the current grid implementation in `TimberCalculator.js`
- Maintain the same state variables and calculation functions
- Ensure the SVG visualization updates when inputs change

## Testing Plan
1. Verify column placement at grid intersections
2. Check that bay dimensions are displayed correctly
3. Confirm that joists are rendered in the correct direction
4. Test with different building dimensions and bay counts
5. Verify responsiveness on different screen sizes

## Future Enhancements
- Add hover effects to show additional information
- Implement zoom and pan functionality for larger grids
- Add animation for state changes
- Provide a toggle between 2D and 3D views 