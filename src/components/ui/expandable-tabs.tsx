"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Tab {
  title: string;
  icon: LucideIcon;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  onChange?: (index: number | null) => void;
  selectedIndex?: number | null;
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".5rem",
    paddingRight: ".5rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".5rem" : 0,
    paddingLeft: isSelected ? "1rem" : ".5rem",
    paddingRight: isSelected ? "1rem" : ".5rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.1, type: "spring", bounce: 0, duration: 0.6 };

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-primary",
  onChange,
  selectedIndex,
}: ExpandableTabsProps) {
  const [selected, setSelected] = React.useState<number | null>(null);
  const outsideClickRef = React.useRef(null);

  React.useEffect(() => {
    if (selectedIndex !== undefined) {
      setSelected(selectedIndex);
    }
  }, [selectedIndex]);

  useOnClickOutside(outsideClickRef, () => {
    // If not controlled, clear selection on outside click
    if (selectedIndex === undefined) {
      setSelected(null);
      onChange?.(null);
    }
  });

  const handleSelect = (index: number) => {
    if (selectedIndex === undefined) {
      setSelected(index);
    }
    onChange?.(index);
  };

  const Separator = () => (
    <div className="mx-1 h-[20px] w-[1px] bg-white/20" aria-hidden="true" />
  );

  return (
    <div
      ref={outsideClickRef}
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-full border border-white/45 bg-white/35 backdrop-blur-xl p-1 shadow-[0_8px_32px_rgba(0,0,0,0.05)]",
        className
      )}
      style={{ backdropFilter: 'url("#container-glass")' }}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <Separator key={`separator-${index}`} />;
        }

        const Icon = tab.icon;
        const isSelected = selected === index;

        return (
          <motion.button
            key={tab.title}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={isSelected}
            onClick={() => handleSelect(index)}
            transition={transition}
            className={cn(
              "relative flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-300 cursor-pointer",
              isSelected
                ? cn("bg-white/65 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-white/40", activeColor)
                : "text-muted-foreground hover:bg-white/20 hover:text-foreground"
            )}
          >
            <Icon size={18} strokeWidth={2} />
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="overflow-hidden whitespace-nowrap text-xs pr-1"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
