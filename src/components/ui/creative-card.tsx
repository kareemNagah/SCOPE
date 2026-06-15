import React from "react";
import { Image, BarChart2, MoreHorizontal, Send, Loader2 } from "lucide-react";

export type CreativeCardAction = "image" | "analyze" | "options";

export interface CreativeCardProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onAction?: (action: CreativeCardAction) => void;
  onTagClick?: (tag: string) => void;
  tags?: string[];
  loading?: boolean;
  disabled?: boolean;
  contextLabel?: string;
  placeholder?: string;
}

export function CreativeCard({
  value,
  onChange,
  onSend,
  onAction,
  onTagClick,
  tags = [],
  loading = false,
  disabled = false,
  contextLabel,
  placeholder = "Type your creative idea here...",
}: CreativeCardProps) {
  return (
    <div className="w-full">
      <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 focus-within:border-slate-700/80 transition-all duration-200 overflow-hidden backdrop-blur-sm">
        {contextLabel && (
          <div className="px-3.5 pt-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {contextLabel}
          </div>
        )}
        <div className="relative flex">
          <textarea
            id="chat_bot"
            name="chat_bot"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (value.trim() && !disabled && !loading) {
                  onSend();
                }
              }
            }}
            disabled={disabled || loading}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none bg-transparent px-3.5 py-2.5 text-[13px] text-slate-100 outline-none placeholder:text-slate-500 overflow-hidden"
            style={{ minHeight: "42px", maxHeight: "96px" }}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3.5 pb-2.5">
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => onAction?.("image")}
              className="cursor-pointer text-slate-500 transition-colors duration-200 hover:text-slate-300"
              title="Attach image"
            >
              <Image size={15} />
            </button>
            <button
              type="button"
              onClick={() => onAction?.("analyze")}
              className="cursor-pointer text-slate-500 transition-colors duration-200 hover:text-slate-300"
              title="Analyze"
            >
              <BarChart2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => onAction?.("options")}
              className="cursor-pointer text-slate-500 transition-colors duration-200 hover:text-slate-300"
              title="More options"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={onSend}
            disabled={disabled || loading || !value.trim()}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white text-slate-950 shadow-sm transition-all duration-200 hover:bg-slate-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
          </button>
        </div>
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 text-[11px]">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              onClick={() => onTagClick?.(tag)}
              className="cursor-pointer rounded-full border border-slate-800 bg-slate-900/40 px-2 py-0.5 text-slate-400 transition-colors duration-200 hover:border-slate-700 hover:text-slate-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
