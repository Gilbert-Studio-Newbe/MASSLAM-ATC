'use client';

import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { getBuildingData } from '../utils/buildingDataStore';

// Mock data for development - will be replaced with real data
const mockData = {
  buildingLength: 18,
  buildingWidth: 14,
  numFloors: 6,
  floorHeight: 3.2,
  lengthwiseBays: 3,
  widthwiseBays: 2,
  joistSize: { width: 120, depth: 200 },
  beamSize: { width: 165, depth: 330 },
  edgeBeamSize: { width: 165, depth: 330 },
  columnSize: { width: 250, depth: 250, height: 3.2 },
  fireRating: '60/60/60',
  joistsRunLengthwise: true
};

// Colors for different structural members
const COLORS = {
  COLUMN: new THREE.Color('#8B4513'),  // SaddleBrown
  BEAM: new THREE.Color('#A0522D'),    // Sienna
  EDGE_BEAM: new THREE.Color('#CD853F'), // Peru
  JOIST: new THREE.Color('#DEB887'),   // BurlyWood
  FLOOR: new THREE.Color('#F5F5DC').multiplyScalar(0.9),  // Beige, slightly darkened
  GRID: new THREE.Color('#333333')
};

// Material definitions
const columnMaterial = new THREE.MeshStandardMaterial({ 
  color: COLORS.COLUMN, 
  roughness: 0.7, 
  metalness: 0.1,
  wireframe: false
});

const beamMaterial = new THREE.MeshStandardMaterial({ 
  color: COLORS.BEAM, 
  roughness: 0.7, 
  metalness: 0.1,
  wireframe: false
});

const edgeBeamMaterial = new THREE.MeshStandardMaterial({ 
  color: COLORS.EDGE_BEAM, 
  roughness: 0.7, 
  metalness: 0.1,
  wireframe: false
});

const joistMaterial = new THREE.MeshStandardMaterial({ 
  color: COLORS.JOIST, 
  roughness: 0.8, 
  metalness: 0.1,
  wireframe: false
});

const floorMaterial = new THREE.MeshStandardMaterial({ 
  color: COLORS.FLOOR, 
  roughness: 0.9, 
  metalness: 0.0,
  transparent: true,
  opacity: 0.3,
  wireframe: false
});

