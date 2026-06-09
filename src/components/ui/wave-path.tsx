"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type WavePathProps = React.ComponentProps<"div"> & {
  /**
   * Wave amplitude in pixels at the control point. Defaults to 60.
   */
  amplitude?: number;
  /**
   * Base Y offset of the wave. Defaults to 50.
   */
  baseY?: number;
  /**
   * Stroke color override. Defaults to currentColor.
   */
  strokeColor?: string;
  /**
   * Disable the pointer interaction (purely decorative).
   */
  static?: boolean;
  /**
   * Auto-animate the wave on mount even without pointer input.
   */
  auto?: boolean;
};

export function WavePath({
  className,
  amplitude = 60,
  baseY = 50,
  strokeColor,
  static: isStatic = false,
  auto = false,
  ...props
}: WavePathProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pathRef = React.useRef<SVGPathElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const stateRef = React.useRef({
    progress: 0,
    x: 0.5,
    time: Math.PI / 2,
    targetX: 0.5,
    targetProgress: 0,
  });
  const [width, setWidth] = React.useState(0);
  const [height] = React.useState(baseY * 2 + amplitude * 1.4);
  const reducedMotion = React.useRef(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  React.useEffect(() => {
    const el = pathRef.current?.parentElement?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const setPath = React.useCallback(
    (progress: number, xPos: number) => {
      const node = pathRef.current;
      if (!node || width === 0) return;
      const peak = 100 + progress * 0.4;
      const cpX = width * xPos;
      const cpY = peak;
      const d = `M0 100 Q${cpX} ${cpY}, ${width} 100`;
      node.setAttribute("d", d);
    },
    [width],
  );

  React.useEffect(() => {
    if (isStatic) {
      setPath(amplitude, 0.5);
      return;
    }
    setPath(0, 0.5);
  }, [isStatic, amplitude, setPath]);

  React.useEffect(() => {
    if (isStatic || reducedMotion.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      s.x += (s.targetX - s.x) * 0.12;
      s.progress += (s.targetProgress - s.progress) * 0.12;
      if (auto) {
        s.targetX = 0.5 + Math.sin(now * 0.0006) * 0.35;
        s.targetProgress = Math.sin(now * 0.001) * amplitude * 0.4;
      } else {
        s.targetProgress *= 0.985;
        if (Math.abs(s.targetProgress) < 0.4) s.targetProgress = 0;
      }
      setPath(s.progress, s.x);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [auto, isStatic, amplitude, setPath]);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isStatic || reducedMotion.current) return;
    const node = containerRef.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    if (bounds.width === 0) return;
    const s = stateRef.current;
    s.targetX = Math.min(1, Math.max(0, (e.clientX - bounds.left) / bounds.width));
    s.targetProgress = Math.min(amplitude, Math.max(-amplitude, -e.movementY * 1.4));
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full select-none", className)}
      style={{ height }}
      onPointerMove={handleMove}
      {...props}
    >
      <svg
        className="absolute inset-x-0 top-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${Math.max(1, width)} 200`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          ref={pathRef}
          className="fill-none"
          stroke={strokeColor ?? "currentColor"}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeOpacity={0.6}
        />
      </svg>
    </div>
  );
}
