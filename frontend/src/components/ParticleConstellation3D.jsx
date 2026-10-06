import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ParticleConstellation3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animId;
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 220;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // Particle Cloud Geometry
    const particleCount = 110;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount * 3);

    const palette = [
      new THREE.Color(0xa5d6a7), // Sage light
      new THREE.Color(0x81c784), // Sage medium
      new THREE.Color(0x4caf50), // Emerald
      new THREE.Color(0xfcfbf9), // Warm porcelain
    ];

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 450;
      positions[idx + 1] = (Math.random() - 0.5) * 280;
      positions[idx + 2] = (Math.random() - 0.5) * 180;

      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[idx] = col.r;
      colors[idx + 1] = col.g;
      colors[idx + 2] = col.b;

      speeds[idx] = (Math.random() - 0.5) * 0.15;
      speeds[idx + 1] = (Math.random() - 0.5) * 0.15;
      speeds[idx + 2] = (Math.random() - 0.5) * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Circular point texture generated dynamically
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d');
    const radGrad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    radGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    radGrad.addColorStop(0.35, 'rgba(165, 214, 167, 0.8)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pCtx.fillStyle = radGrad;
    pCtx.fillRect(0, 0, 32, 32);

    const pTexture = new THREE.CanvasTexture(pCanvas);

    const material = new THREE.PointsMaterial({
      size: 5.5,
      vertexColors: true,
      map: pTexture,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Dynamic Connections Line Geometry
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x81c784,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
    });

    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(particleCount * 6 * 3); // Max links
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      targetX = (x / rect.width) * 40;
      targetY = -(y / rect.height) * 30;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Animation Loop
    let clock = new THREE.Clock();
    const connectionDist = 65;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth camera drift + parallax
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;
      camera.position.x = mouseX;
      camera.position.y = mouseY;
      camera.lookAt(0, 0, 0);

      // Rotate particle cloud gently
      particles.rotation.y = time * 0.03;
      particles.rotation.x = Math.sin(time * 0.02) * 0.08;
      lines.rotation.copy(particles.rotation);

      // Update positions
      const posAttr = geometry.attributes.position;
      const posArray = posAttr.array;

      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        posArray[idx] += speeds[idx];
        posArray[idx + 1] += speeds[idx + 1];
        posArray[idx + 2] += speeds[idx + 2];

        // Bounds wrap
        if (posArray[idx] > 225) posArray[idx] = -225;
        if (posArray[idx] < -225) posArray[idx] = 225;
        if (posArray[idx + 1] > 140) posArray[idx + 1] = -140;
        if (posArray[idx + 1] < -140) posArray[idx + 1] = 140;
        if (posArray[idx + 2] > 90) posArray[idx + 2] = -90;
        if (posArray[idx + 2] < -90) posArray[idx + 2] = 90;
      }
      posAttr.needsUpdate = true;

      // Update dynamic links between close particles
      let lineIdx = 0;
      const linePosArray = lineGeometry.attributes.position.array;

      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = posArray[i * 3] - posArray[j * 3];
          const dy = posArray[i * 3 + 1] - posArray[j * 3 + 1];
          const dz = posArray[i * 3 + 2] - posArray[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < connectionDist && lineIdx < linePositions.length - 6) {
            linePosArray[lineIdx++] = posArray[i * 3];
            linePosArray[lineIdx++] = posArray[i * 3 + 1];
            linePosArray[lineIdx++] = posArray[i * 3 + 2];

            linePosArray[lineIdx++] = posArray[j * 3];
            linePosArray[lineIdx++] = posArray[j * 3 + 1];
            linePosArray[lineIdx++] = posArray[j * 3 + 2];
          }
        }
      }

      lineGeometry.setDrawRange(0, lineIdx / 3);
      lineGeometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

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

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      pTexture.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden opacity-60 mix-blend-screen"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
