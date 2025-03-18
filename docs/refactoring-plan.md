# Timber Calculator Refactoring Plan

## Current Problems
- The TimberCalculator.js component is monolithic (2000+ lines) and handles too many responsibilities
- Simple edits to the "member calculator" cause compile issues 
- Build errors like "Cannot find module" and JSX syntax errors
- Multiple renderers concurrently rendering the same context provider
- Component has become brittle and difficult to maintain
- Related concerns are scattered throughout the large file
- Difficult to track state changes and data flow

## Objectives
1. Improve maintainability by breaking down the monolith
2. Separate concerns (calculations, UI, state management)
3. Make the codebase more robust against errors
4. Create a better developer experience for future changes
5. Establish patterns for code organization 
6. Fix build issues related to Next.js configuration

## Refactoring Strategy

### 1. Component Structure Reorganization
- Split TimberCalculator.js into multiple smaller components
- Create dedicated pages for separate calculators
- Move "Member Calculator" to its own route

### 2. Code Organization
```
src/
├── app/                     # Next.js App Router
│   ├── page.tsx             # Home/Main calculator page
│   ├── members/             # New route for member calculator
│   │   └── page.tsx         # Member calculator page
├── components/              # Shared Components
│   ├── common/              # Common UI elements
│   │   ├── SliderInput.js   # Extracted from TimberCalculator
│   │   └── ...
│   ├── calculator/          # Calculator-specific components
│   │   ├── BuildingForm.js  # Building dimensions form
│   │   ├── ResultsDisplay.js # Results visualization
│   │   └── ...
│   └── visualization/       # 3D Visualization components 
│       └── ...
├── hooks/                   # Custom React hooks
│   ├── useTimberCalculations.js
│   ├── useLocalStorage.js
│   └── ...
├── utils/                   # Utility functions
│   ├── calculations/        # Calculation logic
│   │   ├── beamCalculations.js
│   │   ├── columnCalculations.js
│   │   ├── joistCalculations.js
│   │   └── ...
│   ├── helpers.js           # General helper functions
│   └── ...
└── contexts/                # React Context definitions
    ├── BuildingDataContext.js
    └── ...
```

### 3. State Management Improvements
- Use React Context for global state
- Create custom hooks for related state and logic
- Implement proper state organization to reduce prop drilling
- Better separate UI state from calculation data

### 4. Refactoring Phases

#### Phase 1: Extract Utilities
- Move calculation functions to utility files
- Create helper functions for repeated tasks

#### Phase 2: Componentize UI
- Extract UI components from TimberCalculator.js
- Create reusable components for consistent patterns

#### Phase 3: State Management
- Implement React Context for global state
- Create custom hooks for related functionality
- Ensure proper data flow between components

#### Phase 4: New Member Calculator Route
- Create a new route for the member calculator
- Implement the new page using the refactored components

#### Phase 5: Bug Fixes and Testing
- Fix Next.js build issues
- Address the "multiple renderers" warning
- Test all functionality thoroughly
- Fix any regressions

## Implementation Details

### Custom Hooks
- `useTimberCalculations`: For encapsulating calculation logic
- `useFormState`: For managing form inputs and validation
- `useLocalStorage`: For persistent storage of calculator state

### Component Extraction Priorities
1. `SliderInput` - Used extensively and self-contained
2. Results display components
3. Form sections by logical grouping

### Next.js Specific Concerns
- Ensure proper module resolution
- Fix dependency issues
- Address build configuration problems

## Dependency Management
- Audit and resolve package dependencies
- Fix the issue with missing 'didyoumean' dependency
- Address webpack caching problems

## Testing Strategy
- Test each refactored component in isolation
- Verify calculations produce the same results
- Ensure state management works correctly across components
- Validate storage and retrieval of user data

## Expected Benefits
- Easier maintenance and future development
- More robust application with fewer errors
- Better developer experience
- Improved performance with optimized rendering
- Clearer code organization and documentation 