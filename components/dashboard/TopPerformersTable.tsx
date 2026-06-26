"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { getInitials, getRiskColor } from "@/lib/utils";
import { Trophy, Star } from "lucide-react";

interface TopPerformer {
  id: string;
  name: string;
  class: string;
  section: string;
  avgMarks: number;
}

interface TopPerformersTableProps {
  data: TopPerformer[];
}

export default function TopPerformersTable({ data }: TopPerformersTableProps) {
  // Helper to map text-risk colors to background-risk colors
  const getRiskBgColor = (score: number): string => {
    const textColor = getRiskColor(score);
    if (textColor === "text-danger") return "bg-rose-500";
    if (textColor === "text-warning") return "bg-amber-500";
    return "bg-emerald-500";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  return (
    <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col h-[420px] justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-2 border-b border-slate-50 select-none">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-indigo-500" />
            <h4 className="font-bold text-slate-800 text-sm md:text-base">Top Performers</h4>
          </div>
          <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
            Top 5
          </span>
        </div>

        {/* Table Body */}
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm gap-2">
            <Star className="w-8 h-8 text-slate-350 animate-pulse" />
            <p>No student performance data available</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3.5"
          >
            {data.map((student, index) => {
              const rank = index + 1;
              const initials = getInitials(student.name);
              const barColor = getRiskBgColor(student.avgMarks);
              const textColor = getRiskColor(student.avgMarks);

              return (
                <motion.div
                  key={student.id}
                  variants={rowVariants}
                  className="flex items-center justify-between gap-4 p-2 rounded-xl hover:bg-slate-50 transition duration-200"
                >
                  {/* Left rank + Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-slate-400 w-4 text-center">
                      #{rank}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-extrabold text-indigo-600 text-[11px] shadow-sm uppercase">
                      {initials}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-700 truncate">{student.name}</p>
                      <p className="text-[10px] text-slate-400">Class {student.class}-{student.section}</p>
                    </div>
                  </div>

                  {/* Right Score + Progress Bar */}
                  <div className="flex items-center gap-4 shrink-0 w-32 md:w-40 justify-end">
                    <div className="w-16 md:w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${student.avgMarks}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-10 text-right ${textColor}`}>
                      {student.avgMarks.toFixed(1)}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-3 border-t border-slate-50 text-center">
        <Link
          href="/dashboard/admin/students"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition"
        >
          View All Students
        </Link>
      </div>
    </div>
  );
}
