'use client';

import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Attendance } from '@/lib/db/schema';

interface StudentAttendanceViewProps {
  records: Attendance[];
  rate: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

export default function StudentAttendanceView({
  records,
  rate,
  presentCount,
  absentCount,
  lateCount,
}: StudentAttendanceViewProps) {
  const attendancePct = Math.round(rate * 100);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          My Attendance
        </h1>
        <p className="text-slate-500 dark:text-zinc-400">
          Track your daily attendance record across the last 30 days.
        </p>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard label="Overall Rate" value={`${attendancePct}%`} color="indigo" />
        <StatCard label="Present" value={`${presentCount}`} color="emerald" />
        <StatCard label="Absent" value={`${absentCount}`} color="rose" />
        <StatCard label="Late" value={`${lateCount}`} color="amber" />
      </motion.div>

      {/* Attendance List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Daily Records</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {records.map((record) => (
            <div
              key={record.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                record.status === 'present' && "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30",
                record.status === 'absent' && "bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30",
                record.status === 'late' && "bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30",
              )}
            >
              {record.status === 'present' && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
              {record.status === 'absent' && <XCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />}
              {record.status === 'late' && <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{record.date}</span>
              <span className={cn(
                "ml-auto text-xs font-bold uppercase tracking-wide",
                record.status === 'present' && "text-emerald-600",
                record.status === 'absent' && "text-rose-600",
                record.status === 'late' && "text-amber-600",
              )}>
                {record.status}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  };

  return (
    <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] rounded-2xl p-5 text-center">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold tracking-tight ${colorMap[color]?.split(' ')[1] || 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
