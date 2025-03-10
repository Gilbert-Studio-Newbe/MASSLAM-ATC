import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useTexture } from '@react-three/drei';

// Component for a single timber element (joist, beam, or column)
function TimberElement({ width, depth, length, position, rotation, type }) {
  const meshRef = useRef();
  
  // Different colors for different element types
  const getColor = () => {
    switch(type) {
      case 'joist': return '#D4B483'; // Light wood color
      case 'beam': return '#C1A878';  // Medium wood color
      case 'column': return '#A69372'; // Dark wood color
      default: return '#D4B483';
    }
  };
  
  // Use a simple material without texture to avoid errors
  return (
    <mesh 
      ref={meshRef}
      position={position}
      rotation={rotation}
    >
      <boxGeometry args={[width / 1000, depth / 1000, length]} />
      <meshStandardMaterial 
        color={getColor()} 
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}

// Main 3D visualizer component
export default function TimberVisualizer3D({ results }) {
  const [cameraPosition, setCameraPosition] = useState([5, 5, 5]);
  
  // Extract dimensions from results
  const joistWidth = results?.joists?.width || 90;
  const joistDepth = results?.joists?.depth || 240;
  const joistSpan = results?.joistSpan || 4;
  
  const beamWidth = results?.beams?.width || 135;
  const beamDepth = results?.beams?.depth || 340;
  const beamSpan = results?.beamSpan || 5;
  
  const columnWidth = results?.columns?.width || 135;
  const columnDepth = results?.columns?.depth || 135;
  const columnHeight = results?.columns?.height || 3;
  
  // Calculate grid dimensions
  const lengthwiseBays = results?.lengthwiseBays || 3;
  const widthwiseBays = results?.widthwiseBays || 2;
  const joistsRunLengthwise = results?.joistsRunLengthwise !== undefined ? results.joistsRunLengthwise : true;
  
  // Calculate building dimensions
  const buildingLength = results?.buildingLength || lengthwiseBays * joistSpan;
  const buildingWidth = results?.buildingWidth || widthwiseBays * beamSpan;
  
  // Auto-adjust camera position based on building size
  useEffect(() => {
    const maxDimension = Math.max(buildingLength, buildingWidth, columnHeight);
    setCameraPosition([maxDimension * 1.5, maxDimension * 1.5, maxDimension * 1.5]);
  }, [buildingLength, buildingWidth, columnHeight]);
  
  // Scene component with all timber elements
  const TimberStructure = () => {
    // Create joists
    const joists = [];
    const joistSpacing = 0.8; // 800mm spacing
    
    if (joistsRunLengthwise) {
      // Joists run along the length of the building
      for (let bay = 0; bay < widthwiseBays; bay++) {
        const bayWidth = buildingWidth / widthwiseBays;
        const bayCenter = bay * bayWidth + bayWidth / 2 - buildingWidth / 2;
        
        // Calculate number of joists in this bay
        const joistsInBay = Math.max(2, Math.floor(bayWidth / joistSpacing));
        const actualSpacing = bayWidth / (joistsInBay - 1);
        
        for (let j = 0; j < joistsInBay; j++) {
          const joistPosition = [
            0, // Centered on x-axis
            joistDepth / 2000 + beamDepth / 1000, // Position on top of beams
            bayCenter - bayWidth / 2 + j * actualSpacing // Z position
          ];
          
          joists.push(
            <TimberElement
              key={`joist-${bay}-${j}`}
              width={joistWidth}
              depth={joistDepth}
              length={buildingLength}
              position={joistPosition}
              rotation={[0, 0, 0]}
              type="joist"
            />
          );
        }
      }
    } else {
      // Joists run along the width of the building
      for (let bay = 0; bay < lengthwiseBays; bay++) {
        const bayLength = buildingLength / lengthwiseBays;
        const bayCenter = bay * bayLength + bayLength / 2 - buildingLength / 2;
        
        // Calculate number of joists in this bay
        const joistsInBay = Math.max(2, Math.floor(bayLength / joistSpacing));
        const actualSpacing = bayLength / (joistsInBay - 1);
        
        for (let j = 0; j < joistsInBay; j++) {
          const joistPosition = [
            bayCenter - bayLength / 2 + j * actualSpacing, // X position
            joistDepth / 2000 + beamDepth / 1000, // Position on top of beams
            0 // Centered on z-axis
          ];
          
          joists.push(
            <TimberElement
              key={`joist-${bay}-${j}`}
              width={joistWidth}
              depth={joistDepth}
              length={buildingWidth}
              position={joistPosition}
              rotation={[0, Math.PI / 2, 0]} // Rotated 90 degrees
              type="joist"
            />
          );
        }
      }
    }
    
    // Create beams
    const beams = [];
    
    if (joistsRunLengthwise) {
      // Beams run perpendicular to joists (along width)
      for (let bay = 0; bay < lengthwiseBays + 1; bay++) {
        const beamPosition = [
          bay * (buildingLength / lengthwiseBays) - buildingLength / 2, // X position
          beamDepth / 2000, // Y position (half height)
          0 // Centered on z-axis
        ];
        
        beams.push(
          <TimberElement
            key={`beam-${bay}`}
            width={beamWidth}
            depth={beamDepth}
            length={buildingWidth}
            position={beamPosition}
            rotation={[0, Math.PI / 2, 0]} // Rotated 90 degrees
            type="beam"
          />
        );
      }
    } else {
      // Beams run perpendicular to joists (along length)
      for (let bay = 0; bay < widthwiseBays + 1; bay++) {
        const beamPosition = [
          0, // Centered on x-axis
          beamDepth / 2000, // Y position (half height)
          bay * (buildingWidth / widthwiseBays) - buildingWidth / 2 // Z position
        ];
        
        beams.push(
          <TimberElement
            key={`beam-${bay}`}
            width={beamWidth}
            depth={beamDepth}
            length={buildingLength}
            position={beamPosition}
            rotation={[0, 0, 0]}
            type="beam"
          />
        );
      }
    }
    
    // Create columns
    const columns = [];
    
    for (let x = 0; x <= lengthwiseBays; x++) {
      for (let z = 0; z <= widthwiseBays; z++) {
        const columnPosition = [
          x * (buildingLength / lengthwiseBays) - buildingLength / 2, // X position
          -columnHeight / 2, // Y position (half height below ground)
          z * (buildingWidth / widthwiseBays) - buildingWidth / 2 // Z position
        ];
        
        columns.push(
          <TimberElement
            key={`column-${x}-${z}`}
            width={columnWidth}
            depth={columnDepth}
            length={columnHeight}
            position={columnPosition}
            rotation={[0, 0, 0]}
            type="column"
          />
        );
      }
    }
    
    // Create a simple ground plane
    const Ground = () => (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[buildingLength * 2, buildingWidth * 2]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
    );
    
    return (
      <>
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <directionalLight position={[-10, 10, -5]} intensity={0.5} />
        
        {/* Structure elements */}
        {columns}
        {beams}
        {joists}
        <Ground />
      </>
    );
  };
  
  // Loading fallback
  const LoadingFallback = () => (
    <div className="flex justify-center items-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Loading 3D Visualization...</p>
      </div>
    </div>
  );
  
  return (
    <div className="apple-visualization mb-3">
      <h3 className="apple-visualization-title">3D Structure Visualization</h3>
      <div style={{ height: '400px', width: '100%', position: 'relative' }}>
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={cameraPosition} fov={45} />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
          <Suspense fallback={null}>
            <TimberStructure />
          </Suspense>
        </Canvas>
      </div>
      <div className="mt-2 text-center text-sm text-gray-500">
        Drag to rotate | Scroll to zoom | Shift+drag to pan
      </div>
    </div>
  );
} 