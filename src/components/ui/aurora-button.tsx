"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AuroraButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
  glowClassName?: string;
}

export function AuroraButton({
  className,
  children,
  glowClassName,
  ...props
}: AuroraButtonProps) {
  return (
    <div className="relative group inline-flex">
      {/* Glow aura back layer */}
      <div
        className={cn(
          "absolute -inset-[2.5px] rounded-full bg-gradient-to-r from-scope-pink via-scope-purple to-scope-blue opacity-75 blur-md transition-all duration-500",
          "group-hover:opacity-100 group-hover:blur-xl group-hover:-inset-[4px]",
          glowClassName
        )}
      />

      {/* Button foreground */}
      <button
        className={cn(
          "relative rounded-full bg-slate-950 px-5 py-2",
          "text-slate-50 font-medium text-sm shadow-xl",
          "transition-all duration-300 hover:bg-slate-900 active:scale-[0.98]",
          "border border-slate-800/80 cursor-pointer flex items-center justify-center gap-1.5",
          className
        )}
        {...props}
      >
        {children}
      </button>
    </div>
  );
}
