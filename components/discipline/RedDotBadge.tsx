"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RedDotBadgeProps {
  dotCount: number;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { dot: "w-2.5 h-2.5", gap: "gap-1.5", text: "text-[10px]" },
  md: { dot: "w-3.5 h-3.5", gap: "gap-2", text: "text-xs" },
  lg: { dot: "w-5 h-5", gap: "gap-2.5", text: "text-sm" },
};

function getStatusLabel(count: number): { label: string; color: string } {
  if (count === 0) return { label: "All Clear", color: "text-emerald-600" };
  if (count <= 2) return { label: "Warning Issued", color: "text-amber-600" };
  if (count <= 4) return { label: "Hearing Scheduled", color: "text-orange-600" };
  return { label: "Account Locked", color: "text-rose-600" };
}

export default function RedDotBadge({ dotCount, size = "md" }: RedDotBadgeProps) {
  const s = sizeMap[size];
  const status = getStatusLabel(dotCount);
  const maxDots = 5;

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
        dotCount >= 5
          ? "border-rose-300 bg-rose-50/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
          : "border-slate-200 bg-white"
      )}
    >
      <div className={cn("flex items-center", s.gap)}>
        {Array.from({ length: maxDots }).map((_, i) => {
          const isActive = i < dotCount;
          return (
            <motion.div
              key={i}
              initial={isActive ? { scale: 0 } : {}}
              animate={isActive ? { scale: 1 } : {}}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 15 }}
              className="relative"
            >
              {isActive && (
                <motion.span
                  animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  className={cn("absolute inset-0 rounded-full bg-rose-500", s.dot)}
                />
              )}
              <span
                className={cn(
                  "block rounded-full",
                  s.dot,
                  isActive
                    ? "bg-rose-500 shadow-lg shadow-rose-500/30"
                    : "bg-slate-200"
                )}
              />
            </motion.div>
          );
        })}
      </div>
      <span className={cn("font-bold", s.text, status.color)}>
        {status.label}
      </span>
    </div>
  );
}
