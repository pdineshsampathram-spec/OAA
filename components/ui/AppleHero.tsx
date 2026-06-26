'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface AppleHeroProps {
  title: string;
  subtitle: string;
  className?: string;
}

export const AppleHero = ({ title, subtitle, className }: AppleHeroProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 50]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden',
        className
      )}
    >
      <motion.div
        style={{ opacity, scale, y }}
        className="flex flex-col items-center text-center space-y-6 z-10 px-4"
      >
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl md:text-8xl font-bold tracking-tighter text-black dark:text-white"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-xl md:text-3xl text-neutral-500 font-medium tracking-tight max-w-2xl"
        >
          {subtitle}
        </motion.p>
      </motion.div>
    </div>
  );
};
