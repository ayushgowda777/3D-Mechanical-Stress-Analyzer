/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AnalyzerParams, AnalysisResults, Material } from '../types/analyzer';
import {
  calculateCrossSection,
  getDeflectionAt,
  getLocalStressAt,
  getHeatMapColor
} from '../utils/physics';
import {
  Camera,
  Maximize2,
  RefreshCw,
  Eye,
  Sliders,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

interface ThreeStressViewerProps {
  params: AnalyzerParams;
  results: AnalysisResults;
  material: Material;
  onUpdateParams?: (updates: Partial<AnalyzerParams>) => void;
}

export const ThreeStressViewer: React.FC<ThreeStressViewerProps> = ({
  params,
  results,
  material,
  onUpdateParams
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Group that holds the dynamic model meshes
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const markerGroupRef = useRef<THREE.Group | null>(null);

  // Visual toggles
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [showGhost, setShowGhost] = useState<boolean>(true);
  const [showForceVector, setShowForceVector] = useState<boolean>(true);
  const [showMaxStressMarker, setShowMaxStressMarker] = useState<boolean>(true);
  const [stressNormalization, setStressNormalization] = useState<'max' | 'yield'>('max');
  const [canvasError, setCanvasError] = useState<string | null>(null);

  // Initialize Three.js scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate 900 dark CAD viewport
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 10000);
    camera.position.set(600, 450, 750);
    cameraRef.current = camera;

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e: any) {
      setCanvasError('WebGL is not supported or context could not be created.');
      return;
    }

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = 50;
    controls.maxDistance = 5000;
    controls.target.set(250, 0, 0);
    controlsRef.current = controls;

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(500, 1000, 750);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.6); // Soft cool rim
    dirLight2.position.set(-500, -300, -500);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xfef08a, 0.4); // Warm fill
    dirLight3.position.set(200, 500, -600);
    scene.add(dirLight3);

    // Assembly groups
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    const markerGroup = new THREE.Group();
    scene.add(markerGroup);
    markerGroupRef.current = markerGroup;

    // Animation render loop
    let lastTime = 0;
    const animate = (time: number) => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();

      // Subtle pulse animation on max stress marker
      if (markerGroupRef.current) {
        const pulse = 1 + 0.15 * Math.sin(time * 0.005);
        const beacon = markerGroupRef.current.getObjectByName('pulseBeacon');
        if (beacon) {
          beacon.scale.set(pulse, pulse, pulse);
        }
      }

      renderer.render(scene, camera);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Rebuild 3D Meshes whenever params, results, or materials change
  useEffect(() => {
    const scene = sceneRef.current;
    const modelGroup = modelGroupRef.current;
    const markerGroup = markerGroupRef.current;
    if (!scene || !modelGroup || !markerGroup) return;

    // Clear previous geometries and meshes
    while (modelGroup.children.length > 0) {
      const obj = modelGroup.children[0];
      modelGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      if ((obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else (mat as THREE.Material).dispose();
      }
    }
    while (markerGroup.children.length > 0) {
      const obj = markerGroup.children[0];
      markerGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    const L = params.length;
    const { width: w, thickness: t, c } = calculateCrossSection(params);
    const defScale = params.deformationScale;
    const isVertical = params.orientation === 'vertical';
    const isCircular = params.crossSection === 'circular';

    // Normalizing reference stress for the heat map
    const refStress = stressNormalization === 'yield'
      ? Math.max(material.yieldStrength, 1)
      : Math.max(results.maxStress, 1e-4);

    // 1. Reference Grid
    const gridHelper = new THREE.GridHelper(Math.max(L * 1.6, 600), 20, 0x334155, 0x1e293b);
    gridHelper.position.set(L / 2, isVertical ? 0 : -Math.max(t * 1.5, 40), 0);
    modelGroup.add(gridHelper);

    // 2. Fixed Support Wall / Mounting Flange (or simply supported pins)
    if (params.supportType === 'cantilever') {
      const flangeDepth = Math.max(t * 3, 40);
      const flangeWidth = Math.max(w * 3, 40);
      const flangeThickness = Math.max(L * 0.04, 15);

      const flangeGeo = new THREE.BoxGeometry(flangeThickness, flangeDepth, flangeWidth);
      const flangeMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.8,
        roughness: 0.3
      });
      const flangeMesh = new THREE.Mesh(flangeGeo, flangeMat);
      flangeMesh.position.set(-flangeThickness / 2, 0, 0);
      modelGroup.add(flangeMesh);

      // Clamping bolts
      const boltGeo = new THREE.CylinderGeometry(flangeThickness * 0.2, flangeThickness * 0.2, flangeThickness * 0.4, 6);
      boltGeo.rotateZ(Math.PI / 2);
      const boltMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
      const boltPositions = [
        [-flangeThickness * 0.1, flangeDepth * 0.35, flangeWidth * 0.35],
        [-flangeThickness * 0.1, -flangeDepth * 0.35, flangeWidth * 0.35],
        [-flangeThickness * 0.1, flangeDepth * 0.35, -flangeWidth * 0.35],
        [-flangeThickness * 0.1, -flangeDepth * 0.35, -flangeWidth * 0.35]
      ];
      boltPositions.forEach(([bx, by, bz]) => {
        const bolt = new THREE.Mesh(boltGeo, boltMat);
        bolt.position.set(bx, by, bz);
        modelGroup.add(bolt);
      });
    } else {
      // Simply supported supports at x = 0 and x = L
      const pinMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
      const pinGeo1 = new THREE.ConeGeometry(Math.max(t, 20), Math.max(t * 1.5, 30), 4);
      pinGeo1.rotateY(Math.PI / 4);
      const pinMesh1 = new THREE.Mesh(pinGeo1, pinMat);
      pinMesh1.position.set(0, -Math.max(t * 1.5, 30) / 2 - t / 2, 0);
      modelGroup.add(pinMesh1);

      const pinGeo2 = new THREE.CylinderGeometry(Math.max(t * 0.6, 12), Math.max(t * 0.6, 12), Math.max(w * 1.5, 20), 16);
      pinGeo2.rotateX(Math.PI / 2);
      const pinMesh2 = new THREE.Mesh(pinGeo2, pinMat);
      pinMesh2.position.set(L, -Math.max(t * 0.6, 12) - t / 2, 0);
      modelGroup.add(pinMesh2);
    }

    // 3. Build Deformed 3D Beam Geometry with Vertex Colors (Heat Map)
    const numLengthSegs = Math.min(100, Math.max(40, Math.round(L / 8)));
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Direction factor: downward vs upward force
    const dirSign = params.forceDirection === 'negative_y' ? 1 : -1;

    if (isCircular) {
      // Circular cross-section
      const radius = params.diameter / 2;
      const numRadialSegs = 32;

      // Generate vertex grid: (numLengthSegs + 1) rings of (numRadialSegs) vertices
      for (let i = 0; i <= numLengthSegs; i++) {
        const fraction = i / numLengthSegs;
        const x = fraction * L;
        const rawDeflection = getDeflectionAt(x, params, material);
        const defY = -dirSign * rawDeflection * defScale;

        for (let j = 0; j < numRadialSegs; j++) {
          const theta = (j / numRadialSegs) * Math.PI * 2;
          const y0 = radius * Math.cos(theta); // vertical coordinate relative to neutral axis
          const z0 = radius * Math.sin(theta); // horizontal lateral coordinate

          // Deformed position
          positions.push(x, y0 + defY, z0);

          // Stress at this cross-section point (x, y0)
          const stress = getLocalStressAt(x, y0, params);
          const normalized = Math.min(1, stress / refStress);
          const cRgb = getHeatMapColor(normalized);
          colors.push(cRgb.r, cRgb.g, cRgb.b);
        }
      }

      // Cylinder tube indices
      for (let i = 0; i < numLengthSegs; i++) {
        for (let j = 0; j < numRadialSegs; j++) {
          const nextJ = (j + 1) % numRadialSegs;
          const currentRing = i * numRadialSegs;
          const nextRing = (i + 1) * numRadialSegs;

          const p0 = currentRing + j;
          const p1 = currentRing + nextJ;
          const p2 = nextRing + j;
          const p3 = nextRing + nextJ;

          // Two triangles per quad
          indices.push(p0, p2, p1);
          indices.push(p1, p2, p3);
        }
      }

      // Circular end caps (root at x=0, tip at x=L)
      const rootCenterIdx = positions.length / 3;
      positions.push(0, 0, 0);
      const rootStress = getLocalStressAt(0, 0, params);
      const rootColor = getHeatMapColor(Math.min(1, rootStress / refStress));
      colors.push(rootColor.r, rootColor.g, rootColor.b);

      for (let j = 0; j < numRadialSegs; j++) {
        const nextJ = (j + 1) % numRadialSegs;
        indices.push(rootCenterIdx, nextJ, j);
      }

      const tipCenterIdx = positions.length / 3;
      const tipDefY = -dirSign * getDeflectionAt(L, params, material) * defScale;
      positions.push(L, tipDefY, 0);
      const tipStress = getLocalStressAt(L, 0, params);
      const tipColor = getHeatMapColor(Math.min(1, tipStress / refStress));
      colors.push(tipColor.r, tipColor.g, tipColor.b);

      const tipRingStart = numLengthSegs * numRadialSegs;
      for (let j = 0; j < numRadialSegs; j++) {
        const nextJ = (j + 1) % numRadialSegs;
        indices.push(tipCenterIdx, tipRingStart + j, tipRingStart + nextJ);
      }

    } else {
      // Rectangular cross-section (subdivided along length, 4 faces)
      const halfW = w / 2;
      const halfT = t / 2;

      // 4 perimeter corner vertices per length slice
      // 0: (+halfT, -halfW) - Top-Left
      // 1: (+halfT, +halfW) - Top-Right
      // 2: (-halfT, +halfW) - Bottom-Right
      // 3: (-halfT, -halfW) - Bottom-Left
      // To get smooth gradients along height, we subdivide height into N_h segments
      const numH = 6;
      const numW = 4;

      // Slices along length
      for (let i = 0; i <= numLengthSegs; i++) {
        const fraction = i / numLengthSegs;
        const x = fraction * L;
        const rawDeflection = getDeflectionAt(x, params, material);
        const defY = -dirSign * rawDeflection * defScale;

        // Perimeter points around cross-section
        // Top edge: y = +halfT, z from -halfW to +halfW
        for (let j = 0; j < numW; j++) {
          const z = -halfW + (j / numW) * w;
          const y = halfT;
          positions.push(x, y + defY, z);
          const stress = getLocalStressAt(x, y, params);
          const cRgb = getHeatMapColor(Math.min(1, stress / refStress));
          colors.push(cRgb.r, cRgb.g, cRgb.b);
        }
        // Right edge: z = +halfW, y from +halfT down to -halfT
        for (let j = 0; j < numH; j++) {
          const y = halfT - (j / numH) * t;
          const z = halfW;
          positions.push(x, y + defY, z);
          const stress = getLocalStressAt(x, y, params);
          const cRgb = getHeatMapColor(Math.min(1, stress / refStress));
          colors.push(cRgb.r, cRgb.g, cRgb.b);
        }
        // Bottom edge: y = -halfT, z from +halfW to -halfW
        for (let j = 0; j < numW; j++) {
          const z = halfW - (j / numW) * w;
          const y = -halfT;
          positions.push(x, y + defY, z);
          const stress = getLocalStressAt(x, y, params);
          const cRgb = getHeatMapColor(Math.min(1, stress / refStress));
          colors.push(cRgb.r, cRgb.g, cRgb.b);
        }
        // Left edge: z = -halfW, y from -halfT up to +halfT
        for (let j = 0; j < numH; j++) {
          const y = -halfT + (j / numH) * t;
          const z = -halfW;
          positions.push(x, y + defY, z);
          const stress = getLocalStressAt(x, y, params);
          const cRgb = getHeatMapColor(Math.min(1, stress / refStress));
          colors.push(cRgb.r, cRgb.g, cRgb.b);
        }
      }

      const totalPerimeterPts = 2 * (numW + numH);

      // Quads along length
      for (let i = 0; i < numLengthSegs; i++) {
        const ring1 = i * totalPerimeterPts;
        const ring2 = (i + 1) * totalPerimeterPts;

        for (let j = 0; j < totalPerimeterPts; j++) {
          const nextJ = (j + 1) % totalPerimeterPts;
          const p0 = ring1 + j;
          const p1 = ring1 + nextJ;
          const p2 = ring2 + j;
          const p3 = ring2 + nextJ;

          indices.push(p0, p2, p1);
          indices.push(p1, p2, p3);
        }
      }

      // Tip cap (x = L)
      const tipCenter = positions.length / 3;
      const tipDefY = -dirSign * getDeflectionAt(L, params, material) * defScale;
      positions.push(L, tipDefY, 0);
      const tipColor = getHeatMapColor(0);
      colors.push(tipColor.r, tipColor.g, tipColor.b);

      const lastRing = numLengthSegs * totalPerimeterPts;
      for (let j = 0; j < totalPerimeterPts; j++) {
        const nextJ = (j + 1) % totalPerimeterPts;
        indices.push(tipCenter, lastRing + j, lastRing + nextJ);
      }
    }

    const beamGeometry = new THREE.BufferGeometry();
    beamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    beamGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    beamGeometry.setIndex(indices);
    beamGeometry.computeVertexNormals();

    const beamMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.45,
      wireframe: showWireframe,
      side: THREE.DoubleSide
    });

    const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
    modelGroup.add(beamMesh);

    // 4. Ghost Undeformed Beam (Translucent wireframe comparison)
    if (showGhost && results.maxDeflection > 0.05) {
      let ghostGeo: THREE.BufferGeometry;
      if (isCircular) {
        ghostGeo = new THREE.CylinderGeometry(params.diameter / 2, params.diameter / 2, L, 24);
        ghostGeo.rotateZ(Math.PI / 2);
        ghostGeo.translate(L / 2, 0, 0);
      } else {
        ghostGeo = new THREE.BoxGeometry(L, t, w);
        ghostGeo.translate(L / 2, 0, 0);
      }
      const ghostMat = new THREE.MeshBasicMaterial({
        color: 0x64748b,
        wireframe: true,
        transparent: true,
        opacity: 0.22
      });
      const ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
      modelGroup.add(ghostMesh);
    }

    // 5. Applied Force 3D Arrow Indicator
    if (showForceVector) {
      const forceX = Math.min(Math.max(params.forcePosition, 0), L);
      const forceDefY = -dirSign * getDeflectionAt(forceX, params, material) * defScale;
      const arrowHeight = Math.max(L * 0.18, 50);
      const arrowDir = dirSign > 0 ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 1, 0);

      const surfaceY = (dirSign > 0 ? c : -c) + forceDefY;
      const origin = new THREE.Vector3(forceX, surfaceY + (dirSign > 0 ? arrowHeight : -arrowHeight), 0);

      const arrowColor = 0xf59e0b; // Amber / Gold prominent vector
      const arrowHelper = new THREE.ArrowHelper(
        arrowDir,
        origin,
        arrowHeight,
        arrowColor,
        arrowHeight * 0.35,
        arrowHeight * 0.22
      );
      modelGroup.add(arrowHelper);

      // Force Point of application marker sphere
      const sphereGeo = new THREE.SphereGeometry(Math.max(t * 0.15, 3), 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const forceMarker = new THREE.Mesh(sphereGeo, sphereMat);
      forceMarker.position.set(forceX, surfaceY, 0);
      modelGroup.add(forceMarker);
    }

    // 6. Maximum Stress Point Marker (High Visibility Glowing Beacon)
    if (showMaxStressMarker && results.maxStress > 0.01) {
      const maxLoc = results.maxStressLocation;
      const maxDefY = -dirSign * getDeflectionAt(maxLoc.x, params, material) * defScale;
      const markerY = c + maxDefY;

      // Target ring
      const ringGeo = new THREE.RingGeometry(Math.max(t * 0.2, 5), Math.max(t * 0.35, 9), 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xef4444, // Red
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(maxLoc.x, markerY + 1, 0);
      markerGroup.add(ringMesh);

      // Pulsing outer halo beacon
      const haloGeo = new THREE.RingGeometry(Math.max(t * 0.4, 10), Math.max(t * 0.55, 14), 32);
      haloGeo.rotateX(-Math.PI / 2);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xff6b00,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.name = 'pulseBeacon';
      haloMesh.position.set(maxLoc.x, markerY + 1.2, 0);
      markerGroup.add(haloMesh);

      // Vertical pointer pin
      const pinHeight = Math.max(L * 0.08, 30);
      const pinGeo = new THREE.CylinderGeometry(1.2, 1.2, pinHeight, 8);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.set(maxLoc.x, markerY + pinHeight / 2 + 3, 0);
      markerGroup.add(pinMesh);

      // Beacon tip sphere
      const tipBallGeo = new THREE.SphereGeometry(Math.max(t * 0.18, 4.5), 16, 16);
      const tipBallMat = new THREE.MeshStandardMaterial({
        color: 0xff0033,
        emissive: 0xcc0022,
        roughness: 0.2
      });
      const tipBall = new THREE.Mesh(tipBallGeo, tipBallMat);
      tipBall.position.set(maxLoc.x, markerY + pinHeight + 3, 0);
      markerGroup.add(tipBall);
    }

    // 7. Apply Orientation Transformation:
    // If Horizontal: Beam lies along X axis.
    // If Vertical: Beam stands along Y axis (clamped at bottom y=0, pointing up to y=L).
    if (isVertical) {
      // Rotate 90 degrees around Z axis so length is along Y axis
      modelGroup.rotation.z = Math.PI / 2;
      modelGroup.position.set(0, 0, 0);
      markerGroup.rotation.z = Math.PI / 2;
      markerGroup.position.set(0, 0, 0);
    } else {
      modelGroup.rotation.z = 0;
      modelGroup.position.set(0, 0, 0);
      markerGroup.rotation.z = 0;
      markerGroup.position.set(0, 0, 0);
    }

  }, [
    params,
    results,
    material,
    showWireframe,
    showGhost,
    showForceVector,
    showMaxStressMarker,
    stressNormalization
  ]);

  // Adjust camera framing when length changes significantly
  const resetCamera = useCallback((view: 'iso' | 'front' | 'top' | 'side' = 'iso') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const L = params.length;
    const isVertical = params.orientation === 'vertical';
    const centerX = isVertical ? 0 : L * 0.5;
    const centerY = isVertical ? L * 0.5 : 0;
    const dist = Math.max(L * 1.5, 450);

    controls.target.set(centerX, centerY, 0);

    if (view === 'iso') {
      camera.position.set(centerX + dist * 0.7, centerY + dist * 0.6, dist * 0.9);
    } else if (view === 'front') {
      camera.position.set(centerX, centerY, dist * 1.4);
    } else if (view === 'top') {
      camera.position.set(centerX, centerY + dist * 1.4, 0.001);
    } else if (view === 'side') {
      camera.position.set(isVertical ? dist * 1.4 : centerX - dist * 1.4, centerY, 0);
    }

    camera.lookAt(centerX, centerY, 0);
    controls.update();
  }, [params.length, params.orientation]);

  // Capture viewport screenshot
  const handleCaptureScreenshot = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `mech-stress-analysis-${params.crossSection}-${params.materialId}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="relative w-full h-full min-h-[440px] flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full flex-1 cursor-grab active:cursor-grabbing outline-none" />

      {/* WebGL Error Banner if unsupported */}
      {canvasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-red-300 p-6 text-center">
          <p>{canvasError}</p>
        </div>
      )}

      {/* Floating Top Controls HUD */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none gap-2">
        {/* Left: Quick Live Metric Badges */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl px-3 py-2 shadow-lg">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="text-slate-400 font-medium">Max Stress:</span>
            <span className="font-mono font-semibold text-rose-400 tabular-nums">
              {results.maxStress.toFixed(1)} MPa
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="text-slate-400 font-medium">Deflection:</span>
            <span className="font-mono font-semibold text-sky-400 tabular-nums">
              {results.maxDeflection.toFixed(2)} mm
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="text-slate-400 font-medium">Safety Factor:</span>
            <span
              className={`font-mono font-semibold tabular-nums ${
                results.status === 'safe'
                  ? 'text-emerald-400'
                  : results.status === 'warning'
                  ? 'text-amber-400'
                  : 'text-rose-500'
              }`}
            >
              {results.safetyFactor > 99 ? '>99' : results.safetyFactor.toFixed(2)}
              <span className="text-[10px] ml-1 uppercase">
                ({results.status})
              </span>
            </span>
          </div>
        </div>

        {/* Right: Camera & View Presets */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 shadow-lg">
          <button
            onClick={() => resetCamera('iso')}
            title="Isometric 3D View"
            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Iso
          </button>
          <button
            onClick={() => resetCamera('front')}
            title="Front Elevation View"
            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Front
          </button>
          <button
            onClick={() => resetCamera('top')}
            title="Top Plan View"
            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Top
          </button>
          <button
            onClick={() => resetCamera('side')}
            title="Side Section View"
            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Side
          </button>
          <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />
          <button
            onClick={handleCaptureScreenshot}
            title="Save PNG Viewport Screenshot"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => resetCamera('iso')}
            title="Reset Camera Center"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Bottom Viewport Overlay Controls */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between pointer-events-none gap-3">
        {/* Stress Heatmap Scale Bar */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-3 shadow-lg min-w-[260px] max-w-sm">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-300 mb-1.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Stress Heat Map (Von Mises / Bending)
            </span>
            <span className="font-mono text-slate-400">MPa</span>
          </div>

          {/* Color Bar Gradient: Blue -> Yellow -> Red */}
          <div className="h-3 w-full rounded-md shadow-inner bg-gradient-to-r from-[#0055ff] via-[#00d4ff] via-35% via-[#ffd700] via-65% to-[#ef4444]" />

          {/* Scale Labels */}
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1 tabular-nums">
            <span>0.0</span>
            <span>
              {stressNormalization === 'yield'
                ? (material.yieldStrength * 0.5).toFixed(0)
                : (results.maxStress * 0.5).toFixed(1)}
            </span>
            <span className="text-rose-400 font-semibold">
              {stressNormalization === 'yield'
                ? `${material.yieldStrength} (Yield)`
                : `${results.maxStress.toFixed(1)} (Peak)`}
            </span>
          </div>

          {/* Normalization Mode Switch */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
            <span>Scale Baseline:</span>
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-md">
              <button
                onClick={() => setStressNormalization('max')}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  stressNormalization === 'max'
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Max Stress
              </button>
              <button
                onClick={() => setStressNormalization('yield')}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  stressNormalization === 'yield'
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Material Yield ({material.yieldStrength} MPa)
              </button>
            </div>
          </div>
        </div>

        {/* Viewport Toggles and Deformation Scale */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl px-3 py-2 shadow-lg">
          {/* Deformation Scale Slider */}
          {onUpdateParams && (
            <div className="flex items-center gap-2 pr-2 border-r border-slate-700 text-xs text-slate-300">
              <span className="text-slate-400 text-[11px] whitespace-nowrap">Deflection Scale:</span>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={params.deformationScale}
                onChange={(e) => onUpdateParams({ deformationScale: Number(e.target.value) })}
                className="w-20 accent-sky-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
              />
              <span className="font-mono text-xs text-sky-400 font-semibold w-9 tabular-nums">
                {params.deformationScale}x
              </span>
            </div>
          )}

          {/* Feature Toggles */}
          <button
            onClick={() => setShowGhost(!showGhost)}
            title="Toggle Undeformed Ghost Overlay"
            className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
              showGhost ? 'bg-slate-800 text-sky-300 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ghost
          </button>

          <button
            onClick={() => setShowWireframe(!showWireframe)}
            title="Toggle Wireframe Mesh Grid"
            className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
              showWireframe ? 'bg-slate-800 text-sky-300 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mesh Wireframe
          </button>

          <button
            onClick={() => setShowForceVector(!showForceVector)}
            title="Toggle Applied Force 3D Vector"
            className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
              showForceVector ? 'bg-slate-800 text-amber-300 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Force Vector
          </button>

          <button
            onClick={() => setShowMaxStressMarker(!showMaxStressMarker)}
            title="Toggle Max Stress Beacon Callout"
            className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
              showMaxStressMarker ? 'bg-slate-800 text-rose-300 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Max Stress Pin
          </button>
        </div>
      </div>

      {/* Mouse navigation hint */}
      <div className="absolute top-14 left-3 pointer-events-none hidden md:flex items-center gap-2 text-[10px] text-slate-500 bg-slate-900/60 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-800">
        <span>Rotate: Left Click + Drag</span>
        <span>·</span>
        <span>Pan: Right Click + Drag</span>
        <span>·</span>
        <span>Zoom: Wheel</span>
      </div>
    </div>
  );
};
