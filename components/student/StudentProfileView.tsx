'use client';

import { motion } from 'framer-motion';
import { User, Mail, GraduationCap, BookOpen, Sparkles } from 'lucide-react';

interface StudentProfileViewProps {
  student: {
    id: string;
    name: string;
    class: string;
    section: string;
    gender: string;
  };
  email: string;
}

export default function StudentProfileView({ student, email }: StudentProfileViewProps) {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          My Profile
        </h1>
        <p className="text-slate-500 dark:text-zinc-400">
          Your academic identity and personal information.
        </p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-8"
      >
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
          </div>

          {/* Info Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <InfoRow icon={<User className="h-4 w-4" />} label="Full Name" value={student.name} />
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={email} />
            <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Class" value={`Class ${student.class}`} />
            <InfoRow icon={<BookOpen className="h-4 w-4" />} label="Section" value={`Section ${student.section}`} />
            <InfoRow icon={<User className="h-4 w-4" />} label="Gender" value={student.gender} />
            <InfoRow icon={<BookOpen className="h-4 w-4" />} label="Student ID" value={student.id} />
          </div>
        </div>
      </motion.div>

      {/* Skills & Portfolio — Coming Soon */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-8"
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 mb-4">
            <Sparkles className="h-8 w-8 text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
            Skills & Portfolio
          </h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md">
            Your unified portfolio engine is coming soon. You&apos;ll be able to sync verified skill vectors, 
            public GitHub repositories, and dynamic resume downloads — all from your OAA dashboard.
          </p>
          <span className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
            Coming in V2
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-white/[0.03] border border-black/[0.02] dark:border-white/[0.02]">
      <div className="text-slate-400 dark:text-zinc-500">{icon}</div>
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}
