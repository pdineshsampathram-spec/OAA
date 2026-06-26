"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import KPICard from "./KPICard";
import MarksDistributionChart from "./MarksDistributionChart";
import AttendanceTrendChart from "./AttendanceTrendChart";
import TopPerformersTable from "./TopPerformersTable";
import AtRiskStudentsList from "./AtRiskStudentsList";
import RecentActivityFeed from "./RecentActivityFeed";
import PageTransition from "@/components/layout/PageTransition";
import { cn } from "@/lib/utils";
import {
  Users,
  TrendingUp,
  CalendarCheck,
  AlertTriangle,
  Trophy,
  ShieldAlert,
  MessageSquare,
  Award,
  ChevronRight,
} from "lucide-react";
import type { Analytics, SubjectStat, DayTrend } from "@/types";
import type { Student, AiPrediction } from "@/lib/db/schema";
import type { ActivityItem } from "./RecentActivityFeed";
import { AppleHero } from "@/components/ui/AppleHero";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface TopPerformer {
  id: string;
  name: string;
  class: string;
  section: string;
  avgMarks: number;
}

interface StudentPredictionJoin {
  prediction: AiPrediction;
  student: Student;
}

interface LeaderboardPreviewEntry {
  rank: number;
  studentId: string;
  name: string;
  class: string;
  section: string;
  totalOaaScore: number;
  percentileRank: number;
}

interface DisciplineAlert {
  id: string;
  studentName: string;
  dotCount: number;
  reason: string;
  createdAt: string;
  issuerName: string;
}

interface FlaggedMessageAlert {
  alertId: string;
  messageId: string;
  content: string;
  senderName: string;
  reason: string;
  createdAt: string;
}

interface OaaMetricsData {
  institutionAvgOaa: number;
  cpAverage: number;
  redDotsThisMonth: number;
  lockedStudentsCount: number;
  studentsWithOaaActivityCount: number;
  leaderboardPreview: LeaderboardPreviewEntry[];
  disciplineAlerts: DisciplineAlert[];
  moderationAlerts: {
    count: number;
    lastThree: FlaggedMessageAlert[];
  };
  cpResults: {
    classId: string;
    section: string;
    cp: number;
    studentCount: number;
    avgMarks: number;
  }[];
}

interface DashboardHomeProps {
  greeting: string;
  analytics: Analytics;
  subjectStats: SubjectStat[];
  attendanceTrends: DayTrend[];
  topPerformers: TopPerformer[];
  atRiskStudents: StudentPredictionJoin[];
  recentActivities: ActivityItem[];
  oaaMetrics?: OaaMetricsData;
}

