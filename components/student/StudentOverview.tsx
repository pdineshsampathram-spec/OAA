'use client';

import { motion } from 'framer-motion';
import { Award, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import type { Mark } from '@/lib/db/schema';

interface StudentOverviewProps {
  student: {
    id: string;
    name: string;
    class: string;
    section: string;
    gender: string;
  };
  overallAvg: number;
  attendanceRate: number;
  rank: number;
  subjectAvgs: { subject: string; avgMarks: number }[];
  recentMarks: Mark[];
}

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

export default function StudentOverview({
  student,
  overallAvg,
  attendanceRate,
  rank,
  subjectAvgs,
  recentMarks,
}: StudentOverviewProps) {
  const attendancePct = Math.round(attendanceRate * 100);

  return (
    <div className="space-y-8">
      {/* Hero Greeting */}
      <motion.div {...fadeIn} className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
          Welcome back, {student.name.split(' ')[0]}.
        </h1>
        <p className="text-lg text-slate-500 dark:text-zinc-400">
          Class {student.class} — Section {student.section} · Here&apos;s your academic snapshot.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div 
        {...fadeIn}
        transition={{ ...fadeIn.transition, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KPICard 
          label="Overall Average" 
          value={`${overallAvg.toFixed(1)}%`} 
          icon={<BarChart3 className="h-5 w-5" />}
          color="indigo"
        />
        <KPICard 
          label="Attendance Rate" 
          value={`${attendancePct}%`} 
          icon={<Calendar className="h-5 w-5" />}
          color="emerald"
        />
        <KPICard 
          label="Class Rank" 
          value={`#${rank}`} 
          icon={<Award className="h-5 w-5" />}
          color="amber"
        />
        <KPICard 
          label="Subjects" 
          value={`${subjectAvgs.length}`} 
          icon={<TrendingUp className="h-5 w-5" />}
          color="purple"
        />
      </motion.div>

      {/* Subject Performance */}
      <motion.div 
        {...fadeIn}
        transition={{ ...fadeIn.transition, delay: 0.2 }}
        className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6"
      >
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Subject Performance</h2>
        <div className="space-y-4">
          {subjectAvgs.map((sub) => (
            <div key={sub.subject} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{sub.subject}</span>
                <span className={`text-sm font-bold ${sub.avgMarks >= 60 ? 'text-emerald-600' : sub.avgMarks >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {sub.avgMarks.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${Math.min(sub.avgMarks, 100)}%` }} 
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className={`h-full rounded-full ${
                    sub.avgMarks >= 60 ? 'bg-emerald-500' : sub.avgMarks >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Marks Table */}
      <motion.div 
        {...fadeIn}
        transition={{ ...fadeIn.transition, delay: 0.3 }}
        className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6"
      >
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Recent Assessment Scores</h2>
        {recentMarks.length === 0 ? (
          <p className="text-sm text-slate-500">No marks recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left py-3 px-2 font-semibold text-slate-500 dark:text-slate-400">Subject</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-500 dark:text-slate-400">Exam Type</th>
                  <th className="text-right py-3 px-2 font-semibold text-slate-500 dark:text-slate-400">Score</th>
                  <th className="text-right py-3 px-2 font-semibold text-slate-500 dark:text-slate-400">Max</th>
                  <th className="text-right py-3 px-2 font-semibold text-slate-500 dark:text-slate-400">%</th>
                </tr>
              </thead>
              <tbody>
                {recentMarks.map((mark) => {
                  const pct = (mark.marks / (mark.maxMarks || 100)) * 100;
                  return (
                    <tr key={mark.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-2 font-medium text-slate-800 dark:text-slate-200">{mark.subject}</td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {mark.examType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-slate-800 dark:text-slate-200">{mark.marks}</td>
                      <td className="py-3 px-2 text-right text-slate-500">{mark.maxMarks}</td>
                      <td className={`py-3 px-2 text-right font-bold ${pct >= 60 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {pct.toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// KPI Card component
function KPICard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  };

  return (
    <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}
