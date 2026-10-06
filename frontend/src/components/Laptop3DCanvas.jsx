import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function Laptop3DCanvas() {
  const containerRef = useRef(null);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId;
    let width = container.clientWidth || 360;
    let height = container.clientHeight || 280;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 5.2);
    camera.lookAt(0, 0, 0);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xfcfbf9, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xa5d6a7, 3.0);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x81c784, 1.6);
    fillLight.position.set(-4, -2, -3);
    scene.add(fillLight);

    const screenLight = new THREE.PointLight(0x80cbc4, 1.5, 3.5);
    screenLight.position.set(0, 0.8, 0.4);
    scene.add(screenLight);

    // 5. Procedural Screen Canvas Texture
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 512;
    screenCanvas.height = 320;
    const ctx = screenCanvas.getContext('2d');

    const drawScreenContent = (time) => {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 512, 320);
      grad.addColorStop(0, '#09150e');
      grad.addColorStop(1, '#0e2418');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 320);

      // Top status bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(0, 0, 512, 28);
      ctx.fillStyle = '#a5d6a7';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('SPECDIFF AI HARDWARE CORE // v2.4-PROD', 16, 18);
      ctx.fillStyle = '#81c784';
      ctx.fillText('● 100% DETERMINISTIC', 370, 18);

      // Terminal telemetry lines
      ctx.font = '12px monospace';
      ctx.fillStyle = '#e8f5e9';
      ctx.fillText('> SYSTEM TELEMETRY: ALL 79 SKUs ONLINE', 20, 56);
      ctx.fillStyle = '#a5d6a7';
      ctx.fillText('> GEEKBENCH 6 MULTI: 14,500 [TITAN CLASS]', 20, 78);
      ctx.fillStyle = '#80cbc4';
      ctx.fillText('> RTX 4060 TGP 115W: 144 FPS LOCKED', 20, 100);
      ctx.fillStyle = '#ffcc80';
      ctx.fillText('> PRICE SIGNAL: [STRONG BUY] ATL VERIFIED', 20, 122);

      // Animated Waveform Curve
      ctx.strokeStyle = '#81c784';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 20; x < 492; x++) {
        const y = 180 + Math.sin(x * 0.035 + time * 4) * 22 + Math.cos(x * 0.015 - time * 2) * 12;
        if (x === 20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Mini matrix bars
      for (let b = 0; b < 16; b++) {
        const barH = 20 + Math.sin(b * 0.6 + time * 5) * 16;
        ctx.fillStyle = b % 2 === 0 ? 'rgba(129, 199, 132, 0.7)' : 'rgba(165, 214, 167, 0.4)';
        ctx.fillRect(20 + b * 29, 280 - barH, 18, barH);
      }

      // Blinking cursor
      if (Math.floor(time * 2) % 2 === 0) {
        ctx.fillStyle = '#81c784';
        ctx.fillRect(360, 112, 8, 12);
      }
    };

    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.generateMipmaps = false;
    screenTexture.minFilter = THREE.LinearFilter;

    // 6. Laptop 3D Model Group
    const laptopGroup = new THREE.Group();
    scene.add(laptopGroup);

    // Materials
    const aluminumMaterial = new THREE.MeshStandardMaterial({
      color: 0x182a1f,
      metalness: 0.88,
      roughness: 0.22,
    });

    const keyboardWellMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b140f,
      metalness: 0.4,
      roughness: 0.7,
    });

    const trackpadMaterial = new THREE.MeshStandardMaterial({
      color: 0x22382b,
      metalness: 0.5,
      roughness: 0.18,
    });

    const screenGlassMaterial = new THREE.MeshStandardMaterial({
      map: screenTexture,
      roughness: 0.12,
      metalness: 0.1,
      emissive: 0x1b4332,
      emissiveIntensity: 0.45,
    });

    // --- Base Chassis ---
    const baseWidth = 2.8;
    const baseDepth = 1.9;
    const baseThickness = 0.09;

    const baseGeometry = new THREE.BoxGeometry(baseWidth, baseThickness, baseDepth);
    const baseMesh = new THREE.Mesh(baseGeometry, aluminumMaterial);
    baseMesh.position.y = -baseThickness / 2;
    baseMesh.receiveShadow = true;
    laptopGroup.add(baseMesh);

    // Keyboard well
    const kbGeometry = new THREE.BoxGeometry(2.3, 0.01, 1.0);
    const kbMesh = new THREE.Mesh(kbGeometry, keyboardWellMaterial);
    kbMesh.position.set(0, 0.005, -0.28);
    laptopGroup.add(kbMesh);

    // Trackpad
    const trackpadGeometry = new THREE.BoxGeometry(0.9, 0.01, 0.52);
    const trackpadMesh = new THREE.Mesh(trackpadGeometry, trackpadMaterial);
    trackpadMesh.position.set(0, 0.005, 0.56);
    laptopGroup.add(trackpadMesh);

    // Front rubber feet
    const footMaterial = new THREE.MeshBasicMaterial({ color: 0x050a07 });
    [-1.2, 1.2].forEach(x => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), footMaterial);
      foot.position.set(x, -baseThickness - 0.01, 0.7);
      laptopGroup.add(foot);
    });

    // --- Display Screen Lid (Hinged at back) ---
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 0, -baseDepth / 2); // Position at rear edge

    const lidThickness = 0.05;
    const lidGeometry = new THREE.BoxGeometry(baseWidth, baseDepth, lidThickness);
    const lidMesh = new THREE.Mesh(lidGeometry, aluminumMaterial);
    lidMesh.position.set(0, baseDepth / 2, 0);
    lidGroup.add(lidMesh);

    // Display glass panel
    const displayGeometry = new THREE.PlaneGeometry(baseWidth * 0.92, baseDepth * 0.88);
    const displayMesh = new THREE.Mesh(displayGeometry, screenGlassMaterial);
    displayMesh.position.set(0, baseDepth / 2, lidThickness / 2 + 0.001);
    lidGroup.add(displayMesh);

    // Set open angle (~112 degrees)
    lidGroup.rotation.x = 0.42;
    laptopGroup.add(lidGroup);

    // Floating Spec Orbs around laptop
    const orbGroup = new THREE.Group();
    laptopGroup.add(orbGroup);

    const orbGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const orbMaterial1 = new THREE.MeshStandardMaterial({
      color: 0x81c784,
      emissive: 0x4caf50,
      emissiveIntensity: 0.8,
    });
    const orbMaterial2 = new THREE.MeshStandardMaterial({
      color: 0xffb74d,
      emissive: 0xff9800,
      emissiveIntensity: 0.8,
    });

    const orb1 = new THREE.Mesh(orbGeometry, orbMaterial1);
    const orb2 = new THREE.Mesh(orbGeometry, orbMaterial2);
    orbGroup.add(orb1);
    orbGroup.add(orb2);

    // Initial pose
    laptopGroup.rotation.y = -0.45;
    laptopGroup.rotation.x = 0.22;

    // 7. Interactive Orbit & Drag Physics
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationY = -0.45;
    let targetRotationX = 0.22;

    const onPointerDown = (e) => {
      isDragging = true;
      setIsInteracting(true);
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        targetRotationY += deltaX * 0.012;
        targetRotationX += deltaY * 0.008;
        // Clamp vertical pitch so user doesn't flip laptop upside down
        targetRotationX = Math.max(-0.2, Math.min(0.7, targetRotationX));

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerUp = () => {
      isDragging = false;
      setIsInteracting(false);
    };

    const domElement = renderer.domElement;
    domElement.style.cursor = 'grab';
    domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 8. Animation & Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Redraw canvas texture at 30fps
      if (Math.floor(elapsedTime * 30) % 2 === 0) {
        drawScreenContent(elapsedTime);
        screenTexture.needsUpdate = true;
      }

      // Smooth damping toward target rotation
      laptopGroup.rotation.y += (targetRotationY - laptopGroup.rotation.y) * 0.08;
      laptopGroup.rotation.x += (targetRotationX - laptopGroup.rotation.x) * 0.08;

      // Gentle auto-float and idle drift if not dragging
      if (!isDragging) {
        targetRotationY += 0.003; // Gentle slow rotation
        laptopGroup.position.y = Math.sin(elapsedTime * 1.6) * 0.07;
        laptopGroup.position.x = Math.cos(elapsedTime * 0.8) * 0.04;
      }

      // Animate floating spec orbs
      orb1.position.set(
        Math.sin(elapsedTime * 2) * 1.8,
        0.8 + Math.cos(elapsedTime * 1.5) * 0.4,
        Math.cos(elapsedTime * 2) * 1.2
      );
      orb2.position.set(
        Math.cos(elapsedTime * 1.7) * 1.9,
        0.6 + Math.sin(elapsedTime * 2.2) * 0.35,
        Math.sin(elapsedTime * 1.7) * 1.3
      );

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      baseGeometry.dispose();
      kbGeometry.dispose();
      trackpadGeometry.dispose();
      lidGeometry.dispose();
      displayGeometry.dispose();
      orbGeometry.dispose();
      aluminumMaterial.dispose();
      keyboardWellMaterial.dispose();
      trackpadMaterial.dispose();
      screenGlassMaterial.dispose();
      screenTexture.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[260px] sm:h-[300px] flex items-center justify-center overflow-hidden select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating 3D Interaction Badge */}
      <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-forest-950/80 backdrop-blur-md border border-white/15 text-[10px] font-mono tracking-widest text-sage-300 uppercase pointer-events-none transition-opacity duration-300 ${isInteracting ? 'opacity-30' : 'opacity-85'}`}>
        ✦ DRAG TO ROTATE 360°
      </div>
    </div>
  );
}
