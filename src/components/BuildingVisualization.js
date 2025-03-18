'use client';

import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, useTexture } from '@react-three/drei';
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
  GRID: new THREE.Color('#333333'),
  GRASS: new THREE.Color('#526D29')  // Darker green for grass, matching the image
};

// Create a simple wood texture directly in code
const createWoodTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Fill with base wood color
  ctx.fillStyle = '#8B4513'; // SaddleBrown
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add wood grain
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * canvas.width;
    const y = 0;
    const width = 2 + Math.random() * 3;
    const height = canvas.height;
    
    // Vary the grain color slightly
    const colorVariation = Math.random() * 0.1 - 0.05;
    const r = Math.floor(139 + colorVariation * 30); // Base R from SaddleBrown
    const g = Math.floor(69 + colorVariation * 30);  // Base G from SaddleBrown
    const b = Math.floor(19 + colorVariation * 30);  // Base B from SaddleBrown
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.globalAlpha = 0.2 + Math.random() * 0.4;
    ctx.fillRect(x, y, width, height);
  }
  
  // Add some knots
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 5 + Math.random() * 15;
    
    const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grd.addColorStop(0, '#52300A');
    grd.addColorStop(1, '#8B4513');
    
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Create a texture from the canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

// Create a simple grass texture directly in code
const createGrassTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Base color
  ctx.fillStyle = '#526D29'; // Dark grass green
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add grass texture
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const width = 1 + Math.random() * 2;
    const height = 3 + Math.random() * 7;
    
    // Vary the grass color slightly
    const r = Math.floor(82 + (Math.random() * 20 - 10));  // Base R from grass color
    const g = Math.floor(109 + (Math.random() * 20 - 10)); // Base G from grass color
    const b = Math.floor(41 + (Math.random() * 10 - 5));   // Base B from grass color
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.globalAlpha = 0.7 + Math.random() * 0.3;
    
    // Draw grass blade
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((Math.random() - 0.5) * Math.PI / 6);
    ctx.fillRect(-width/2, -height/2, width, height);
    ctx.restore();
  }
  
  // Create a texture from the canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

// Texture Loading Component for Grass
const GrassTexturedPlane = ({ buildingLength, buildingWidth }) => {
  // Create texture programmatically instead of loading from file
  const texture = createGrassTexture();
  texture.repeat.set(10, 10); // Repeat the texture multiple times across the surface
  
  // Calculate the radius based on the building dimensions
  const buildingDiagonal = Math.sqrt(buildingLength * buildingLength + buildingWidth * buildingWidth);
  const radius = buildingDiagonal * 1.5;
  
  // Create a circular disc
  const circleGeometry = new THREE.CircleGeometry(radius, 64);
  circleGeometry.rotateX(-Math.PI / 2);
  
  // Create material with the texture, but apply a color filter to darken it
  const material = new THREE.MeshStandardMaterial({ 
    map: texture,
    roughness: 0.9,
    metalness: 0.0,
    color: new THREE.Color('#526D29') // Apply a darker green tint to match the image
  });
  
  return (
    <mesh geometry={circleGeometry} material={material} position={[0, -0.05, 0]} receiveShadow />
  );
};

// Material for grass (non-textured fallback)
const grassMaterial = new THREE.MeshStandardMaterial({ 
  color: COLORS.GRASS, 
  roughness: 0.9, 
  metalness: 0.0,
  wireframe: false
});

// Engineering materials (colored)
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

// Edge material for highlighting structural elements
const edgeMaterial = new THREE.LineBasicMaterial({ 
  color: '#111111', // Darker edge color, almost black
  linewidth: 1.5    // Slightly thicker lines
});

// Architectural materials (with wood texture)
const createTimberMaterial = () => {
  // The texture will be loaded by useTexture in the component
  return new THREE.MeshStandardMaterial({ 
    roughness: 0.8, 
    metalness: 0.1,
    wireframe: false
  });
};

// Material for floor
const floorMaterial = new THREE.MeshStandardMaterial({ 
  color: COLORS.FLOOR, 
  roughness: 0.9, 
  metalness: 0.0,
  transparent: true,
  opacity: 0.3,
  wireframe: false
});

