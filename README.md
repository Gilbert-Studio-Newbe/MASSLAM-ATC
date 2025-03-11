# MASSLAM Timber Structure Calculator

A comprehensive parametric design tool for timber post and beam structures using MASSLAM engineered timber sections.

## Overview

The MASSLAM Timber Structure Calculator is a specialized tool for designing timber structures with standard MASSLAM timber sections. It allows for dynamic sizing of structural elements based on spans, loads, and fire requirements while ensuring that only available timber sections from the MASSLAM product line are used.

### Key Features

1. **Parametric Design**:
   - Configure bay sizes, spans and overall dimensions
   - Adjust number of floors and layout orientation
   - Define loading conditions (residential or commercial)
   - Specify fire resistance level (FRL) requirements

2. **MASSLAM Integration**:
   - Uses standard timber sections from MASSLAM_sizes.csv
   - Incorporates mechanical properties from MASSLAM_SL33_Mechanical_Properties.csv
   - Ensures all designs only use available manufactured sections

3. **Structural Analysis**:
   - Automatic calculation of required member sizes based on spans and loads
   - Verification of structural integrity and performance
   - Optimization suggestions for material efficiency

4. **Fire Performance**:
   - Visual fire resistance analysis based on MASSLAM charring rate
   - Calculation of residual sections after fire exposure
   - Verification of FRL compliance

5. **Sustainability & Cost**:
   - Timber volume and weight calculations
   - Carbon savings estimation compared to steel and concrete
   - Comprehensive cost breakdown

## Getting Started

### Prerequisites

- Node.js 14+ and npm
- Next.js framework

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Future Improvements

### Enhanced Column Sizing Calculations

A more robust approach to column sizing is planned, incorporating proper structural engineering principles for multi-story timber buildings:

#### Phase 1: Calculation Logic Development

1. **Create Advanced Column Sizing Functions**
   - Implement proper axial capacity calculations using MASSLAM_SL33 properties
   - Add buckling analysis based on slenderness ratio
   - Include modification factors for load duration, service conditions, etc.
   - Develop ground-level column load accumulation logic

2. **Validation Functions**
   - Create functions to validate the calculations against known examples
   - Implement safety checks and warnings for edge cases

#### Phase 2: Calculation Methodology Documentation

1. **Update the "Member Calculation Methodology" Page**
   - Add a dedicated section for column sizing methodology
   - Include detailed explanations of:
     - Axial load accumulation through floors
     - Compression capacity calculations
     - Buckling analysis and slenderness effects
     - Modification factors and their impact
   - Provide example calculations with step-by-step breakdowns
   - Include relevant formulas and references to timber design codes

2. **Add Visual Aids**
   - Include diagrams showing load paths through the structure
   - Add graphs showing the relationship between building height and column size
   - Provide visual representations of buckling modes

#### Phase 3: Integration with Existing UI

1. **Enhance the Calculation Engine**
   - Integrate the new column sizing functions with the existing calculator
   - Ensure the UI remains responsive despite more complex calculations
   - Implement caching or optimization if needed for performance

2. **Subtle UI Enhancements**
   - Keep the main "Member Calculator" page clean and simple
   - Add small indicators for advanced calculations (like a small info icon)
   - Provide links to the methodology page for users who want to understand the details

#### Phase 4: Testing and Refinement

1. **Validation Testing**
   - Test with various building configurations
   - Verify results against manual calculations
   - Check edge cases (very tall buildings, heavy loads, etc.)

2. **Performance Testing**
   - Ensure calculations don't slow down the UI
   - Optimize if necessary

This enhancement will significantly improve the structural accuracy of the calculator, especially for multi-story buildings, while maintaining a clean and user-friendly interface.