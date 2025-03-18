'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, useTexture, useGLTF } from '@react-three/drei';
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
  COLUMN: new THREE.Color('#8B4513').multiplyScalar(1.2),  // Intensified SaddleBrown
  BEAM: new THREE.Color('#A0522D').multiplyScalar(1.2),    // Intensified Sienna
  EDGE_BEAM: new THREE.Color('#CD853F').multiplyScalar(1.2), // Intensified Peru
  JOIST: new THREE.Color('#DEB887').multiplyScalar(1.2),   // Intensified BurlyWood
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

// Tree Model Component
const TreeModel = ({ position, scale = 1, rotation = [0, 0, 0] }) => {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [treeModel, setTreeModel] = useState(null);
  const [modelScale, setModelScale] = useState(scale);
  
  // Create a simple fallback tree if the model fails to load
  const createFallbackTree = useCallback(() => {
    // Create a more detailed tree with better proportions for small scale
    const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.6, 8, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
      color: '#8B4513', 
      roughness: 0.9 
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 4;
    
    // Create multiple foliage cones for a more realistic look
    const foliageGroup = new THREE.Group();
    
    // Bottom foliage (widest)
    const foliageBottom = new THREE.Mesh(
      new THREE.ConeGeometry(4, 5, 8),
      new THREE.MeshStandardMaterial({ color: '#228B22', roughness: 0.8 })
    );
    foliageBottom.position.y = 3;
    
    // Middle foliage
    const foliageMiddle = new THREE.Mesh(
      new THREE.ConeGeometry(3, 4, 8),
      new THREE.MeshStandardMaterial({ color: '#228B22', roughness: 0.8 })
    );
    foliageMiddle.position.y = 6;
    
    // Top foliage (smallest)
    const foliageTop = new THREE.Mesh(
      new THREE.ConeGeometry(2, 3.5, 8),
      new THREE.MeshStandardMaterial({ color: '#1a661a', roughness: 0.8 })
    );
    foliageTop.position.y = 9;
    
    foliageGroup.add(foliageBottom);
    foliageGroup.add(foliageMiddle);
    foliageGroup.add(foliageTop);
    
    const tree = new THREE.Group();
    tree.add(trunk);
    tree.add(foliageGroup);
    
    return tree;
  }, []);
  
  // Load the tree model from public directory
  const { scene: loadedModel, error } = useGLTF('/models/tree.glb', false);
  
  // Set up model or fallback
  useEffect(() => {
    if (error) {
      console.warn('Error loading tree model:', error);
      setModelError(true);
      setTreeModel(createFallbackTree());
      return;
    }
    
    if (loadedModel) {
      console.log('Tree model loaded successfully', loadedModel);
      
      // Calculate model size to determine appropriate scale
      const box = new THREE.Box3().setFromObject(loadedModel);
      const size = box.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);
      
      console.log('Tree model dimensions:', size);
      
      // Automatically adjust scale based on model size
      // Reducing from 8m to 4m (50% smaller)
      const targetHeight = 4; // meters (reduced from 8m back to 4m)
      let calculatedScale = targetHeight / maxDimension;
      
      // Apply the scaling to the incoming scale parameter
      setModelScale(scale * calculatedScale);
      
      console.log('Calculated tree scale:', calculatedScale, 'Final scale:', scale * calculatedScale);
      
      // Center the model at its base
      const center = box.getCenter(new THREE.Vector3());
      loadedModel.position.x = -center.x;
      loadedModel.position.z = -center.z;
      
      // Position the bottom of the model at y=0
      loadedModel.position.y = -box.min.y;
      
      // Apply shadows to all meshes in the model
      loadedModel.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          
          // Ensure materials are properly configured
          if (node.material) {
            node.material.roughness = 0.8;
            node.material.metalness = 0.2;
          }
        }
      });
      
      // Check if model has any children
      if (loadedModel.children && loadedModel.children.length === 0) {
        console.warn('Tree model has no children, using fallback tree');
        setTreeModel(createFallbackTree());
      } else {
        setModelLoaded(true);
        setTreeModel(loadedModel);
      }
    } else {
      console.warn('Tree model not loaded, using fallback tree');
      setTreeModel(createFallbackTree());
    }
  }, [loadedModel, error, createFallbackTree, scale]);
  
  // Clone the tree to avoid sharing materials/geometries
  const clonedTree = useMemo(() => {
    return treeModel ? treeModel.clone() : null;
  }, [treeModel]);
  
  if (!clonedTree) {
    return null;
  }
  
  return (
    <primitive 
      object={clonedTree} 
      position={position}
      scale={[modelScale, modelScale, modelScale]} 
      rotation={rotation}
      castShadow
      receiveShadow
    />
  );
};

