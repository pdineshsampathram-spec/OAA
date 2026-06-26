"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  role: "admin" | "teacher" | "principal" | string;
  className?: string;
}

export default function RoleBadge({ role, className }: RoleBadgeProps) {
  const normalizedRole = role.toLowerCase();

  const config = {
    admin: {
      label: "Admin",
      bgClass: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      dotClass: "bg-indigo-400",
    },
    teacher: {
      label: "Teacher",
      bgClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      dotClass: "bg-emerald-400",
    },
    principal: {
      label: "Principal",
      bgClass: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      dotClass: "bg-amber-400",
    },
  };

  const currentConfig = config[normalizedRole as keyof typeof config] || {
    label: role,
    bgClass: "bg-slate-500/10 border-slate-500/20 text-slate-400",
    dotClass: "bg-slate-400",
  };

  const isAdmin = normalizedRole === "admin";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold select-none",
        currentConfig.bgClass,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {isAdmin && (
          <motion.span
            className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", currentConfig.dotClass)}
            animate={{
              scale: [1, 2, 1],
              opacity: [0.75, 0, 0.75],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut" as const,
            }}
          />
        )}
        <span className={cn("relative inline-flex rounded-full h-2 w-2", currentConfig.dotClass)} />
      </span>
      <span>{currentConfig.label}</span>
    </div>
  );
}
