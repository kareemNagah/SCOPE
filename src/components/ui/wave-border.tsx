"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type WaveBorderTone = "violet" | "pink" | "blue" | "orange" | "mute";

type WaveBorderProps = React.ComponentProps<"div"> & {
  tone?: WaveBorderTone;
  /**
   * Disable the pointer interaction (purely decorative breathing).
   */
  static?: boolean;
  /**
   * Disable any motion and render a soft static outline.
   */
  inert?: boolean;
  /**
   * Distance from the actual edge to draw the stroke. Lower = closer to content.
   */
  inset?: number;
  /**
   * Stroke opacity. Defaults to 0.55.
   */
  opacity?: number;
};

const TONE_STROKE: Record<WaveBorderTone, string> = {
  violet: "var(--scope-violet)",
  pink: "var(--scope-pink)",
  blue: "var(--scope-blue)",
  orange: "var(--scope-orange)",
  mute: "var(--foreground)",
};

export function WaveBorder({
  className,
  children,
  tone = "violet",
  static: isStatic = false,
  inert = false,
  inset = 0,
  opacity = 0.55,
  ...props
}: WaveBorderProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const pathRef = React.useRef<SVGPathElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const stateRef = React.useRef({
    width: 0,
    height: 0,
    radius: 18,
    pointer: { x: 0.5, y: 0.5, active: 0 },
    phase: 0,
  });
  const [, force] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      stateRef.current.width = r.width;
      stateRef.current.height = r.height;
      stateRef.current.radius = parseFloat(cs.borderRadius) || 18;
      force();
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    stateRef.current.width = r.width;
    stateRef.current.height = r.height;
    stateRef.current.radius = parseFloat(cs.borderRadius) || 18;
    force();
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (inert) return;
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      s.phase += dt * 0.9;
      if (!isStatic) {
        s.pointer.active *= 0.96;
      }
      const node = pathRef.current;
      if (node && s.width > 0 && s.height > 0) {
        node.setAttribute("d", buildPerimeterPath(s, inset));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [inset, isStatic, inert]);

  React.useEffect(() => {
    if (inert) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const s = stateRef.current;
      const localX = (e.clientX - r.left) / r.width;
      const localY = (e.clientY - r.top) / r.height;
      s.pointer.x = Math.min(1.2, Math.max(-0.2, localX));
      s.pointer.y = Math.min(1.2, Math.max(-0.2, localY));
      s.pointer.active = 1;
    };
    const onLeave = () => {
      stateRef.current.pointer.active = 0;
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [inert]);

  const { width, height } = stateRef.current;

  return (
    <div ref={ref} className={cn("relative isolate", className)} {...props}>
      {width > 0 && height > 0 ? (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <path
            ref={pathRef}
            className="fill-none"
            stroke={TONE_STROKE[tone]}
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeOpacity={opacity}
          />
        </svg>
      ) : null}
      <div className="relative z-[2] h-full w-full">{children}</div>
    </div>
  );
}

type PerimeterState = {
  width: number;
  height: number;
  radius: number;
  pointer: { x: number; y: number; active: number };
  phase: number;
};

function buildPerimeterPath(s: PerimeterState, inset: number) {
  if (s.width <= 0 || s.height <= 0) return "";
  const w = s.width;
  const h = s.height;
  
  const x_min = inset;
  const x_max = w - inset;
  const y_min = inset;
  const y_max = h - inset;
  
  const W = x_max - x_min;
  const H = y_max - y_min;
  
  const r = Math.max(4, Math.min(s.radius - inset, W / 2, H / 2));
  
  const L1 = W - 2 * r; // top straight
  const L2 = r * Math.PI / 2; // top-right arc
  const L3 = H - 2 * r; // right straight
  const L4 = r * Math.PI / 2; // bottom-right arc
  const L5 = W - 2 * r; // bottom straight
  const L6 = r * Math.PI / 2; // bottom-left arc
  const L7 = H - 2 * r; // left straight
  const L8 = r * Math.PI / 2; // top-left arc
  
  const P = L1 + L2 + L3 + L4 + L5 + L6 + L7 + L8;
  const amp = 1.6 + s.pointer.active * 3.5;
  const segments = 64; // smooth and robust loop
  const points: [number, number][] = [];
  
  for (let i = 0; i < segments; i++) {
    const distOnPerimeter = (i / segments) * P;
    const pt = getPointAtPerimeter(distOnPerimeter, s, inset, W, H, r, L1, L2, L3, L4, L5, L6, L7, L8);
    
    const t = i / segments;
    const wavePhase = s.phase + t * Math.PI * 6; // periodic wave (3 cycles)
    const wave = Math.sin(wavePhase) * amp;
    
    let pull = 0;
    if (s.pointer.active > 0) {
      const px = s.pointer.x * w;
      const py = s.pointer.y * h;
      
      const dx = px - pt.x;
      const dy = py - pt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // dot product with unit normal vector
      const dot = dx * pt.nx + dy * pt.ny;
      
      // pull active pointer towards the border outline dynamically
      const influence = Math.exp(-Math.pow(dist / 50, 2));
      pull = dot * influence * 0.3 * s.pointer.active;
      
      const maxPull = 12;
      if (pull > maxPull) pull = maxPull;
      if (pull < -maxPull) pull = -maxPull;
    }
    
    const xFinal = pt.x + pt.nx * (wave + pull);
    const yFinal = pt.y + pt.ny * (wave + pull);
    points.push([xFinal, yFinal]);
  }
  
  return chainPath(points, true);
}

function getPointAtPerimeter(
  d: number,
  s: PerimeterState,
  inset: number,
  W: number,
  H: number,
  r: number,
  L1: number,
  L2: number,
  L3: number,
  L4: number,
  L5: number,
  L6: number,
  L7: number,
  L8: number
) {
  const w = s.width;
  const h = s.height;
  const x_min = inset;
  const x_max = w - inset;
  const y_min = inset;
  const y_max = h - inset;
  
  const C1 = L1;
  const C2 = C1 + L2;
  const C3 = C2 + L3;
  const C4 = C3 + L4;
  const C5 = C4 + L5;
  const C6 = C5 + L6;
  const C7 = C6 + L7;
  
  if (d < C1) {
    const ratio = d / L1;
    const x = x_min + r + ratio * (W - 2 * r);
    const y = y_min;
    return { x, y, nx: 0, ny: -1 };
  } else if (d < C2) {
    const ratio = (d - C1) / L2;
    const angle = -Math.PI / 2 + ratio * (Math.PI / 2);
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const x = x_max - r + nx * r;
    const y = y_min + r + ny * r;
    return { x, y, nx, ny };
  } else if (d < C3) {
    const ratio = (d - C2) / L3;
    const x = x_max;
    const y = y_min + r + ratio * (H - 2 * r);
    return { x, y, nx: 1, ny: 0 };
  } else if (d < C4) {
    const ratio = (d - C3) / L4;
    const angle = ratio * (Math.PI / 2);
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const x = x_max - r + nx * r;
    const y = y_max - r + ny * r;
    return { x, y, nx, ny };
  } else if (d < C5) {
    const ratio = (d - C4) / L5;
    const x = x_max - r - ratio * (W - 2 * r);
    const y = y_max;
    return { x, y, nx: 0, ny: 1 };
  } else if (d < C6) {
    const ratio = (d - C5) / L6;
    const angle = Math.PI / 2 + ratio * (Math.PI / 2);
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const x = x_min + r + nx * r;
    const y = y_max - r + ny * r;
    return { x, y, nx, ny };
  } else if (d < C7) {
    const ratio = (d - C6) / L7;
    const x = x_min;
    const y = y_max - r - ratio * (H - 2 * r);
    return { x, y, nx: -1, ny: 0 };
  } else {
    const ratio = Math.min(1.0, (d - C7) / L8);
    const angle = Math.PI + ratio * (Math.PI / 2);
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const x = x_min + r + nx * r;
    const y = y_min + r + ny * r;
    return { x, y, nx, ny };
  }
}

function chainPath(points: [number, number][], close: boolean) {
  if (points.length === 0) return "";
  const N = points.length;
  if (!close || N < 3) {
    const first = points[0];
    let d = `M${first[0].toFixed(2)} ${first[1].toFixed(2)}`;
    for (let i = 1; i < N; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const mx = (prev[0] + cur[0]) / 2;
      const my = (prev[1] + cur[1]) / 2;
      d += ` Q${prev[0].toFixed(2)} ${prev[1].toFixed(2)}, ${mx.toFixed(2)} ${my.toFixed(2)}`;
    }
    const last = points[N - 1];
    d += ` L${last[0].toFixed(2)} ${last[1].toFixed(2)}`;
    return d;
  }
  
  const lastPoint = points[N - 1];
  const firstPoint = points[0];
  const startX = (lastPoint[0] + firstPoint[0]) / 2;
  const startY = (lastPoint[1] + firstPoint[1]) / 2;
  
  let d = `M${startX.toFixed(2)} ${startY.toFixed(2)}`;
  for (let i = 0; i < N; i++) {
    const cur = points[i];
    const next = points[(i + 1) % N];
    const mx = (cur[0] + next[0]) / 2;
    const my = (cur[1] + next[1]) / 2;
    d += ` Q${cur[0].toFixed(2)} ${cur[1].toFixed(2)}, ${mx.toFixed(2)} ${my.toFixed(2)}`;
  }
  d += " Z";
  return d;
}
