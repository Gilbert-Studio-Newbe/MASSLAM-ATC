# Fire Rating Implementation in Timber Calculator

This document outlines the implementation plan for properly incorporating Fire Rating Level (FRL) requirements into the Timber Calculator application.

## Current Understanding

1. **Fixed Width Based on Fire Rating**
   - The `getFixedWidthForFireRating` function in `timberEngineering.js` maps FRL values to minimum joist widths:
     - 'none': 120mm
     - '30/30/30', '60/60/60': 165mm
     - '90/90/90': 205mm
     - '120/120/120': 250mm

2. **Concrete Thickness Based on Fire Rating**
   - The `getConcreteThickness` function maps FRL values to concrete thicknesses:
     - 'none', '30/30/30', '60/60/60': 100mm
     - '90/90/90': 110mm
     - '120/120/120': 120mm

3. **Current Issues**
   - Missing SL33 charring rate export (should use ML38 data instead)
   - Potential improper sequencing of when FRL requirements are applied

## Implementation Plan Checklist

### 1. Ensure Proper Export of Fixed Width Function
- [x] Verify `getFixedWidthForFireRating` function is properly exported from `timberEngineering.js`
- [x] Confirm it's imported and used in all relevant calculation functions

### 2. Fix Data Flow for Fire Rating
- [x] Update calculation sequence to process fire rating early in the pipeline
- [x] Ensure concrete thickness is determined from fire rating
- [x] Verify concrete load is properly included in total load calculations
- [x] Confirm joist width is constrained by fire rating minimums

### 3. Remove SL33 Dependency
- [x] Identify and fix references to `loadMasslamSL33CharringRate` in `FireResistanceCalculator.js`
- [x] Update to use ML38 data for all calculations
- [x] Fix import statements to remove the missing dependency

### 4. Improve Self-Weight Feedback Loop
- [x] Implement calculation of preliminary member sizes based on imposed loads
- [x] Calculate self-weight of preliminary members
- [x] Add self-weight to total load
- [x] Re-calculate final member sizes with updated loads
- [x] Verify final sizes still meet fire rating requirements

### 5. Unified Fire Rating Context
- [x] Ensure fire rating is properly stored in the BuildingDataContext
- [x] Create specific handlers for fire rating changes
- [x] Implement recalculation of related values when fire rating changes

### 6. Error Handling and Validation
- [x] Add validation for fire rating inputs
- [x] Ensure graceful fallbacks for invalid inputs
- [x] Add appropriate error messages and warnings

### 7. Testing and Debugging
- [x] Add strategic console logs to validate the fire rating flow
- [x] Test with different fire ratings to ensure proper member sizing
- [x] Verify concrete thickness is correctly applied to load calculations
- [x] Confirm minimum widths are enforced based on fire rating
- [x] Check that self-weight feedback loop is functioning correctly 