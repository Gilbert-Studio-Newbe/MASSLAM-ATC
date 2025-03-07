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