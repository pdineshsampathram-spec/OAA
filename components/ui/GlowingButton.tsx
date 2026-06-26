'use client';

import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlowingButtonProps extends HTMLMotionProps<"button"> {
  glowColor?: 'blue' | 'purple' | 'green';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

export function GlowingButton({
  className,
  glowColor = 'blue',
  size = 'md',
  children,
  ...props
}: GlowingButtonProps) {
  const glowStyles = {
    blue: 'hover:shadow-[0_0_20px_rgba(0,112,243,0.5)] border-blue-500/50',
    purple: 'hover:shadow-[0_0_20px_rgba(138,43,226,0.5)] border-purple-500/50',
    green: 'hover:shadow-[0_0_20px_rgba(0,255,163,0.5)] border-emerald-500/50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2 text-base',
    lg: 'px-8 py-3 text-lg font-medium',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative overflow-hidden rounded-lg bg-black/60 backdrop-blur-md',
        'border text-white transition-all duration-300',
        glowStyles[glowColor],
        sizes[size],
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 transition-opacity duration-300 hover:opacity-100" />
    </motion.button>
  );
}