const Building = ({ data }) => {
  const {
    buildingLength,
    buildingWidth,
    numFloors,
    floorHeight,
    lengthwiseBays,
    widthwiseBays,
    joistSize,
    beamSize,
    edgeBeamSize,
    columnSize,
    joistsRunLengthwise
  } = data;

  // Convert millimeters to meters for member sizes
  const joistWidth = joistSize.width / 1000;
  const joistDepth = joistSize.depth / 1000;
  const beamWidth = beamSize.width / 1000;
  const beamDepth = beamSize.depth / 1000;
  const edgeBeamWidth = edgeBeamSize.width / 1000;
  const edgeBeamDepth = edgeBeamSize.depth / 1000;
  const columnWidth = columnSize.width / 1000;
  const columnDepth = columnSize.depth / 1000;

  // Calculate bay dimensions
  const bayLength = buildingLength / lengthwiseBays;
  const bayWidth = buildingWidth / widthwiseBays;

  // Calculate joist spacing (approximately 800mm)
  const joistSpacing = 0.8;

  // Generate all structural elements
  const columns = [];
  const beams = [];
  const edgeBeams = [];
  const joists = [];
  const floors = [];

  // Create columns (at grid intersections)
  for (let floor = 0; floor < numFloors; floor++) {
    for (let x = 0; x <= lengthwiseBays; x++) {
      for (let y = 0; y <= widthwiseBays; y++) {
        const posX = (x * bayLength) - (buildingLength / 2);
        const posY = (floor * floorHeight) + (floorHeight / 2);
        const posZ = (y * bayWidth) - (buildingWidth / 2);

        columns.push(
          <mesh
            key={`column-${floor}-${x}-${y}`}
            position={[posX, posY, posZ]}
            material={columnMaterial}
          >
            <boxGeometry args={[columnWidth, floorHeight, columnDepth]} />
          </mesh>
        );
      }
    }
  }

  // Create beams
  for (let floor = 0; floor < numFloors; floor++) {
    const posY = (floor + 1) * floorHeight - (beamDepth / 2);

    if (joistsRunLengthwise) {
      // If joists run lengthwise, beams run widthwise
      // Interior beams
      for (let x = 0; x < lengthwiseBays + 1; x++) {
        for (let z = 0; z < widthwiseBays; z++) {
          const posX = (x * bayLength) - (buildingLength / 2);
          const posZ = (z * bayWidth + bayWidth / 2) - (buildingWidth / 2);
          
          beams.push(
            <mesh
              key={`beam-widthwise-${floor}-${x}-${z}`}
              position={[posX, posY, posZ]}
              material={beamMaterial}
            >
              <boxGeometry args={[beamWidth, beamDepth, bayWidth]} />
            </mesh>
          );
        }
      }

      // Edge beams along length
      for (let x = 0; x < lengthwiseBays; x++) {
        // Front edge
        const frontPosZ = -(buildingWidth / 2);
        const frontPosX = (x * bayLength + bayLength / 2) - (buildingLength / 2);
        
        edgeBeams.push(
          <mesh
            key={`edge-beam-front-${floor}-${x}`}
            position={[frontPosX, posY, frontPosZ]}
            material={edgeBeamMaterial}
          >
            <boxGeometry args={[bayLength, edgeBeamDepth, edgeBeamWidth]} />
          </mesh>
        );
        
        // Back edge
        const backPosZ = (buildingWidth / 2);
        const backPosX = (x * bayLength + bayLength / 2) - (buildingLength / 2);
        
        edgeBeams.push(
          <mesh
            key={`edge-beam-back-${floor}-${x}`}
            position={[backPosX, posY, backPosZ]}
            material={edgeBeamMaterial}
          >
            <boxGeometry args={[bayLength, edgeBeamDepth, edgeBeamWidth]} />
          </mesh>
        );
      }
    } else {
      // If joists run widthwise, beams run lengthwise
      // Interior beams
      for (let z = 0; z < widthwiseBays + 1; z++) {
        for (let x = 0; x < lengthwiseBays; x++) {
          const posZ = (z * bayWidth) - (buildingWidth / 2);
          const posX = (x * bayLength + bayLength / 2) - (buildingLength / 2);
          
          beams.push(
            <mesh
              key={`beam-lengthwise-${floor}-${z}-${x}`}
              position={[posX, posY, posZ]}
              material={beamMaterial}
            >
              <boxGeometry args={[bayLength, beamDepth, beamWidth]} />
            </mesh>
          );
        }
      }

      // Edge beams along width
      for (let z = 0; z < widthwiseBays; z++) {
        // Left edge
        const leftPosX = -(buildingLength / 2);
        const leftPosZ = (z * bayWidth + bayWidth / 2) - (buildingWidth / 2);
        
        edgeBeams.push(
          <mesh
            key={`edge-beam-left-${floor}-${z}`}
            position={[leftPosX, posY, leftPosZ]}
            material={edgeBeamMaterial}
          >
            <boxGeometry args={[edgeBeamWidth, edgeBeamDepth, bayWidth]} />
          </mesh>
        );
        
        // Right edge
        const rightPosX = (buildingLength / 2);
        const rightPosZ = (z * bayWidth + bayWidth / 2) - (buildingWidth / 2);
        
        edgeBeams.push(
          <mesh
            key={`edge-beam-right-${floor}-${z}`}
            position={[rightPosX, posY, rightPosZ]}
            material={edgeBeamMaterial}
          >
            <boxGeometry args={[edgeBeamWidth, edgeBeamDepth, bayWidth]} />
          </mesh>
        );
      }
    }
  }

  // Create joists
  for (let floor = 0; floor < numFloors; floor++) {
    const posY = (floor + 1) * floorHeight - beamDepth - (joistDepth / 2);

    if (joistsRunLengthwise) {
      // Joists run along length
      for (let z = 0; z < widthwiseBays; z++) {
        for (let x = 0; x < lengthwiseBays; x++) {
          const numJoistsInBay = Math.ceil(bayWidth / joistSpacing) + 1;
          const actualSpacing = bayWidth / numJoistsInBay;
          
          for (let j = 0; j <= numJoistsInBay; j++) {
            const posX = (x * bayLength + bayLength / 2) - (buildingLength / 2);
            const posZ = (z * bayWidth + j * actualSpacing) - (buildingWidth / 2);
            
            joists.push(
              <mesh
                key={`joist-lengthwise-${floor}-${x}-${z}-${j}`}
                position={[posX, posY, posZ]}
                material={joistMaterial}
              >
                <boxGeometry args={[bayLength, joistDepth, joistWidth]} />
              </mesh>
            );
          }
        }
      }
    } else {
      // Joists run along width
      for (let x = 0; x < lengthwiseBays; x++) {
        for (let z = 0; z < widthwiseBays; z++) {
          const numJoistsInBay = Math.ceil(bayLength / joistSpacing) + 1;
          const actualSpacing = bayLength / numJoistsInBay;
          
          for (let j = 0; j <= numJoistsInBay; j++) {
            const posX = (x * bayLength + j * actualSpacing) - (buildingLength / 2);
            const posZ = (z * bayWidth + bayWidth / 2) - (buildingWidth / 2);
            
            joists.push(
              <mesh
                key={`joist-widthwise-${floor}-${x}-${z}-${j}`}
                position={[posX, posY, posZ]}
                material={joistMaterial}
              >
                <boxGeometry args={[joistWidth, joistDepth, bayWidth]} />
              </mesh>
            );
          }
        }
      }
    }
  }

  // Create floors (just simple planes for visualization)
  for (let floor = 1; floor <= numFloors; floor++) {
    const posY = floor * floorHeight;
    
    floors.push(
      <mesh
        key={`floor-${floor}`}
        position={[0, posY, 0]}
        rotation={[0, 0, 0]}
        material={floorMaterial}
      >
        <boxGeometry args={[buildingLength, 0.1, buildingWidth]} />
      </mesh>
    );
  }

  return (
    <group>
      {columns}
      {beams}
      {edgeBeams}
      {joists}
      {floors}
    </group>
  );
};

