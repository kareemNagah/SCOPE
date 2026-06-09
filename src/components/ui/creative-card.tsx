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
  contextLabel = "Type your creative idea here...✨",
  placeholder = "Type your creative idea here...✨",
}: CreativeCardProps) {
  return (
    <div className="flex flex-col items-center mx-auto w-full">
      <div className="relative flex flex-col rounded-2xl p-[2px] overflow-hidden w-full">
        {/* Glow effect */}
        <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-gradient-radial from-white via-white/30 via-white/10 to-transparent blur-sm"></div>

        {/* Chat Box */}
        <div className="flex flex-col dark:bg-black/50 bg-white/20 rounded-xl w-full overflow-hidden border border-gray-200 dark:border-gray-800">
          {contextLabel && (
            <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
              className="bg-transparent rounded-xl w-full h-14 text-gray-900 dark:text-white font-sans text-sm font-medium p-3 resize-none outline-none placeholder-gray-600 dark:placeholder-gray-400 scrollbar-thin scrollbar-thumb-gray-500 dark:scrollbar-thumb-gray-700 scrollbar-thumb-rounded hover:scrollbar-thumb-gray-700 transition-all"
            />
          </div>

          {/* Options */}
          <div className="flex justify-between items-end p-3">
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => onAction?.('image')}
                className="flex text-black/20 dark:text-white/20 bg-transparent border-none cursor-pointer transition-all duration-300 hover:text-black dark:hover:text-white hover:-translate-y-1"
              >
                <Image size={20} />
              </button>
              <button 
                type="button"
                onClick={() => onAction?.('analyze')}
                className="flex text-black/20 dark:text-white/20 bg-transparent border-none cursor-pointer transition-all duration-300 hover:text-black dark:hover:text-white hover:-translate-y-1"
              >
                <BarChart2 size={20} />
              </button>
              <button 
                type="button"
                onClick={() => onAction?.('options')}
                className="flex text-black/20 dark:text-white/20 bg-transparent border-none cursor-pointer transition-all duration-300 hover:text-black dark:hover:text-white hover:-translate-y-1"
              >
                <MoreHorizontal size={20} />
              </button>
            </div>

            {/* Submit */}
            <button 
              type="button"
              onClick={onSend}
              disabled={disabled || loading || !value.trim()}
              className="flex p-1 bg-gradient-to-t dark:from-gray-800 dark:via-gray-600 dark:to-gray-800 from-gray-400 via-gray-300 to-gray-500 rounded-lg shadow-inner border-none outline-none cursor-pointer transition-all duration-150 active:scale-95 disabled:opacity-40"
            >
              <i className="w-8 h-8 p-2 dark:bg-black/10 bg-white/20 rounded-lg backdrop-blur-sm text-gray-500 dark:text-gray-400 flex items-center justify-center">
                {loading ? (
                  <Loader2 size={20} className="animate-spin text-gray-100" />
                ) : (
                  <Send size={20} className="transition-all duration-300 hover:text-gray-100 dark:hover:text-white hover:drop-shadow-[0_0_5px_#fff]" />
                )}
              </i>
            </button>
          </div>
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-gray-900 dark:text-white text-xs py-3">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                onClick={() => onTagClick?.(tag)}
                className="px-2 py-1 bg-white dark:bg-black border border-gray-300 dark:border-gray-800 rounded-lg cursor-pointer select-none transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
