import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: 'apple-light' | 'apple-dark' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'apple-light', padding = 'lg', children, ...props }, ref) => {
    const variants = {
      'apple-light': 'bg-white/70 border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
      'apple-dark': 'bg-[#1d1d1f]/70 border border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.12)]',
      'glass': 'bg-white/40 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-lg',
    };

    const paddings = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-12',
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          'backdrop-blur-2xl rounded-[32px] overflow-hidden transition-all duration-500',
          variants[variant],
          paddings[padding],
          className
        )}
        whileHover={{ scale: 1.01, y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        {...props}
      >
        {children as React.ReactNode}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