export default function DashboardHome({
  greeting,
  analytics,
  subjectStats,
  attendanceTrends,
  topPerformers,
  atRiskStudents,
  recentActivities,
  oaaMetrics,
}: DashboardHomeProps) {
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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  // Process data for CP Chart
  const cpChartData = oaaMetrics?.cpResults.map((r) => ({
    name: `${r.classId}-${r.section}`,
    cp: r.cp,
  })) || [];

  return (
    <PageTransition>
      <div className="space-y-8 select-none w-full max-w-[1600px] mx-auto pb-32">
        <AppleHero
          title={greeting}
          subtitle="Here is what is happening at your school today."
          className="pt-16 pb-8"
        />

        {/* Row 1: Original KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Students"
            value={analytics.totalStudents}
            subtitle="Enrolled students in school"
            icon={Users}
            trend={1.2}
            color="indigo"
            index={0}
          />
          <KPICard
            title="Average Marks"
            value={`${analytics.avgMarks.toFixed(1)}%`}
            subtitle="Overall average student grade"
            icon={TrendingUp}
            trend={2.4}
            color="emerald"
            index={1}
          />
          <KPICard
            title="Attendance Rate"
            value={`${analytics.attendanceRate.toFixed(1)}%`}
            subtitle="Average daily attendance rate"
            icon={CalendarCheck}
            trend={-0.3}
            color="amber"
            index={2}
          />
          <KPICard
            title="At-Risk Students"
            value={analytics.atRiskCount}
            subtitle="Flagged by AI predictions model"
            icon={AlertTriangle}
            trend={-5.8}
            color="rose"
            index={3}
          />
        </div>

        {/* --- OAA PLATFORM SYSTEM PILLARS SECTION --- */}
        {oaaMetrics && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 pt-4"
          >
            <div className="flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                OAA Platform Performance
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full">
                Core Pillars
              </span>
            </div>

            {/* OAA KPI row (5 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <KPICard
                title="Avg OAA Score"
                value={oaaMetrics.institutionAvgOaa.toFixed(1)}
                subtitle="Average academic + skill + project index"
                icon={Trophy}
                trend={1.5}
                color="indigo"
                index={0}
              />
              <KPICard
                title="CP Average"
                value={`${oaaMetrics.cpAverage.toFixed(1)}%`}
                subtitle="Class Potential Index across sections"
                icon={TrendingUp}
                trend={0.8}
                color="emerald"
                index={1}
              />
              <KPICard
                title="Red Dots (Month)"
                value={oaaMetrics.redDotsThisMonth}
                subtitle="Behavioral flags issued this month"
                icon={AlertTriangle}
                trend={-12.5}
                color="amber"
                index={2}
              />
              <KPICard
                title="Locked Accounts"
                value={oaaMetrics.lockedStudentsCount}
                subtitle="Students suspended (5+ red dots)"
                icon={ShieldAlert}
                trend={0.0}
                color="rose"
                index={3}
              />
              <KPICard
                title="OAA Activity"
                value={oaaMetrics.studentsWithOaaActivityCount}
                subtitle="Students with projects/skills logged"
                icon={Users}
                trend={4.2}
                color="indigo"
                index={4}
              />
            </div>

            {/* Mini Leaderboard + CP Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Leaderboard Preview */}
              <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col h-[400px] justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5 pb-2 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-indigo-500" />
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm md:text-base">
                        Leaderboard Preview
                      </h4>
                    </div>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-bold px-2.5 py-0.5 rounded-full">
                      Top 5
                    </span>
                  </div>

                  <div className="space-y-3">
                    {oaaMetrics.leaderboardPreview.length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-400">No OAA scores calculated.</div>
                    ) : (
                      oaaMetrics.leaderboardPreview.map((student, idx) => (
                        <div
                          key={student.studentId}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400 w-4 text-center">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                                {student.name}
                              </p>
                              <p className="text-[10px] text-slate-450 dark:text-zinc-450">
                                Dept: {student.class}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                              {student.totalOaaScore.toFixed(1)} pts
                            </span>
                            <p className="text-[9px] text-slate-400">
                              {student.percentileRank.toFixed(0)}th percentile
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-black/5 dark:border-white/5 text-center">
                  <Link
                    href="/dashboard/admin/leaderboard"
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                  >
                    View Full Leaderboard <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Class Potential Mini Chart */}
              <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col h-[400px] justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5 pb-2 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm md:text-base">
                        Class Potential Index
                      </h4>
                    </div>
                  </div>

                  <div className="w-full mt-4">
                    {cpChartData.length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-400">No class metrics computed.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={cpChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.8)",
                              borderRadius: "12px",
                              borderColor: "rgba(0,0,0,0.05)",
                              backdropFilter: "blur(8px)"
                            }}
                          />
                          <Bar dataKey="cp" radius={[4, 4, 0, 0]} barSize={24}>
                            {cpChartData.map((entry, idx) => {
                              const cp = entry.cp;
                              const color = cp >= 75 ? "#10B981" : cp >= 50 ? "#F59E0B" : "#EF4444";
                              return <Cell key={`cell-${idx}`} fill={color} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-black/5 dark:border-white/5 text-center">
                  <Link
                    href="/dashboard/admin/class-potential"
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    View Full Analysis <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Discipline Alerts + Chat Moderation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Discipline Alerts */}
              <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col h-[400px] justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5 pb-2 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-500" />
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm md:text-base">
                        Behavior Alerts Feed
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {oaaMetrics.disciplineAlerts.length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-400">All student records are clear.</div>
                    ) : (
                      oaaMetrics.disciplineAlerts.map((alert) => {
                        const isLocked = alert.dotCount >= 5;
                        return (
                          <div
                            key={alert.id}
                            className="flex items-start justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition"
                          >
                            <div className="min-w-0">
                              <p className={cn("text-xs font-bold truncate", isLocked ? "text-rose-600 dark:text-rose-455 font-extrabold" : "text-slate-700 dark:text-zinc-200")}>
                                {alert.studentName} {isLocked && "⚠️ (LOCKED)"}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                &quot;{alert.reason}&quot;
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                isLocked ? "bg-rose-500 text-white" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              )}>
                                {alert.dotCount} Dot{alert.dotCount > 1 ? "s" : ""}
                              </span>
                              <p className="text-[9px] text-slate-400 mt-1">
                                {new Date(alert.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-black/5 dark:border-white/5 text-center">
                  <Link
                    href="/dashboard/admin/discipline"
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                  >
                    View All Incidents <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Chat Moderation Alerts */}
              <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col h-[400px] justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5 pb-2 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-rose-500" />
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm md:text-base">
                        Chat Moderation Queue
                      </h4>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2.5 py-0.5 rounded-full",
                      oaaMetrics.moderationAlerts.count > 0 ? "bg-rose-500 text-white animate-pulse" : "bg-slate-100 text-slate-500"
                    )}>
                      {oaaMetrics.moderationAlerts.count} Flagged
                    </span>
                  </div>

                  <div className="space-y-3">
                    {oaaMetrics.moderationAlerts.lastThree.length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-400">No unresolved chat moderation flags.</div>
                    ) : (
                      oaaMetrics.moderationAlerts.lastThree.map((item) => (
                        <div
                          key={item.alertId}
                          className="flex items-start justify-between p-2 rounded-xl border border-rose-100 dark:border-rose-900/10 bg-rose-50/10 dark:bg-rose-950/5 hover:bg-rose-50/20 transition"
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                              {item.senderName}
                            </span>
                            <p className="text-xs text-slate-800 dark:text-zinc-200 italic truncate mt-0.5">
                              &quot;{item.content}&quot;
                            </p>
                          </div>
                          <span className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-bold px-2 py-0.5 rounded uppercase shrink-0 select-none">
                            {item.reason.split(":")[0]}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-black/5 dark:border-white/5 text-center">
                  <Link
                    href="/dashboard/admin/chat-monitor"
                    className="text-xs font-bold text-rose-600 dark:text-rose-450 hover:underline inline-flex items-center gap-1"
                  >
                    Open Chat Monitor <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Row 2: Original Charts Side-by-Side */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-5 gap-6"
        >
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <MarksDistributionChart data={subjectStats} />
          </motion.div>
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <AttendanceTrendChart data={attendanceTrends} />
          </motion.div>
        </motion.div>

        {/* Row 3: Original Lists/Tables Side-by-Side */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <motion.div variants={itemVariants}>
            <TopPerformersTable data={topPerformers} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <AtRiskStudentsList data={atRiskStudents} />
          </motion.div>
        </motion.div>

        {/* Row 4: Original Recent Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <RecentActivityFeed data={recentActivities} />
        </motion.div>
      </div>
    </PageTransition>
  );
}
