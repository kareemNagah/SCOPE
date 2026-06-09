"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimelineItem {
  id: number;
  originalId: string; // Used to map to backend and Studio selection ID
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
  selectedNodeId?: string | null;
  onNodeSelect?: (id: string | null) => void;
}

export default function RadialOrbitalTimeline({
  timelineData,
  selectedNodeId = null,
  onNodeSelect,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [viewMode] = useState<"orbital">("orbital");
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Synchronize internal node selection with the parent route selection state
  useEffect(() => {
    if (selectedNodeId) {
      const match = timelineData.find((item) => item.originalId === selectedNodeId);
      if (match) {
        setExpandedItems({ [match.id]: true });
        setActiveNodeId(match.id);
        setAutoRotate(false);

        // Compute related pulsing connections
        const relatedItems = match.relatedIds;
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);

        // Center on node angle
        const nodeIndex = timelineData.findIndex((item) => item.id === match.id);
        if (nodeIndex >= 0) {
          const totalNodes = timelineData.length;
          const targetAngle = (nodeIndex / totalNodes) * 360;
          setRotationAngle(270 - targetAngle);
        }
      }
    } else {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  }, [selectedNodeId, timelineData]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      onNodeSelect?.(null);
    }
  };

  const toggleItem = (id: number) => {
    const item = timelineData.find((it) => it.id === id);
    if (!item) return;

    const isCurrentlyExpanded = expandedItems[id];
    if (isCurrentlyExpanded) {
      onNodeSelect?.(null);
    } else {
      onNodeSelect?.(item.originalId);
    }
  };

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;

    if (autoRotate && viewMode === "orbital") {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, viewMode]);

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 200;
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.4,
      Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-white bg-emerald-600/80 border-emerald-500/50";
      case "in-progress":
        return "text-white bg-white/15 border-white/20";
      case "pending":
        return "text-slate-400 bg-white/5 border-white/10";
      default:
        return "text-slate-400 bg-white/5 border-white/10";
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center bg-transparent overflow-hidden select-none"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-4xl h-[560px] flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Centered Sun/Logo node with branding colors */}
          <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-scope-purple via-scope-violet to-scope-blue animate-pulse flex items-center justify-center z-10 shadow-[0_0_40px_rgba(139,92,246,0.4)]">
            <div className="absolute w-20 h-20 rounded-full border border-scope-purple/30 animate-ping opacity-70"></div>
            <div
              className="absolute w-24 h-24 rounded-full border border-scope-blue/20 animate-ping opacity-50"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
          </div>

          {/* Orbital circle */}
          <div className="absolute w-[400px] h-[400px] rounded-full border border-dashed border-white/10 pointer-events-none"></div>

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = activeNodeId !== null && item.id !== activeNodeId && item.relatedIds.includes(activeNodeId);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => (nodeRefs.current[item.id] = el)}
                className="absolute transition-all duration-700 cursor-pointer flex flex-col items-center justify-center"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                {/* Glow ring under node */}
                <div
                  className={`absolute rounded-full -inset-1 ${
                    isPulsing ? "animate-pulse duration-1000" : ""
                  }`}
                  style={{
                    background: `radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0) 70%)`,
                    width: `${item.energy * 0.5 + 40}px`,
                    height: `${item.energy * 0.5 + 40}px`,
                    left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                    top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                  }}
                ></div>

                {/* Node icon wrapper */}
                <div
                  className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${
                    isExpanded
                      ? "bg-white text-slate-950"
                      : isRelated
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-white/80 border-white/10"
                  }
                  border-2 
                  ${
                    isExpanded
                      ? "border-scope-purple shadow-[0_0_20px_rgba(139,92,246,0.5)] scale-125"
                      : isRelated
                      ? "border-scope-blue/50 animate-pulse"
                      : "border-white/15"
                  }
                  transition-all duration-300 transform hover:scale-110
                `}
                >
                  <Icon size={16} />
                </div>

                {/* Label text */}
                <div
                  className={`
                  absolute top-12 whitespace-nowrap
                  text-[11px] font-semibold tracking-wider uppercase
                  transition-all duration-300
                  ${isExpanded ? "text-white scale-110" : "text-white/50"}
                `}
                >
                  {item.title}
                </div>

                {isExpanded && (
                  <Card className="absolute top-20 left-1/2 -translate-x-1/2 w-64 bg-slate-900/95 backdrop-blur-md border border-white/15 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] overflow-visible p-0">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-white/20"></div>
                    <CardHeader className="pb-2 p-4">
                      <div className="flex justify-between items-center">
                        <Badge
                          variant="outline"
                          className={`px-2 py-0.5 text-[9px] uppercase tracking-wider ${getStatusStyles(
                            item.status
                          )}`}
                        >
                          {item.status === "completed"
                            ? "COMPLETE"
                            : item.status === "in-progress"
                            ? "IN PROGRESS"
                            : "PENDING"}
                        </Badge>
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.date}
                        </span>
                      </div>
                      <CardTitle className="text-sm font-semibold text-white mt-2">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-[12px] text-white/70 leading-normal p-4 pt-0">
                      <p>{item.content}</p>

                      {/* Progress Energy bar */}
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-[10px] uppercase font-semibold text-white/50 mb-1">
                          <span className="flex items-center">
                            <Zap size={10} className="mr-1 text-amber-500 fill-amber-500" />
                            Strength
                          </span>
                          <span className="font-mono">{item.energy}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-scope-pink to-scope-blue"
                            style={{ width: `${item.energy}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Connected Nodes */}
                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center mb-2">
                            <Link size={10} className="text-white/40 mr-1" />
                            <h4 className="text-[9px] uppercase tracking-wider font-bold text-white/40">
                              Connected Pillars
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find(
                                (i) => i.id === relatedId
                              );
                              return (
                                <Button
                                  key={relatedId}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center h-6 px-2.5 py-0 text-[10px] rounded-full border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all font-medium"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(relatedId);
                                  }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight
                                    size={8}
                                    className="ml-1 text-white/40"
                                  />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
