# Current Application Logic Map

## TimberCalculator.js - Core Component Structure

### State Variables
- `buildingLength`, `buildingWidth`: Dimensions of the building (meters)
- `numFloors`: Number of floors in the building
- `floorHeight`: Height of each floor (meters)
- `lengthwiseBays`, `widthwiseBays`: Number of bays in each direction
- `load`: Design load (kPa)
- `fireRating`: Required fire rating ('none', '30/30/30', '60/60/60', etc.)
- `showCustomBayDimensions`: Toggle for custom bay dimensions
- `lengthwiseBayWidths`, `widthwiseBayWidths`: Arrays of custom bay widths
- `joistsRunLengthwise`: Direction of joists
- `timberGrade`: Selected timber grade ('ML38', 'GL15', etc.)
- `results`: Calculation results for sizing
- `project`: Current project information
- `showSaveModal`: Modal visibility state
- `projectName`: Name input for saving projects
- `savedProjects`: List of saved projects
- `showResults`: Toggle for results visibility
- `show3DView`: Toggle for 3D visualization
- `originalBayWidths`: Store original bay width values
- Various UI state variables (focusedInput, isDragging, etc.)

### Core Calculation Functions

#### `calculateMultiFloorBeamSize()`
- **Purpose**: Calculate beam dimensions based on loading and span
- **Parameters**: span, load, joistSpacing, numFloors, fireRating, etc.
- **Returns**: Beam dimensions (width, depth)
- **Uses**: Iterates through allowable timber sizes, calculates bending and shear capacities
- **Called By**: `calculateResults()`

#### `calculateMultiFloorColumnSize()`
- **Purpose**: Calculate column dimensions based on loading and height
- **Parameters**: beamWidth, load, height, floors, fireRating, etc.
- **Returns**: Column dimensions (width, depth)
- **Uses**: Calculates compression capacity for different column sizes
- **Called By**: `calculateResults()`

#### `calculateResults()`
- **Purpose**: Main calculation function that computes all structural member sizes
- **Calls**: `calculateMultiFloorBeamSize()`, `calculateMultiFloorColumnSize()`
- **Handles**: Concrete slab thickness, joists, beams, columns calculations
- **Triggered By**: User inputs, form submission
- **Side Effects**: Updates results state, stores in localStorage

### UI Components and Helper Functions

#### `SliderInput`
- **Purpose**: Reusable slider component with label, input field, and slider
- **Props**: label, value, onChange, min, max, step, unit, etc.
- **Used By**: All numerical inputs in the calculator form
- **Contains**: Input validation, keyboard handlers, focus management

#### Form Event Handlers
- `handleBuildingLengthChange`, `handleBuildingWidthChange`, etc.: Update respective state values
- `handleToggleCustomBayDimensions`: Toggles custom bay dimensions interface
- `toggleJoistDirection`: Toggles joist orientation
- `handleTimberGradeChange`: Updates timber grade selection

#### UI State Management
- `handleResize`: Window resize event handler
- Multiple modal visibility toggles (save project, load project, etc.)
- Various focus and drag handlers for UI interactions

#### Local Storage Integration
- `saveProject()`: Saves current project to localStorage
- `loadSavedProject()`: Retrieves and loads a saved project
- `saveStateBeforeUnload()`: Autosaves state on page unload
- `loadProperties()`: Loads calculator state from localStorage

### Cost Calculations

#### `calculateCosts()`
- **Purpose**: Estimate material costs based on calculated sizes
- **Calls**: `calculateJoistVolume()`, `calculateBeamVolume()`, `calculateColumnVolume()`
- **Returns**: Estimated costs for different materials

#### Volume Calculation Functions
- `calculateJoistVolume()`: Calculates total volume of joists
- `calculateBeamVolume()`: Calculates total volume of beams
- `calculateColumnVolume()`: Calculates total volume of columns

### Lifecycle and Effects

- `useEffect(() => {...}, [])`: Initial data loading
- `useEffect(() => {...}, [dependencies])`: Various effects for state synchronization
- `useEffect(() => {...}, [show3DView])`: 3D view initialization
- `useEffect(() => {...}, [isMountedRef.current])`: Event listener setup
- Route change handlers to prevent accidental navigation

## Relationship with Other Components

### BuildingVisualization.js
- **Purpose**: 3D visualization of calculated building
- **Receives Data From**: TimberCalculator.js via localStorage
- **Relationship**: Independent component, data passed through localStorage
- **Triggered By**: "View 3D Model" button in TimberCalculator

### buildingDataStore.js
- **Purpose**: Utility for storing and retrieving building data
- **Methods**:
  - `setBuildingData()`: Stores data in localStorage
  - `getBuildingData()`: Retrieves data from localStorage
- **Used By**: TimberCalculator.js, BuildingVisualization.js

### timberEngineering.js
- **Purpose**: Contains engineering calculations and constants
- **Exports**:
  - Constants for timber properties
  - Size-related utility functions
  - Load and capacity calculations
- **Used By**: TimberCalculator.js calculation functions

## Data Flow

1. **User Input** → State Variables
2. State Variables → **Calculation Functions**
3. Calculation Functions → **Results State**
4. Results State → **UI Rendering**
5. Results State → **localStorage**
6. localStorage → **BuildingVisualization**

## Key Pain Points in Current Implementation

1. **Monolithic Structure**:
   - TimberCalculator.js handles UI, calculations, state, storage, etc.
   - Functions with mixed responsibilities

2. **Tight Coupling**:
   - UI directly tied to calculation logic
   - State management distributed throughout component

3. **Prop Drilling Issues**:
   - Passing numerous props to deeply nested components

4. **Redundant Calculations**:
   - Some calculations are repeated in different functions
   - Limited reuse of calculation logic

5. **Unpredictable State Updates**:
   - Multiple useEffect hooks with overlapping dependencies
   - Complex state update chains

6. **Mixed Component Patterns**:
   - Mixing controlled and uncontrolled components
   - Inconsistent event handling patterns

7. **Limited Separation of Concerns**:
   - View logic mixed with business logic
   - Data transformation mixed with state management

## Build/Dependency Issues

1. Multiple renderers warning:
   - Potential React context provider issues
   - May be related to how the 3D visualization is mounted/unmounted

2. Missing module errors:
   - 'didyoumean' dependency missing (used by TailwindCSS)
   - Module resolution issues in Next.js configuration

3. JSX Syntax Errors:
   - Malformed JSX in TimberCalculator.js causing compile failures
   - Error in Link component usage 