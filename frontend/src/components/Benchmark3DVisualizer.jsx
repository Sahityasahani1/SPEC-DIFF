import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function Benchmark3DVisualizer({ benchmarks }) {
  const containerRef = useRef(null);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId;
    let width = container.clientWidth || 320;
    let height = container.clientHeight || 192;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.4, 4.2);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x81c784, 2.5);
    dirLight.position.set(3, 5, 2);
    scene.add(dirLight);

    const rimLight = new THREE.PointLight(0xa5d6a7, 3.0, 6);
    rimLight.position.set(-2, 2, -2);
    scene.add(rimLight);

    // 4. Chip Group
    const chipGroup = new THREE.Group();
    scene.add(chipGroup);

    // PCB Substrate (dark green / slate)
    const pcbGeo = new THREE.BoxGeometry(3.0, 0.12, 3.0);
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x091b12,
      metalness: 0.6,
      roughness: 0.4,
    });
    const pcb = new THREE.Mesh(pcbGeo, pcbMat);
    pcb.position.y = -0.06;
    chipGroup.add(pcb);

    // Gold Corner Alignment Markers
    const markerGeo = new THREE.BoxGeometry(0.18, 0.02, 0.18);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      metalness: 0.95,
      roughness: 0.15,
    });

    const markerOffsets = [
      [-1.3, -1.3],
      [1.3, -1.3],
      [-1.3, 1.3],
      [1.3, 1.3],
    ];
    markerOffsets.forEach(([mx, mz]) => {
      const marker = new THREE.Mesh(markerGeo, goldMat);
      marker.position.set(mx, 0.01, mz);
      chipGroup.add(marker);
    });

    // Outer Heatspreader Frame
    const frameGeo = new THREE.BoxGeometry(2.3, 0.08, 2.3);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x223127,
      metalness: 0.85,
      roughness: 0.25,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 0.04;
    chipGroup.add(frame);

    // Dynamic Die Texture Canvas (Silicon circuitry & live metrics)
    const dieCanvas = document.createElement('canvas');
    dieCanvas.width = 256;
    dieCanvas.height = 256;
    const dieCtx = dieCanvas.getContext('2d');

    const drawDieSurface = (t) => {
      // Dark silicon background
      dieCtx.fillStyle = '#06110a';
      dieCtx.fillRect(0, 0, 256, 256);

      // Etched wafer grid lines
      dieCtx.strokeStyle = 'rgba(129, 199, 132, 0.25)';
      dieCtx.lineWidth = 1;
      for (let i = 16; i < 256; i += 24) {
        dieCtx.beginPath();
        dieCtx.moveTo(i, 0);
        dieCtx.lineTo(i, 256);
        dieCtx.stroke();
        dieCtx.beginPath();
        dieCtx.moveTo(0, i);
        dieCtx.lineTo(256, i);
        dieCtx.stroke();
      }

      // Core cluster zones
      // Zone 1: P-Cores
      const pulse1 = Math.abs(Math.sin(t * 3));
      dieCtx.fillStyle = `rgba(165, 214, 167, ${0.4 + pulse1 * 0.4})`;
      dieCtx.fillRect(20, 20, 96, 96);
      dieCtx.fillStyle = '#e8f5e9';
      dieCtx.font = 'bold 9px monospace';
      dieCtx.fillText('P-CORES', 28, 40);
      dieCtx.fillText(`${benchmarks?.geekbench_single || 2400} PTS`, 28, 55);

      // Zone 2: E-Cores
      const pulse2 = Math.abs(Math.cos(t * 2.5));
      dieCtx.fillStyle = `rgba(129, 199, 132, ${0.35 + pulse2 * 0.35})`;
      dieCtx.fillRect(140, 20, 96, 96);
      dieCtx.fillStyle = '#e8f5e9';
      dieCtx.font = 'bold 9px monospace';
      dieCtx.fillText('E-CORES', 148, 40);
      dieCtx.fillText(`${benchmarks?.geekbench_multi || 11000} PTS`, 148, 55);

      // Zone 3: GPU Compute
      const pulse3 = Math.abs(Math.sin(t * 4 + 1));
      dieCtx.fillStyle = `rgba(255, 183, 77, ${0.35 + pulse3 * 0.4})`;
      dieCtx.fillRect(20, 140, 130, 96);
      dieCtx.fillStyle = '#fff3e0';
      dieCtx.font = 'bold 9px monospace';
      dieCtx.fillText('GPU ENGINE', 28, 160);
      dieCtx.fillText(benchmarks?.gaming_fps ? `${benchmarks.gaming_fps.CS2 || 180} FPS CS2` : 'INTEGRATED', 28, 175);

      // Zone 4: Neural Engine
      const pulse4 = Math.abs(Math.sin(t * 2 + 2));
      dieCtx.fillStyle = `rgba(100, 255, 218, ${0.35 + pulse4 * 0.45})`;
      dieCtx.fillRect(166, 140, 70, 96);
      dieCtx.fillStyle = '#e0f2f1';
      dieCtx.font = 'bold 8px monospace';
      dieCtx.fillText('NPU/AI', 172, 160);
      dieCtx.fillText('38 TOPS', 172, 175);

      // Border glow
      dieCtx.strokeStyle = '#81c784';
      dieCtx.lineWidth = 2;
      dieCtx.strokeRect(2, 2, 252, 252);
    };

    const dieTexture = new THREE.CanvasTexture(dieCanvas);
    dieTexture.minFilter = THREE.LinearFilter;

    // Silicon Die Mesh
    const dieGeo = new THREE.BoxGeometry(1.8, 0.05, 1.8);
    const dieMat = new THREE.MeshStandardMaterial({
      map: dieTexture,
      roughness: 0.18,
      metalness: 0.7,
      emissive: 0x1b4332,
      emissiveIntensity: 0.5,
    });
    const die = new THREE.Mesh(dieGeo, dieMat);
    die.position.y = 0.09;
    chipGroup.add(die);

    // Glowing Holographic Compute Beams rising vertically
    const beamGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x81c784,
      transparent: true,
      opacity: 0.6,
    });

    const beams = [];
    const beamCoords = [
      [-0.45, -0.45],
      [0.45, -0.45],
      [-0.3, 0.45],
      [0.5, 0.45],
    ];

    beamCoords.forEach(([bx, bz]) => {
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(bx, 0.48, bz);
      chipGroup.add(beam);
      beams.push(beam);
    });

    // Orbit & Tilt controls
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let targetRotY = 0.5;
    let targetRotX = 0.4;

    const onPointerDown = (e) => {
      isDragging = true;
      setIsInteracting(true);
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      targetRotY += dx * 0.015;
      targetRotX += dy * 0.01;
      targetRotX = Math.max(-0.1, Math.min(0.8, targetRotX));
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
      setIsInteracting(false);
    };

    const canvasDom = renderer.domElement;
    canvasDom.style.cursor = 'grab';
    canvasDom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Clock & Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Redraw die surface
      drawDieSurface(elapsed);
      dieTexture.needsUpdate = true;

      // Animate beams
      beams.forEach((beam, idx) => {
        beam.scale.y = 0.5 + Math.sin(elapsed * 4 + idx) * 0.45;
        beam.position.y = 0.1 + (beam.scale.y * 0.8) / 2;
      });

      // Smooth damping
      chipGroup.rotation.y += (targetRotY - chipGroup.rotation.y) * 0.1;
      chipGroup.rotation.x += (targetRotX - chipGroup.rotation.x) * 0.1;

      if (!isDragging) {
        targetRotY += 0.005; // slow idle spin
        chipGroup.position.y = Math.sin(elapsed * 2) * 0.04;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      canvasDom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      ro.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      pcbGeo.dispose();
      markerGeo.dispose();
      frameGeo.dispose();
      dieGeo.dispose();
      beamGeo.dispose();
      pcbMat.dispose();
      goldMat.dispose();
      frameMat.dispose();
      dieMat.dispose();
      beamMat.dispose();
      dieTexture.dispose();
    };
  }, [benchmarks]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden rounded-xl bg-forest-950/20 border border-[#e8e5dc]/60">
      <div ref={containerRef} className="w-full h-full min-h-[180px]" />
      
      {/* Mini telemetry badge */}
      <div className={`absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full bg-forest-900/80 backdrop-blur-sm border border-white/10 text-[9px] font-mono tracking-wider text-sage-300 pointer-events-none transition-opacity ${isInteracting ? 'opacity-30' : 'opacity-85'}`}>
        ✦ DRAG 3D DIE
      </div>
    </div>
  );
}
