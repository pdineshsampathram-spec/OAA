"use client";

import { motion } from "framer-motion";
import { getInitials, getRiskColor } from "@/lib/utils";
import { AlertTriangle, Check, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Student, AiPrediction } from "@/lib/db/schema";

interface StudentPredictionJoin {
  prediction: AiPrediction;
  student: Student;
}

interface AtRiskStudentsListProps {
  data: StudentPredictionJoin[];
}

export default function AtRiskStudentsList({ data }: AtRiskStudentsListProps) {
  const router = useRouter();

  // Helper to map text-risk colors to background badge pill colors
  const getBadgeColors = (score: number): string => {
    const textColor = getRiskColor(score);
    if (textColor === "text-danger") {
      return "bg-rose-500/10 border-rose-500/20 text-rose-500";
    }
    if (textColor === "text-warning") {
      return "bg-amber-500/10 border-amber-500/20 text-amber-500";
    }
    return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
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

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  return (
    <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col h-[420px] justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-2 border-b border-slate-50 select-none">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
            <h4 className="font-bold text-slate-800 text-sm md:text-base">At-Risk Students</h4>
          </div>
          <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded-full border border-rose-100">
            High Risk
          </span>
        </div>

        {/* List Content */}
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="p-3 bg-emerald-50 text-emerald-500 rounded-full border border-emerald-100 mb-3 shadow-inner"
            >
              <Check className="w-8 h-8" />
            </motion.div>
            <p className="text-sm font-bold text-slate-700">No At-Risk Students</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
              All student performances and attendance rates are currently stable.
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3.5"
          >
            {data.map(({ student, prediction }) => {
              const initials = getInitials(student.name);
              const badgeColors = getBadgeColors(prediction.score);
              const scorePercent = prediction.score <= 1 ? prediction.score * 100 : prediction.score;

              return (
                <motion.div
                  key={student.id}
                  variants={itemVariants}
                  className="flex items-center justify-between gap-4 p-2 rounded-xl hover:bg-slate-50 transition duration-200"
                >
                  {/* Left Profile */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center font-extrabold text-rose-600 text-[11px] shadow-sm uppercase">
                      {initials}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-700 truncate">{student.name}</p>
                      <p className="text-[10px] text-slate-400">Class {student.class}-{student.section}</p>
                    </div>
                  </div>

                  {/* Right score indicator + view button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border select-none ${badgeColors}`}>
                      {scorePercent.toFixed(0)}% Risk
                    </span>
                    <button
                      onClick={() => router.push(`/dashboard/admin/students/${student.id}`)}
                      className="p-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 hover:text-indigo-600 rounded-lg transition"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
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
          href="/dashboard/admin/ai-insights"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition"
        >
          View AI Insights Report
        </Link>
      </div>
    </div>
  );
}
