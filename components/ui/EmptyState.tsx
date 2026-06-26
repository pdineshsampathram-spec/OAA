"use client";

import { motion } from "framer-motion";
import type { ElementType } from "react";

interface EmptyStateProps {
  icon: ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white/40 backdrop-blur-md rounded-2xl border border-indigo-100/50 shadow-sm max-w-md mx-auto my-8">
      <motion.div
        animate={{
          y: [0, -12, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="p-4 bg-indigo-50 rounded-2xl text-indigo-500 mb-4 border border-indigo-100"
      >
        <Icon className="w-10 h-10" />
      </motion.div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-5 max-w-xs leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAction}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition-colors"
        >
          {actionLabel}
        </motion.button>
      )}
    </div>
  );
}
