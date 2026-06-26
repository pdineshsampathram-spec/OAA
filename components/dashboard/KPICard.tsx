"use client";

import { useEffect, useState } from "react";
import { motion, animate } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: number;
  color: "indigo" | "emerald" | "amber" | "rose";
  index: number;
}

const colorMap = {
  indigo: {
    iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100/50",
    ring: "hover:ring-indigo-500/10",
  },
  emerald: {
    iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100/50",
    ring: "hover:ring-emerald-500/10",
  },
  amber: {
    iconBg: "bg-amber-50 text-amber-600 border-amber-100/50",
    ring: "hover:ring-amber-500/10",
  },
  rose: {
    iconBg: "bg-rose-50 text-rose-600 border-rose-100/50",
    ring: "hover:ring-rose-500/10",
  },
};

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
  index,
}: KPICardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const colors = colorMap[color] || colorMap.indigo;

  const valueStr = value.toString();
  const numericVal = parseFloat(valueStr.replace(/[^0-9.]/g, ""));
  const isPercent = valueStr.endsWith("%");

  useEffect(() => {
    if (isNaN(numericVal)) return;

    const controls = animate(0, numericVal, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate(latest) {
        setDisplayValue(latest);
      },
    });

    return () => controls.stop();
  }, [numericVal]);

  const formattedValue = () => {
    if (isNaN(numericVal)) {
      return valueStr;
    }
    if (isPercent) {
      return `${displayValue.toFixed(1)}%`;
    }
    if (valueStr.includes(".")) {
      return displayValue.toFixed(1);
    }
    return Math.round(displayValue).toLocaleString();
  };

  const isPositive = trend >= 0;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut" as const,
      },
    }),
  };

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        "backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 transition-all duration-300",
        colors.ring
      )}
    >
      <div className="flex items-start justify-between">
        {/* Title & Info */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            {title}
          </span>
          <h3 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {formattedValue()}
          </h3>
        </div>

        {/* Icon wrapper */}
        <div className={cn("p-4 rounded-2xl border flex items-center justify-center", colors.iconBg)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-black/5 dark:border-white/5">
        {/* Trend Indicator */}
        <span
          className={cn(
            "inline-flex items-center text-xs font-bold px-2 py-1 rounded-lg select-none",
            isPositive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
          )}
          {Math.abs(trend).toFixed(1)}%
        </span>
        <span className="text-sm font-medium text-neutral-500 whitespace-normal line-clamp-2 leading-tight">{subtitle}</span>
      </div>
    </motion.div>
  );
}