// Trees layout around the building
const TreesArrangement = ({ buildingLength, buildingWidth }) => {
  // Calculate positions for trees based on building dimensions
  const buildingDiagonal = Math.sqrt(buildingLength * buildingLength + buildingWidth * buildingWidth);
  const radius = buildingDiagonal * 1.2; // Slightly inside the grass circle
  
  // Generate positions in a circle around the building
  const treePositions = [];
  const treeCount = 12; // Number of trees to place
  
  console.log('Building dimensions for trees:', { buildingLength, buildingWidth, diagonal: buildingDiagonal, radius });
  
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    
    // Add some randomness to positions and scales
    const jitter = 0.8 + Math.random() * 0.4; // Random factor between 0.8 and 1.2
    
    // Base scale - reduced by 50% from previous value
    const scale = (1 + Math.random() * 0.5); // Removed the *2 multiplier to make trees 50% smaller
    
    const rotationY = Math.random() * Math.PI * 2; // Random rotation around Y axis
    
    const treePosition = {
      position: [x * jitter, 0, z * jitter],
      scale: scale,
      rotation: [0, rotationY, 0]
    };
    
    treePositions.push(treePosition);
  }
  
  return (
    <group>
      {treePositions.map((props, index) => (
        <TreeModel key={`tree-${index}`} {...props} />
      ))}
    </group>
  );
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
  // Try to load custom timber texture from public directory
  const [timberTexture, setTimberTexture] = useState(null);
  const [textureError, setTextureError] = useState(false);
  
  // Generate procedural texture only when needed
  const generateWoodTexture = useCallback(() => {
    console.log('Generating procedural wood texture as fallback');
    const generatedTexture = createWoodTexture();
    setTimberTexture(generatedTexture);
  }, []);

  // Load custom texture or use fallback
  useEffect(() => {
    if (renderMode === 'architectural') {
      // Only load the texture in architectural mode
      try {
        const loader = new THREE.TextureLoader();
        
        // Try multiple possible locations for the texture
        const texturePaths = [
          '/textures/custom-timber.jpg',
          '/custom-timber.jpg',
          '/images/custom-timber.jpg',
          '/models/custom-timber.jpg'
        ];
        
        console.log('Attempting to load timber texture from multiple possible locations');
        
        // OnLoad callback for texture
        const onTextureLoad = (texture, path) => {
          console.log(`Successfully loaded timber texture from: ${path}`);
          
          // Enhanced texture settings
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          
          // Increase repetition to make grain more visible
          texture.repeat.set(3, 3); // Repeat more times to show more grain detail
          
          // Enhance contrast and color
          texture.colorSpace = THREE.SRGBColorSpace; // Ensure correct color space
          
          setTimberTexture(texture);
          setTextureError(false);
        };
        
        // Function to try loading from the next path in the array
        const tryLoadTexture = (index) => {
          if (index >= texturePaths.length) {
            console.warn('Failed to load timber texture from all possible paths');
            setTextureError(true);
            generateWoodTexture();
            return;
          }
          
          console.log(`Attempting to load texture from: ${texturePaths[index]}`);
          
          loader.load(
            texturePaths[index],
            // OnLoad callback
            (texture) => onTextureLoad(texture, texturePaths[index]),
            // OnProgress callback (not used)
            undefined,
            // OnError callback
            (err) => {
              console.warn(`Could not load timber texture from: ${texturePaths[index]}`, err);
              // Try the next path
              tryLoadTexture(index + 1);
            }
          );
        };
        
        // Start trying from the first path
        tryLoadTexture(0);
        
      } catch (err) {
        console.warn('Error setting up texture loader:', err);
        setTextureError(true);
        generateWoodTexture();
      }
    } else if (!timberTexture) {
      // Generate texture for engineering mode as well
      generateWoodTexture();
    }
  }, [renderMode, generateWoodTexture]);
  
  // Create materials with texture
  const columnTextureMaterial = useMemo(() => {
    if (!timberTexture) return null;
    
    return new THREE.MeshStandardMaterial({ 
      map: timberTexture,
      roughness: 0.9,  // Keep the roughness for natural wood look
      metalness: 0.0   // Keep metalness at zero for wood
    });
  }, [timberTexture]);
  
  const beamTextureMaterial = useMemo(() => {
    if (!timberTexture) return null;
    
    return new THREE.MeshStandardMaterial({ 
      map: timberTexture,
      roughness: 0.85, 
      metalness: 0.0
    });
  }, [timberTexture]);
  
  const edgeBeamTextureMaterial = useMemo(() => {
    if (!timberTexture) return null;
    
    return new THREE.MeshStandardMaterial({ 
      map: timberTexture,
      roughness: 0.85, 
      metalness: 0.0
    });
  }, [timberTexture]);
  
  const joistTextureMaterial = useMemo(() => {
    if (!timberTexture) return null;
    
    return new THREE.MeshStandardMaterial({ 
      map: timberTexture,
      roughness: 0.8, 
      metalness: 0.0
    });
  }, [timberTexture]);
  
  // Select materials based on render mode
  const activeMaterials = {
    column: renderMode === 'architectural' && columnTextureMaterial ? columnTextureMaterial : columnMaterial,
    beam: renderMode === 'architectural' && beamTextureMaterial ? beamTextureMaterial : beamMaterial,
    edgeBeam: renderMode === 'architectural' && edgeBeamTextureMaterial ? edgeBeamTextureMaterial : edgeBeamMaterial,
    joist: renderMode === 'architectural' && joistTextureMaterial ? joistTextureMaterial : joistMaterial
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
  const [showDebugTree, setShowDebugTree] = useState(false); // Debug mode for tree scaling

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
        <color attach="background" args={['#FFFFFF']} /> {/* White background */}
        
        <PerspectiveCamera 
          makeDefault 
          position={[buildingData.buildingLength * 1.5, buildingData.buildingLength, buildingData.buildingWidth * 1.5]} 
          fov={50}
        />
        
        {/* Standard lighting */}
        <ambientLight intensity={renderMode === 'architectural' ? 0.5 : 0.6} />
        
        {/* Main directional light */}
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={renderMode === 'architectural' ? 1.0 : 1.2} 
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
              intensity={0.4} 
              castShadow={false}
            />
            <directionalLight 
              position={[0, 5, -10]} 
              intensity={0.3} 
              castShadow={false}
            />
          </>
        )}
        
        <Environment preset="city" /> {/* Always use city preset */}
        
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
        
        {/* Trees only in architectural mode */}
        {renderMode === 'architectural' && (
          <>
            <TreesArrangement 
              buildingLength={buildingData.buildingLength} 
              buildingWidth={buildingData.buildingWidth} 
            />
            
            {/* Debug tree for scale reference */}
            {showDebugTree && (
              <mesh 
                position={[0, 1, 0]} 
                castShadow 
                receiveShadow
              >
                <boxGeometry args={[1, 2, 1]} />
                <meshStandardMaterial color="red" />
              </mesh>
            )}
          </>
        )}
        
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
        
        {/* Debug controls */}
        <p className="font-semibold mb-2 mt-4">Debug</p>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={showDebugTree}
            onChange={() => setShowDebugTree(!showDebugTree)}
            className="mr-2"
          />
          <span>Show Scale Reference</span>
        </label>
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