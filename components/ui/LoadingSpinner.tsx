"use client";

import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
}

const sizeClasses = {
  sm: "w-5 h-5 border-2",
  md: "w-8 h-8 border-3",
  lg: "w-12 h-12 border-4",
};

export default function LoadingSpinner({ size = "md", color = "border-indigo-600" }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 0.8,
        }}
        className={`${sizeClasses[size]} rounded-full border-t-transparent ${color}`}
        style={{ borderRightColor: "transparent" }}
        role="status"
        aria-label="loading"
      />
    </div>
  );
}
