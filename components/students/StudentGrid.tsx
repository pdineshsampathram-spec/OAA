"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { User, Award, Percent } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface StudentWithStats {
  id: string;
  name: string;
  class: string;
  section: string;
  gender: string;
  schoolId: string | null;
  createdAt: string;
  avgMarks: number;
  attendanceRate: number;
  riskFlag: boolean;
  rank: number;
  skills: string[];
}

interface StudentGridProps {
  students: StudentWithStats[];
}

const colors = [
  "bg-indigo-50 text-indigo-700 border-indigo-100",
  "bg-emerald-50 text-emerald-700 border-emerald-100",
  "bg-sky-50 text-sky-700 border-sky-100",
  "bg-violet-50 text-violet-700 border-violet-100",
  "bg-amber-50 text-amber-700 border-amber-100",
];

const getAvatarStyle = (name: string) => {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  const index = code % colors.length;
  return colors[index];
};

const getAttendanceColor = (rate: number) => {
  if (rate >= 0.90) return "bg-emerald-500";
  if (rate >= 0.75) return "bg-amber-500";
  return "bg-rose-500";
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
};

export default function StudentGrid({ students }: StudentGridProps) {
  const router = useRouter();

  if (students.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl">
        <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-400">No students match current filter criteria.</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
    >
      {students.map((student) => {
        const avatarStyle = getAvatarStyle(student.name);
        const attendancePct = Math.round(student.attendanceRate * 100);
        const marksVal = Math.round(student.avgMarks);
        const attBarColor = getAttendanceColor(student.attendanceRate);

        return (
          <motion.div
            key={student.id}
            variants={cardVariants}
            whileHover={{ y: -6, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)" }}
            onClick={() => router.push(`/dashboard/admin/students/${student.id}`)}
            className="cursor-pointer bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col gap-4 relative select-none hover:border-slate-300 transition-colors"
          >
            {/* AI Risk Flag Dot */}
            {student.riskFlag && (
              <span className="absolute top-4 right-4 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" title="AI Flagged At-Risk"></span>
              </span>
            )}

            {/* Avatar & Basic Info */}
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center font-bold text-xs uppercase ${avatarStyle}`}>
                {getInitials(student.name)}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{student.name}</h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Class {student.class}-{student.section}
                </p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-2">
              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-50 text-slate-500 border border-slate-100">
                {student.gender}
              </span>
              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                Rank #{student.rank}
              </span>
            </div>

            {/* Performance Bars */}
            <div className="space-y-3 pt-2 border-t border-slate-50">
              {/* Avg Marks Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-indigo-500" /> Academics
                  </span>
                  <span className="text-slate-700">{marksVal}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, marksVal))}%` }}
                  />
                </div>
              </div>

              {/* Attendance % Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-sky-500" /> Attendance
                  </span>
                  <span className="text-slate-700">{attendancePct}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${attBarColor}`}
                    style={{ width: `${Math.min(100, Math.max(0, attendancePct))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Skills */}
            {student.skills && student.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2.5 border-t border-slate-50">
                {student.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-medium bg-slate-100/70 text-slate-600 border border-slate-200/40"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
