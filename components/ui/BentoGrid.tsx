import { cn } from '@/lib/utils';
import { GlassCard } from './GlassCard';

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        'grid md:auto-rows-[22rem] grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  colSpan = 1,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  colSpan?: number;
}) => {
  return (
    <GlassCard
      className={cn(
        'group/bento flex flex-col justify-between space-y-4',
        colSpan === 2 && 'md:col-span-2',
        colSpan === 3 && 'md:col-span-3',
        className
      )}
      padding="none"
    >
      <div className="flex flex-col h-full">
        {header && (
          <div className="w-full h-[55%] min-h-[10rem] bg-black/[0.02] dark:bg-white/[0.02] rounded-t-[32px] overflow-hidden relative">
            {header}
          </div>
        )}
        <div className="flex flex-col p-8 flex-1 justify-center transition duration-500 group-hover/bento:translate-x-1">
          {icon}
          <div className="font-semibold text-2xl tracking-tight text-neutral-900 dark:text-neutral-100 mb-2 mt-2">
            {title}
          </div>
          <div className="font-medium text-neutral-500 tracking-tight leading-relaxed">
            {description}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
