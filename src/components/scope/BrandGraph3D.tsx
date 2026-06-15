import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import { useRef, useState, Suspense } from "react";
import * as THREE from "three";

export type Node3D = {
  id: string;
  title: string;
  value: string;
  position: [number, number, number];
  color: string;
};

const PALETTE = ["#9F7AEA", "#6B46C1", "#4299E1", "#ED64A6", "#ED8936", "#7C3AED"];
const CANONICAL_NODE_TITLES: Record<string, string> = {
  mission: "Mission",
  vision: "Vision",
  persona: "Target Persona",
  values: "Core Values",
  tone: "Voice & Tone",
  positioning: "Brand Promise",
};

import type { BrandNode } from "@/lib/api";

export const initialNodes3D: Node3D[] = [
  { id: "mission",  title: "Mission",  value: "Equip corporate athletes with regenerative gear.",     position: [ 0,  2.4,  0],  color: PALETTE[0] },
  { id: "vision",   title: "Vision",   value: "Make sustainability the default in performance wear.", position: [ 2.4, 1.0,  0.6], color: PALETTE[1] },
  { id: "persona",  title: "Persona",  value: "Urban women 25–35, corporate athletes.",               position: [ 2.0,-1.4, -0.8], color: PALETTE[2] },
  { id: "voice",    title: "Voice",    value: "Calm, confident, technical.",                          position: [ 0, -2.4,  0.4], color: PALETTE[3] },
  { id: "values",   title: "Values",   value: "Honesty · Craft · Longevity.",                         position: [-2.0,-1.4,  0.8], color: PALETTE[4] },
  { id: "promise",  title: "Promise",  value: "Built to last. Designed to disappear.",                position: [-2.4, 1.0, -0.6], color: PALETTE[5] },
];

export function backendNodesToGraph(nodes: BrandNode[]): Node3D[] {
  return nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const radius = 2.4;
    // Distribute nodes in a circle, with some z-variation
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = (i % 2 === 0 ? 1 : -1) * (0.4 + (i * 0.1));
    
    return {
      id: `${n.type}-${i}`,
      title: CANONICAL_NODE_TITLES[n.type] ?? n.title,
      value: n.content,
      position: [x, y, z],
      color: PALETTE[i % PALETTE.length],
    };
  });
}

function CoreSphere() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.3;
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.9, 1]} />
      <meshStandardMaterial
        color="#6B46C1"
        emissive="#9F7AEA"
        emissiveIntensity={0.7}
        roughness={0.3}
        metalness={0.6}
        wireframe
      />
      <Html center distanceFactor={8} zIndexRange={[10, 0]}>
        <div className="pointer-events-none select-none text-center text-white">
          <p className="text-[9px] uppercase tracking-[0.2em] opacity-70">Core</p>
          <p className="font-display text-sm leading-tight">Brand DNA</p>
        </div>
      </Html>
    </mesh>
  );
}

function NodeMesh({
  node,
  selected,
  onSelect,
}: {
  node: Node3D;
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // gentle float
    ref.current.position.set(
      node.position[0],
      node.position[1] + Math.sin(t * 0.8 + node.position[0]) * 0.08,
      node.position[2],
    );
  });
  return (
    <group>
      <Line
        points={[[0, 0, 0], node.position]}
        color={node.color}
        lineWidth={selected ? 2 : 1}
        dashed
        dashSize={0.15}
        gapSize={0.15}
        transparent
        opacity={0.7}
      />
      <mesh
        ref={ref}
        position={node.position}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        scale={selected ? 1.25 : hover ? 1.12 : 1}
      >
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={selected ? 0.9 : 0.45}
          roughness={0.35}
          metalness={0.5}
        />
        <Html center distanceFactor={9} zIndexRange={[20, 10]}>
          <div className="pointer-events-none -translate-y-12 whitespace-nowrap rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-foreground shadow-sm backdrop-blur">
            {node.title}
          </div>
        </Html>
      </mesh>
    </group>
  );
}

export function BrandGraph3D({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: Node3D[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 7], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "radial-gradient(ellipse at 30% 30%, rgba(159,122,234,0.25), rgba(15,8,30,0.95) 70%)" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1.2} color="#ED64A6" />
        <pointLight position={[-5, -3, 4]} intensity={1} color="#4299E1" />
        <CoreSphere />
        {nodes.map((n) => (
          <NodeMesh
            key={n.id}
            node={n}
            selected={selectedId === n.id}
            onSelect={() => onSelect(n.id)}
          />
        ))}
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={4}
          maxDistance={12}
          autoRotate
          autoRotateSpeed={0.35}
        />
      </Suspense>
    </Canvas>
  );
}