// Grid helper component
const GridHelper = ({ size, divisions }) => {
  return (
    <gridHelper 
      args={[size, divisions, COLORS.GRID, COLORS.GRID]} 
      position={[0, 0, 0]} 
    />
  );
};

export default function BuildingVisualization() {
  const [buildingData, setBuildingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data from localStorage
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get data from localStorage
        const data = getBuildingData();
        
        if (data) {
          console.log('Loaded building data from localStorage:', data);
          setBuildingData(data);
        } else {
          console.log('No data in localStorage, using mock data');
          // Use mock data as fallback
          setBuildingData(mockData);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading building data:', err);
        setError('Failed to load building data. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading visualization...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            <p>{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="apple-button apple-button-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!buildingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-600">No building data available. Please configure your building first.</p>
          <a href="/" className="apple-button apple-button-primary mt-4 inline-block">
            Go to Calculator
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Canvas shadows>
        <color attach="background" args={['#f8f9fa']} />
        
        <PerspectiveCamera 
          makeDefault 
          position={[buildingData.buildingLength * 1.5, buildingData.buildingLength, buildingData.buildingWidth * 1.5]} 
          fov={50}
        />
        
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow 
          shadow-mapSize-width={2048} 
          shadow-mapSize-height={2048}
        />
        
        <Environment preset="city" />
        
        <GridHelper size={Math.max(buildingData.buildingLength, buildingData.buildingWidth) * 2} divisions={20} />
        
        <Building data={buildingData} />
        
        <OrbitControls 
          enableDamping={true}
          dampingFactor={0.25}
          rotateSpeed={0.5}
          screenSpacePanning={true}
          minDistance={5}
          maxDistance={100}
        />
      </Canvas>
      
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow text-sm">
        <p className="font-semibold mb-1">Building Info</p>
        <p>Length: {buildingData.buildingLength}m × Width: {buildingData.buildingWidth}m</p>
        <p>Floors: {buildingData.numFloors} (Height: {buildingData.floorHeight}m each)</p>
        <p>Bays: {buildingData.lengthwiseBays} × {buildingData.widthwiseBays}</p>
        <p>Fire Rating: {buildingData.fireRating}</p>
      </div>
      
      <div className="absolute top-4 right-4 bg-white bg-opacity-80 p-3 rounded-lg shadow text-sm">
        <p className="font-semibold mb-1">Controls</p>
        <p>Left-click + drag: Rotate</p>
        <p>Middle-click + drag: Pan</p>
        <p>Scroll: Zoom</p>
        <p>Right-click + drag: Rotate</p>
      </div>
    </div>
  );
} 