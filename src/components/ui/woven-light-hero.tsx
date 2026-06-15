"use client";

import React, { useRef, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import * as THREE from "three";

interface WovenLightHeroProps {
  badge?: string;
  title: string;
  subtitle?: string;
  primaryCtaLabel: string;
  onPrimaryCtaClick: () => void;
  features?: string[];
}

// --- Main Hero Component ---
export const WovenLightHero = ({
  badge,
  title,
  subtitle,
  primaryCtaLabel,
  onPrimaryCtaClick,
  features = [],
}: WovenLightHeroProps) => {
  const textControls = useAnimation();
  const buttonControls = useAnimation();

  useEffect(() => {
    // Add elegant display font
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;555;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    textControls.start((i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05 + 0.3,
        duration: 1.0,
        ease: [0.2, 0.65, 0.3, 0.9],
      },
    }));
    buttonControls.start({
      opacity: 1,
      y: 0,
      transition: { delay: 1.2, duration: 0.8 },
    });

    return () => {
      try {
        document.head.removeChild(link);
      } catch (e) {
        // Prevent removal errors if element was already unmounted
      }
    };
  }, [textControls, buttonControls]);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-hidden bg-slate-950 px-6 py-20 text-center select-none">
      <WovenCanvas />

      {/* Dynamic Content */}
      <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center pt-8 md:pt-16">
        {/* Badge */}
        {badge && (
          <motion.span
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-350 backdrop-blur-md"
          >
            {badge}
          </motion.span>
        )}

        {/* Title */}
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]"
          style={{
            fontFamily: "'Playfair Display', serif",
            textShadow: "0 0 40px rgba(255, 255, 255, 0.15)",
          }}
        >
          {title.split(" ").map((word, i) => (
            <span key={i} className="inline-block">
              {word.split("").map((char, j) => (
                <motion.span
                  key={j}
                  custom={i * 5 + j}
                  initial={{ opacity: 0, y: 30 }}
                  animate={textControls}
                  style={{ display: "inline-block" }}
                >
                  {char}
                </motion.span>
              ))}
              {i < title.split(" ").length - 1 && <span>&nbsp;</span>}
            </span>
          ))}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <motion.p
            custom={title.length}
            initial={{ opacity: 0, y: 20 }}
            animate={textControls}
            className="mt-6 max-w-md text-sm sm:text-base leading-relaxed text-slate-300 font-normal"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {subtitle}
          </motion.p>
        )}

        {/* CTA Button */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={buttonControls} className="mt-8">
          <button
            onClick={onPrimaryCtaClick}
            className="cursor-pointer rounded-full border border-white/20 bg-white/10 px-8 py-3 text-sm font-semibold tracking-wider text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/20 hover:shadow-[0_0_24px_rgba(255,255,255,0.15)] active:scale-95"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {primaryCtaLabel}
          </button>
        </motion.div>

        {/* Features */}
        {features.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="mt-12 w-full max-w-md rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-sm"
          >
            <div className="flex flex-col gap-2.5">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 text-left text-[12px] text-slate-400 font-medium"
                >
                  <span className="h-1.5 w-1.5 flex-none rounded-full bg-gradient-to-r from-scope-pink to-scope-blue shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
                  {feature}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// --- Three.js Canvas Component ---
const WovenCanvas = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    // Append renderer DOM
    mountRef.current.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 5;

    const mouse = new THREE.Vector2(0, 0);
    const startTime = performance.now();

    // Responsive sizing function based on container dimensions
    const updateSize = () => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    // Initialize dimensions
    updateSize();

    // Use ResizeObserver for accurate sizing inside dynamic grid columns
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(mountRef.current);

    // --- Premium Brand Color Woven Particles ---
    const particleCount = 25000; // optimized count for grid performance
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    const geometry = new THREE.BufferGeometry();
    const torusKnot = new THREE.TorusKnotGeometry(1.4, 0.45, 180, 24);

    // Brand specific color pool
    const brandColors = [
      new THREE.Color("#8b5cf6"), // purple
      new THREE.Color("#7c3aed"), // violet
      new THREE.Color("#3b82f6"), // blue
      new THREE.Color("#ec4899"), // pink
      new THREE.Color("#f97316"), // orange
    ];

    const vertexCount = torusKnot.attributes.position.count;
    for (let i = 0; i < particleCount; i++) {
      const vertexIndex = i % vertexCount;
      const x = torusKnot.attributes.position.getX(vertexIndex);
      const y = torusKnot.attributes.position.getY(vertexIndex);
      const z = torusKnot.attributes.position.getZ(vertexIndex);

      // Add random dispersion for silk thread feel
      positions[i * 3] = x + (Math.random() * 0.04 - 0.02);
      positions[i * 3 + 1] = y + (Math.random() * 0.04 - 0.02);
      positions[i * 3 + 2] = z + (Math.random() * 0.04 - 0.02);

      originalPositions[i * 3] = positions[i * 3];
      originalPositions[i * 3 + 1] = positions[i * 3 + 1];
      originalPositions[i * 3 + 2] = positions[i * 3 + 2];

      // Sample brand color
      const baseColor = brandColors[Math.floor(Math.random() * brandColors.length)];
      const particleColor = baseColor.clone();

      // Add subtle HSL shift for vibrancy
      particleColor.offsetHSL(Math.random() * 0.04 - 0.02, 0, Math.random() * 0.1 - 0.05);

      colors[i * 3] = particleColor.r;
      colors[i * 3 + 1] = particleColor.g;
      colors[i * 3 + 2] = particleColor.b;

      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
    }

    // Clean up temporary geometries to prevent memory leaks
    torusKnot.dispose();

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.75,
    });

    const points = new THREE.Points(geometry, material);
    points.position.y = -0.8; // Shift downwards to leave space for the title/button above it
    scene.add(points);

    // Mouse coordinates relative to mounting container
    const handleMouseMove = (event: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);

    let animationFrameId: number;

    // Allocate temporary vectors outside the frame loop to prevent GC thrashing (75,000 allocations/frame -> 0)
    const currentPos = new THREE.Vector3();
    const originalPos = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const mouseLocal = new THREE.Vector3();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Update rotation first, then update matrix world so we can transform mouse coordinates accurately
      points.rotation.y = elapsedTime * 0.04;
      points.rotation.x = Math.sin(elapsedTime * 0.02) * 0.2;
      points.updateMatrixWorld();

      // Scale mouse screen coordinates [-1, 1] to 3D world space at z=0 plane
      mouseLocal.set(mouse.x * 2.8, mouse.y * 2.8, 0);

      // Transform the world mouse position to the local coordinates of the rotated points object
      points.worldToLocal(mouseLocal);

      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        currentPos.set(positions[ix], positions[iy], positions[iz]);
        originalPos.set(originalPositions[ix], originalPositions[iy], originalPositions[iz]);
        velocity.set(velocities[ix], velocities[iy], velocities[iz]);

        const dist = currentPos.distanceTo(mouseLocal);
        if (dist < 1.2) {
          // Interactive displacement
          const force = (1.2 - dist) * 0.008;
          direction.subVectors(currentPos, mouseLocal).normalize();
          velocity.addScaledVector(direction, force);
        }

        // Return pull force to original Torus positions
        direction.subVectors(originalPos, currentPos);
        velocity.addScaledVector(direction, 0.0015);

        // Damping velocity decay
        velocity.multiplyScalar(0.94);

        positions[ix] += velocity.x;
        positions[iy] += velocity.y;
        positions[iz] += velocity.z;

        velocities[ix] = velocity.x;
        velocities[iy] = velocity.y;
        velocities[iz] = velocity.z;
      }
      geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();
      try {
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement);
        }
      } catch (e) {
        // Prevent removal errors if element was already unmounted
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0 opacity-80" />;
};