// Texture Loading Component for Building
const TexturedBuilding = ({ data, renderMode }) => {
  // Create texture programmatically instead of loading from file
  const timberTexture = createWoodTexture();
  
  // Configure texture
  timberTexture.wrapS = timberTexture.wrapT = THREE.RepeatWrapping;
  
  // Create materials with texture - configure different repeat patterns for different elements
  const columnTextureMaterial = new THREE.MeshStandardMaterial({ 
    map: timberTexture,
    roughness: 0.7, 
    metalness: 0.05
  });
  
  const beamTextureMaterial = new THREE.MeshStandardMaterial({ 
    map: timberTexture,
    roughness: 0.8, 
    metalness: 0.1
  });
  
  const edgeBeamTextureMaterial = new THREE.MeshStandardMaterial({ 
    map: timberTexture,
    roughness: 0.8, 
    metalness: 0.1
  });
  
  const joistTextureMaterial = new THREE.MeshStandardMaterial({ 
    map: timberTexture,
    roughness: 0.8, 
    metalness: 0.1
  });
  
  // Select materials based on render mode
  const activeMaterials = {
    column: renderMode === 'architectural' ? columnTextureMaterial : columnMaterial,
    beam: renderMode === 'architectural' ? beamTextureMaterial : beamMaterial,
    edgeBeam: renderMode === 'architectural' ? edgeBeamTextureMaterial : edgeBeamMaterial,
    joist: renderMode === 'architectural' ? joistTextureMaterial : joistMaterial
  };
  
  // Function to create a mesh with edge highlighting
  const createMeshWithEdges = (geometry, material, position, key, castShadow = true) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    
    // Only enable shadows in architectural mode for better performance
    mesh.castShadow = renderMode === 'architectural' && castShadow;
    mesh.receiveShadow = renderMode === 'architectural';
    
    // Create edges (only for engineering mode)
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, edgeMaterial);
    line.visible = renderMode === 'engineering'; // Only show edges in engineering mode
    
    // Group the mesh and its edges
    const group = new THREE.Group();
    group.add(mesh);
    group.add(line);
    
    return (
      <primitive key={key} object={group} />
    );
  };
  
  // Use the data from props
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
    joistsRunLengthwise,
    getBeamPosition
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

        const geometry = new THREE.BoxGeometry(columnWidth, floorHeight, columnDepth);
        columns.push(
          createMeshWithEdges(geometry, activeMaterials.column, [posX, posY, posZ], `column-${floor}-${x}-${y}`)
        );
      }
    }
  }

  // Create beams - UPDATED POSITIONING
  for (let floor = 0; floor < numFloors; floor++) {
    // Position beams based on the joist position setting
    const posY = getBeamPosition ? 
      getBeamPosition(floor, floorHeight, joistDepth, beamDepth) : 
      (floor + 1) * floorHeight - joistDepth - (beamDepth / 2); // Default to on top if function not provided

    if (joistsRunLengthwise) {
      // If joists run lengthwise, beams run widthwise
      // Interior beams
      for (let x = 0; x < lengthwiseBays + 1; x++) {
        for (let z = 0; z < widthwiseBays; z++) {
          const posX = (x * bayLength) - (buildingLength / 2);
          const posZ = (z * bayWidth + bayWidth / 2) - (buildingWidth / 2);
          
          const geometry = new THREE.BoxGeometry(beamWidth, beamDepth, bayWidth);
          beams.push(
            createMeshWithEdges(geometry, activeMaterials.beam, [posX, posY, posZ], `beam-widthwise-${floor}-${x}-${z}`)
          );
        }
      }

      // Edge beams along length
      for (let x = 0; x < lengthwiseBays; x++) {
        // Front edge
        const frontPosZ = -(buildingWidth / 2);
        const frontPosX = (x * bayLength + bayLength / 2) - (buildingLength / 2);
        
        const frontGeometry = new THREE.BoxGeometry(bayLength, edgeBeamDepth, edgeBeamWidth);
        edgeBeams.push(
          createMeshWithEdges(frontGeometry, activeMaterials.edgeBeam, [frontPosX, posY, frontPosZ], `edge-beam-front-${floor}-${x}`)
        );
        
        // Back edge
        const backPosZ = (buildingWidth / 2);
        const backPosX = (x * bayLength + bayLength / 2) - (buildingLength / 2);
        
        const backGeometry = new THREE.BoxGeometry(bayLength, edgeBeamDepth, edgeBeamWidth);
        edgeBeams.push(
          createMeshWithEdges(backGeometry, activeMaterials.edgeBeam, [backPosX, posY, backPosZ], `edge-beam-back-${floor}-${x}`)
        );
      }
    } else {
      // If joists run widthwise, beams run lengthwise
      // Interior beams
      for (let z = 0; z < widthwiseBays + 1; z++) {
        for (let x = 0; x < lengthwiseBays; x++) {
          const posZ = (z * bayWidth) - (buildingWidth / 2);
          const posX = (x * bayLength + bayLength / 2) - (buildingLength / 2);
          
          const geometry = new THREE.BoxGeometry(bayLength, beamDepth, beamWidth);
          beams.push(
            createMeshWithEdges(geometry, activeMaterials.beam, [posX, posY, posZ], `beam-lengthwise-${floor}-${z}-${x}`)
          );
        }
      }

      // Edge beams along width
      for (let z = 0; z < widthwiseBays; z++) {
        // Left edge
        const leftPosX = -(buildingLength / 2);
        const leftPosZ = (z * bayWidth + bayWidth / 2) - (buildingWidth / 2);
        
        const leftGeometry = new THREE.BoxGeometry(edgeBeamWidth, edgeBeamDepth, bayWidth);
        edgeBeams.push(
          createMeshWithEdges(leftGeometry, activeMaterials.edgeBeam, [leftPosX, posY, leftPosZ], `edge-beam-left-${floor}-${z}`)
        );
        
        // Right edge
        const rightPosX = (buildingLength / 2);
        const rightPosZ = (z * bayWidth + bayWidth / 2) - (buildingWidth / 2);
        
        const rightGeometry = new THREE.BoxGeometry(edgeBeamWidth, edgeBeamDepth, bayWidth);
        edgeBeams.push(
          createMeshWithEdges(rightGeometry, activeMaterials.edgeBeam, [rightPosX, posY, rightPosZ], `edge-beam-right-${floor}-${z}`)
        );
      }
    }
  }

  // Create joists - UPDATED POSITIONING
  for (let floor = 0; floor < numFloors; floor++) {
    // Position joists at the top of the floor, with half their depth penetrating the floor level
    const posY = (floor + 1) * floorHeight - (joistDepth / 2);

    if (joistsRunLengthwise) {
      // Joists run along length
      for (let z = 0; z < widthwiseBays; z++) {
        for (let x = 0; x < lengthwiseBays; x++) {
          const numJoistsInBay = Math.ceil(bayWidth / joistSpacing) + 1;
          const actualSpacing = bayWidth / numJoistsInBay;
          
          for (let j = 0; j <= numJoistsInBay; j++) {
            const posX = (x * bayLength + bayLength / 2) - (buildingLength / 2);
            const posZ = (z * bayWidth + j * actualSpacing) - (buildingWidth / 2);
            
            const geometry = new THREE.BoxGeometry(bayLength, joistDepth, joistWidth);
            joists.push(
              createMeshWithEdges(geometry, activeMaterials.joist, [posX, posY, posZ], `joist-lengthwise-${floor}-${x}-${z}-${j}`)
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
            
            const geometry = new THREE.BoxGeometry(joistWidth, joistDepth, bayWidth);
            joists.push(
              createMeshWithEdges(geometry, activeMaterials.joist, [posX, posY, posZ], `joist-widthwise-${floor}-${x}-${z}-${j}`)
            );
          }
        }
      }
    }
  }

  // Create floors (just simple planes for visualization)
  for (let floor = 1; floor <= numFloors; floor++) {
    const posY = floor * floorHeight + 0.05; // Slight offset to avoid z-fighting with joists
    
    const geometry = new THREE.BoxGeometry(buildingLength, 0.1, buildingWidth);
    const floorMesh = new THREE.Mesh(geometry, floorMaterial);
    floorMesh.position.set(0, posY, 0);
    
    floors.push(
      <primitive key={`floor-${floor}`} object={floorMesh} />
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

// Create a circular grass plane without texture
const GrassPlane = ({ buildingLength, buildingWidth }) => {
  // Calculate the radius based on the building dimensions
  // Make the grass circle at least 1.5x the building's diagonal
  const buildingDiagonal = Math.sqrt(buildingLength * buildingLength + buildingWidth * buildingWidth);
  const radius = buildingDiagonal * 1.5;
  
  // Create a circular disc with high segment count for smooth edges
  const circleGeometry = new THREE.CircleGeometry(radius, 64);
  
  // Rotate it to be flat on the ground (XZ plane)
  circleGeometry.rotateX(-Math.PI / 2);
  
  return (
    <mesh geometry={circleGeometry} material={grassMaterial} position={[0, -0.05, 0]} receiveShadow />
  );
};

export default function BuildingVisualization() {
  const [buildingData, setBuildingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joistPosition, setJoistPosition] = useState('ontop'); // 'ontop', 'halfnotch', or 'inline'
  const [renderMode, setRenderMode] = useState('engineering'); // 'engineering' or 'architectural'

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

  // Function to calculate beam position based on joist position option
  const getBeamPosition = (floor, floorHeight, joistDepth, beamDepth) => {
    switch (joistPosition) {
      case 'ontop':
        // Joist sits on top of beam
        return (floor + 1) * floorHeight - joistDepth - (beamDepth / 2);
      case 'halfnotch':
        // Joist is halfway embedded in beam
        return (floor + 1) * floorHeight - joistDepth / 2 - (beamDepth / 2);
      case 'inline':
        // Joist and beam tops are flush
        return (floor + 1) * floorHeight - (beamDepth / 2);
      default:
        return (floor + 1) * floorHeight - joistDepth - (beamDepth / 2);
    }
  };

  // Calculate the center of the building for camera targeting
  const calculateModelCenter = (data) => {
    if (!data) return [0, 0, 0];
    
    // Calculate vertical center based on number of floors
    const yCenter = (data.numFloors * data.floorHeight) / 2;
    
    // Return center coordinates [x, y, z]
    return [0, yCenter, 0];
  };

  // Update the Building component to use the new getBeamPosition function
  const BuildingWithJoistPosition = (props) => {
    const updatedData = {
      ...props.data,
      getBeamPosition: getBeamPosition
    };
    
    return <TexturedBuilding data={updatedData} renderMode={renderMode} />;
  };

  return (
    <div className="relative h-full w-full">
      <Canvas shadows>
        <color attach="background" args={['#FFFFFF']} /> {/* White background color */}
        
        <PerspectiveCamera 
          makeDefault 
          position={[buildingData.buildingLength * 1.5, buildingData.buildingLength, buildingData.buildingWidth * 1.5]} 
          fov={50}
        />
        
        {/* Optimize lighting based on render mode */}
        <ambientLight intensity={renderMode === 'architectural' ? 0.4 : 0.5} />
        
        {/* Main directional light with improved shadows for architectural view */}
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={renderMode === 'architectural' ? 0.8 : 1} 
          castShadow={renderMode === 'architectural'}
          shadow-mapSize-width={2048} 
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        
        {/* Add fill light for architectural mode to soften shadows */}
        {renderMode === 'architectural' && (
          <>
            <directionalLight 
              position={[-10, 8, -5]} 
              intensity={0.3} 
              castShadow={false}
            />
            <directionalLight 
              position={[0, 5, -10]} 
              intensity={0.2} 
              castShadow={false}
            />
          </>
        )}
        
        <Environment preset="city" />
        
        {/* Use textured or plain grass based on render mode */}
        {renderMode === 'architectural' ? (
          <GrassTexturedPlane 
            buildingLength={buildingData.buildingLength} 
            buildingWidth={buildingData.buildingWidth} 
          />
        ) : (
          <GrassPlane 
            buildingLength={buildingData.buildingLength} 
            buildingWidth={buildingData.buildingWidth} 
          />
        )}
        
        <BuildingWithJoistPosition data={buildingData} />
        
        <OrbitControls 
          enableDamping={true}
          dampingFactor={0.25}
          rotateSpeed={0.5}
          screenSpacePanning={true}
          minDistance={5}
          maxDistance={100}
          target={calculateModelCenter(buildingData)}
        />
      </Canvas>
      
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow text-sm">
        <p className="font-semibold mb-1">Building Info</p>
        <p>Length: {buildingData.buildingLength}m × Width: {buildingData.buildingWidth}m</p>
        <p>Floors: {buildingData.numFloors} (Height: {buildingData.floorHeight}m each)</p>
        <p>Bays: {buildingData.lengthwiseBays} × {buildingData.widthwiseBays}</p>
        <p>Fire Rating: {buildingData.fireRating}</p>
      </div>
      
      {/* Joist Position Controls */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-80 p-3 rounded-lg shadow text-sm">
        <p className="font-semibold mb-2">Joist Position</p>
        <div className="flex flex-col space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="joistPosition"
              value="ontop"
              checked={joistPosition === 'ontop'}
              onChange={() => setJoistPosition('ontop')}
              className="mr-2"
            />
            <span>On Top</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="joistPosition"
              value="halfnotch"
              checked={joistPosition === 'halfnotch'}
              onChange={() => setJoistPosition('halfnotch')}
              className="mr-2"
            />
            <span>Half Notched</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="joistPosition"
              value="inline"
              checked={joistPosition === 'inline'}
              onChange={() => setJoistPosition('inline')}
              className="mr-2"
            />
            <span>Inline</span>
          </label>
        </div>
        
        {/* Render Mode Controls */}
        <p className="font-semibold mb-2 mt-4">View Style</p>
        <div className="flex flex-col space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="renderMode"
              value="engineering"
              checked={renderMode === 'engineering'}
              onChange={() => setRenderMode('engineering')}
              className="mr-2"
            />
            <span>Engineering</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="renderMode"
              value="architectural"
              checked={renderMode === 'architectural'}
              onChange={() => setRenderMode('architectural')}
              className="mr-2"
            />
            <span>Architectural</span>
          </label>
        </div>
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