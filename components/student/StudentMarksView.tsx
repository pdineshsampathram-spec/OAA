'use client';

import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import type { Mark } from '@/lib/db/schema';

interface StudentMarksViewProps {
  marks: Mark[];
  subjectAvgs: { subject: string; avgMarks: number }[];
}

export default function StudentMarksView({ marks, subjectAvgs }: StudentMarksViewProps) {
  // Group marks by subject
  const groupedBySubject: Record<string, Mark[]> = {};
  marks.forEach((m) => {
    if (!groupedBySubject[m.subject]) groupedBySubject[m.subject] = [];
    groupedBySubject[m.subject].push(m);
  });

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          My Marks
        </h1>
        <p className="text-slate-500 dark:text-zinc-400">
          All your exam scores broken down by subject and exam type.
        </p>
      </motion.div>

      {/* Subject Average Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
      >
        {subjectAvgs.map((sub) => (
          <div
            key={sub.subject}
            className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] rounded-2xl p-4 text-center"
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{sub.subject}</p>
            <p className={`text-2xl font-bold tracking-tight ${
              sub.avgMarks >= 60 ? 'text-emerald-600' : sub.avgMarks >= 40 ? 'text-amber-600' : 'text-rose-600'
            }`}>
              {sub.avgMarks.toFixed(1)}%
            </p>
          </div>
        ))}
      </motion.div>

      {/* Marks grouped by subject */}
      {Object.entries(groupedBySubject).map(([subject, subjectMarks], idx) => (
        <motion.div
          key={subject}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 + idx * 0.05 }}
          className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">{subject}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left py-2.5 px-2 font-semibold text-slate-500 dark:text-slate-400">Exam Type</th>
                  <th className="text-right py-2.5 px-2 font-semibold text-slate-500 dark:text-slate-400">Score</th>
                  <th className="text-right py-2.5 px-2 font-semibold text-slate-500 dark:text-slate-400">Max</th>
                  <th className="text-right py-2.5 px-2 font-semibold text-slate-500 dark:text-slate-400">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {subjectMarks.map((mark) => {
                  const pct = (mark.marks / (mark.maxMarks || 100)) * 100;
                  return (
                    <tr key={mark.id} className="border-b border-slate-50 dark:border-slate-800/50">
                      <td className="py-2.5 px-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 capitalize">
                          {mark.examType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-slate-800 dark:text-slate-200">{mark.marks}</td>
                      <td className="py-2.5 px-2 text-right text-slate-500">{mark.maxMarks}</td>
                      <td className={`py-2.5 px-2 text-right font-bold ${pct >= 60 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {pct.toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
