'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedMetricProps {
  value: number;
  label?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: number; // Positive for up, negative for down
  className?: string;
}

export function AnimatedMetric({
  value,
  label,
  prefix = '',
  suffix = '',
  decimals = 0,
  trend,
  className,
}: AnimatedMetricProps) {
  const [mounted, setMounted] = useState(false);
  const spring = useSpring(0, { mass: 1, stiffness: 50, damping: 15 });
  const display = useTransform(spring, (current) => current.toFixed(decimals));

  useEffect(() => {
    setMounted(true);
    spring.set(value);
  }, [spring, value]);

  return (
    <div className="flex flex-col gap-1 items-center justify-center">
      {label && <span className="text-sm font-medium text-neutral-500">{label}</span>}
      <div className="flex items-baseline gap-2">
        <span className={className || "text-3xl font-bold tracking-tight text-neutral-900 dark:text-white"}>
          {prefix}
          {mounted ? <motion.span>{display}</motion.span> : value.toFixed(decimals)}
          {suffix}
        </span>
        
        {trend !== undefined && (
          <span
            className={`text-sm font-medium ${
              trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-rose-500' : 'text-neutral-500'
            }`}
          >
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}
