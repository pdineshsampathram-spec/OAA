"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Activity, BookOpen, Calendar, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  type: "mark" | "attendance" | "student";
  text: string;
  timestamp: string;
}

interface RecentActivityFeedProps {
  data: ActivityItem[];
}

const typeConfig = {
  mark: {
    icon: BookOpen,
    dotColor: "bg-indigo-500 ring-indigo-500/20",
    iconColor: "text-indigo-500 bg-indigo-50",
  },
  attendance: {
    icon: Calendar,
    dotColor: "bg-emerald-500 ring-emerald-500/20",
    iconColor: "text-emerald-500 bg-emerald-50",
  },
  student: {
    icon: UserPlus,
    dotColor: "bg-amber-500 ring-amber-500/20",
    iconColor: "text-amber-500 bg-amber-50",
  },
};

export default function RecentActivityFeed({ data }: RecentActivityFeedProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  return (
    <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-50 select-none">
        <Activity className="w-5 h-5 text-indigo-500" />
        <h4 className="font-bold text-slate-800 text-sm md:text-base">Recent School Activity</h4>
      </div>

      {/* Feed List */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm gap-2">
          <Activity className="w-8 h-8 text-slate-300 animate-pulse" />
          <p>No recent activity logs available</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-20px" }}
          className="relative pl-6 space-y-6"
        >
          {/* Vertical connection line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100" />

          {data.map((item) => {
            const config = typeConfig[item.type] || typeConfig.student;
            const Icon = config.icon;
            let timeText = item.timestamp;
            try {
              timeText = formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true });
            } catch {
              // fallback if invalid date
            }

            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                className="relative flex items-start gap-4"
              >
                {/* Timeline node */}
                <span className={cn("absolute -left-[20px] top-1 flex h-4 w-4 rounded-full ring-4 bg-white", config.dotColor)}>
                  <span className={cn("rounded-full h-2 w-2 m-auto", config.dotColor.split(" ")[0])} />
                </span>

                {/* Left Icon Wrapper */}
                <div className={cn("p-2 rounded-xl border flex items-center justify-center shrink-0 shadow-sm", config.iconColor)}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Right content text */}
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed break-words">
                    {item.text}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    {timeText}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
