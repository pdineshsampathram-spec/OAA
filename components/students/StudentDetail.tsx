"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Award,
  Calendar as CalendarIcon,
  TrendingUp,
  Brain,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Activity,
  Edit,
  X,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import * as Dialog from "@radix-ui/react-dialog";
import { formatDate, getInitials } from "@/lib/utils";
import type { Student, Mark, Attendance, AiPrediction } from "@/lib/db/schema";
import { updateStudentAction } from "@/lib/actions/students";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface StudentDetailProps {
  student: Student;
  marks: Mark[];
  attendance: Attendance[];
  prediction: AiPrediction | null;
  rank: number;
}

type TabType = "overview" | "marks" | "attendance" | "ai";

const colors = [
  "bg-indigo-50 text-indigo-755 border-indigo-100",
  "bg-emerald-50 text-emerald-755 border-emerald-100",
  "bg-sky-50 text-sky-755 border-sky-100",
  "bg-violet-50 text-violet-755 border-violet-100",
  "bg-amber-50 text-amber-755 border-amber-100",
];

const getAvatarStyle = (name: string) => {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  const index = code % colors.length;
  return colors[index];
};

export default function StudentDetail({
  student,
  marks,
  attendance,
  prediction,
  rank,
}: StudentDetailProps) {
  const router = useRouter();
  const { role } = useCurrentUser();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // AI Predict loading states
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(student.name);
  const [editClass, setEditClass] = useState(student.class);
  const [editSection, setEditSection] = useState(student.section);
  const [editGender, setEditGender] = useState(student.gender);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Calculate general stats
  const totalMarksCount = marks.length;
  const avgMarks =
    totalMarksCount > 0
      ? Math.round(marks.reduce((acc, m) => acc + m.marks, 0) / totalMarksCount)
      : 0;

  const totalAttendanceCount = attendance.length;
  const presentOrLate = attendance.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
  const attendanceRate =
    totalAttendanceCount > 0 ? Math.round((presentOrLate / totalAttendanceCount) * 100) : 0;

  // Streak calculations
  const calculateStreak = (records: Attendance[]) => {
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    for (const rec of sorted) {
      if (rec.status === "present" || rec.status === "late") {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };
  const currentStreak = calculateStreak(attendance);

  // Subject statistics for Radar Chart (Overview)
  const getSubjectAverages = () => {
    const subjectMap: Record<string, { sum: number; count: number }> = {};
    for (const m of marks) {
      if (!subjectMap[m.subject]) {
        subjectMap[m.subject] = { sum: 0, count: 0 };
      }
      subjectMap[m.subject].sum += m.marks;
      subjectMap[m.subject].count += 1;
    }
    const radarData = Object.entries(subjectMap).map(([subject, stats]) => ({
      subject,
      score: Math.round(stats.sum / stats.count),
      fullMark: 100,
    }));
    return radarData.length > 0 ? radarData : [{ subject: "None", score: 0, fullMark: 100 }];
  };
  const radarData = getSubjectAverages();

  // Marks Filtering & Trend Chart
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
  const uniqueSubjects = Array.from(new Set(marks.map((m) => m.subject)));

  const filteredMarksForTable = marks.filter(
    (m) => selectedSubjectFilter === "all" || m.subject === selectedSubjectFilter
  );

  const getLineChartData = () => {
    const sortedMarks = [...marks].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    
    // Group marks by date or order key
    const dataPoints = sortedMarks.map((m) => ({
      date: formatDate(m.createdAt),
      score: m.marks,
      subject: m.subject,
    }));

    if (selectedSubjectFilter !== "all") {
      return dataPoints.filter((dp) => dp.subject === selectedSubjectFilter);
    }
    return dataPoints.slice(-10); // last 10 marks if no subject filter
  };
  const lineChartData = getLineChartData();

  // AI Prediction parsing
  const riskScore = prediction?.score !== undefined ? prediction.score : 0;
  const riskFlag = prediction?.riskFlag === 1;
  const suggestions: string[] = prediction?.suggestions ? JSON.parse(prediction.suggestions) : [];

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", "AI recommendations regenerated successfully.");
        startTransition(() => {
          router.refresh();
        });
      } else {
        showToast("error", data.error || "Failed to regenerate predictions.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred.";
      showToast("error", message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEdit(true);
    try {
      const res = await updateStudentAction(student.id, {
        name: editName,
        class: editClass,
        section: editSection,
        gender: editGender,
      });
      if (res.success) {
        showToast("success", "Student profile updated.");
        setIsEditOpen(false);
        startTransition(() => {
          router.refresh();
        });
      } else {
        showToast("error", res.error || "Failed to update profile.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred.";
      showToast("error", message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Local student monthly calendar builder
  const StudentCalendar = () => {
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay();

    const days = getDaysInMonth(month, year);
    const startDay = getFirstDayOfMonth(month, year);
    const offset = startDay === 0 ? 6 : startDay - 1; // start on Monday

    const cells = [];
    for (let i = 0; i < offset; i++) {
      cells.push(<div key={`pad-${i}`} className="h-9 w-full" />);
    }

    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
      const record = attendance.find((a) => a.date === dateStr);

      let cellStyle = "bg-slate-50 text-slate-400 border-transparent";
      if (record) {
        if (record.status === "present") cellStyle = "bg-emerald-50 text-emerald-800 border-emerald-100";
        else if (record.status === "late") cellStyle = "bg-amber-50 text-amber-800 border-amber-100";
        else if (record.status === "absent") cellStyle = "bg-rose-50 text-rose-800 border-rose-100";
      }

      cells.push(
        <div
          key={`day-${d}`}
          className={`h-9 w-full rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition select-none ${cellStyle}`}
        >
          <span>{d}</span>
        </div>
      );
    }

    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 space-y-4 max-w-sm w-full mx-auto shadow-sm">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-800">
            {monthNames[month]} {year}
          </h4>
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (month === 0) {
                  setMonth(11);
                  setYear(year - 1);
                } else setMonth(month - 1);
              }}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-50"
            >
              ◀
            </button>
            <button
              onClick={() => {
                if (month === 11) {
                  setMonth(0);
                  setYear(year + 1);
                } else setMonth(month + 1);
              }}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-50"
            >
              ▶
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">{cells}</div>
      </div>
    );
  };

  const tabVariants: Variants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-xs font-semibold max-w-sm ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                : "bg-rose-50 border-rose-100 text-rose-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb Header */}
      <div className="flex items-center gap-3">
         <button
          onClick={() => router.push("/dashboard/admin/students")}
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Directory</span>
          <h2 className="text-xl font-bold text-slate-800 block">Performance Profile</h2>
        </div>
      </div>

      {/* Main Student Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 select-none">
        <div className="flex items-center gap-4.5">
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center font-bold text-lg uppercase ${getAvatarStyle(student.name)}`}>
            {getInitials(student.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800">{student.name}</h3>
              {riskFlag ? (
                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                  At Risk
                </span>
              ) : (
                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Low Risk
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Class {student.class}-{student.section} &bull; Gender: {student.gender}
            </p>
          </div>
        </div>

        {role !== "principal" && (
          <button
            onClick={() => setIsEditOpen(true)}
            className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs w-fit"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200/85 gap-6 select-none">
        {(["overview", "marks", "attendance", "ai"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-xs font-bold border-b-2 uppercase tracking-wider transition ${
              activeTab === tab
                ? "border-indigo-650 text-indigo-650"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab === "ai" ? "AI Insights" : tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENTS */}
      <div className="min-h-[350px]">
        <AnimatePresence mode="wait">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academics Average</span>
                    <span className="text-xl font-bold text-slate-800 block mt-1">{avgMarks}%</span>
                  </div>
                  <Award className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl" />
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
                    <span className="text-xl font-bold text-slate-800 block mt-1">{attendanceRate}%</span>
                  </div>
                  <CalendarIcon className="w-8 h-8 text-sky-500 bg-sky-50 p-1.5 rounded-xl" />
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Rank</span>
                    <span className="text-xl font-bold text-slate-800 block mt-1">#{rank}</span>
                  </div>
                  <TrendingUp className="w-8 h-8 text-violet-500 bg-violet-50 p-1.5 rounded-xl" />
                </div>
              </div>

              {/* Radar Chart & Recent Marks */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:col-span-2 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Subject Performance Analysis</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#F1F5F9" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748B", fontSize: 10, fontWeight: "bold" }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 8 }} />
                        <Radar name={student.name} dataKey="score" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.15} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Test Marks</h4>
                  <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[250px] pr-2">
                    {marks.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-10">No marks recorded yet.</p>
                    ) : (
                      marks.slice(0, 5).map((m) => (
                        <div key={m.id} className="py-3 flex justify-between items-center">
                          <div>
                            <span className="text-xs font-semibold text-slate-700 block">{m.subject}</span>
                            <span className="text-[10px] text-slate-400 capitalize block mt-0.5">{m.examType.replace("_", " ")}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-800 block">{m.marks} / {m.maxMarks}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{formatDate(m.createdAt)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: MARKS */}
          {activeTab === "marks" && (
            <motion.div
              key="marks"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              {/* Filters & Trend Line Chart */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Performance Trends</h4>
                  <select
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="all">All Subjects</option>
                    {uniqueSubjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 9 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                      <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Score Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exam Type</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Score</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Recorded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMarksForTable.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-xs text-slate-400">
                            No marks records found.
                          </td>
                        </tr>
                      ) : (
                        filteredMarksForTable.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-6 py-3.5 text-xs font-semibold text-slate-700">{m.subject}</td>
                            <td className="px-6 py-3.5 text-xs text-slate-500 capitalize">{m.examType.replace("_", " ")}</td>
                            <td className="px-6 py-3.5 text-xs font-bold text-slate-800 text-right">
                              {m.marks} / {m.maxMarks}
                            </td>
                            <td className="px-6 py-3.5 text-xs text-slate-400">{formatDate(m.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: ATTENDANCE */}
          {activeTab === "attendance" && (
            <motion.div
              key="attendance"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Calendar Grid */}
              <div className="md:col-span-2">
                <StudentCalendar />
              </div>

              {/* Stats & Streaks */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Attendance Breakdown</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-700 block uppercase tracking-wider">Present</span>
                      <span className="text-lg font-bold text-emerald-800 block mt-1">
                        {attendance.filter((a) => a.status === "present").length}
                      </span>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl">
                      <span className="text-[10px] font-bold text-amber-700 block uppercase tracking-wider">Late</span>
                      <span className="text-lg font-bold text-amber-800 block mt-1">
                        {attendance.filter((a) => a.status === "late").length}
                      </span>
                    </div>

                    <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl">
                      <span className="text-[10px] font-bold text-rose-700 block uppercase tracking-wider">Absent</span>
                      <span className="text-lg font-bold text-rose-800 block mt-1">
                        {attendance.filter((a) => a.status === "absent").length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-sky-500 to-indigo-650 text-white rounded-2xl p-5 shadow-md flex items-center justify-between relative overflow-hidden select-none">
                  <div className="absolute right-[-20px] top-[-20px] bg-white/10 w-24 h-24 rounded-full blur-xl" />
                  <div>
                    <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider block">Attendance Streak</span>
                    <span className="text-lg font-bold block mt-1">Active: {currentStreak} Days</span>
                    <p className="text-[9px] text-indigo-100/80 mt-1 leading-relaxed">
                      Consecutive present or late days recorded. Keep the streak active!
                    </p>
                  </div>
                  <Activity className="w-10 h-10 text-white/20" />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: AI INSIGHTS */}
          {activeTab === "ai" && (
            <motion.div
              key="ai"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              {/* Semicircle Gauge & Risk Flag */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col items-center justify-center relative min-h-[220px]">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider absolute top-5">Risk Coefficient</h4>
                  
                  <div className="h-[140px] w-full flex items-center justify-center mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { value: Math.round(riskScore * 100), fill: riskFlag ? "#EF4444" : "#10B981" },
                            { value: 100 - Math.round(riskScore * 100), fill: "#F1F5F9" },
                          ]}
                          cx="50%"
                          cy="100%"
                          startAngle={180}
                          endAngle={0}
                          innerRadius={60}
                          outerRadius={80}
                          dataKey="value"
                        >
                          <Cell key="cell-0" />
                          <Cell key="cell-1" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center absolute bottom-4">
                    <span className="text-xl font-bold text-slate-800">{Math.round(riskScore * 100)}%</span>
                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">AI Risk Index</p>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col justify-between gap-4">
                  {riskFlag ? (
                    <motion.div
                      initial={{ scale: 0.98 }}
                      animate={{ scale: 1 }}
                      className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 flex items-start gap-4 flex-1 shadow-sm"
                    >
                      <AlertTriangle className="w-8 h-8 text-rose-600 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold">Academic Performance Warning Flag</h4>
                        <p className="text-xs text-rose-700/90 mt-1 leading-relaxed">
                          This student is currently flagged as &quot;At Risk&quot; due to falling below academic scores (marks average &lt; 50%) or attendance targets (attendance rate &lt; 75%).
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0.98 }}
                      animate={{ scale: 1 }}
                      className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 flex items-start gap-4 flex-1 shadow-sm"
                    >
                      <CheckCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold">Academics Standing - Stable</h4>
                        <p className="text-xs text-emerald-700/90 mt-1 leading-relaxed">
                          This student is currently in stable standing. Average score and attendance rates satisfy the core requirements.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl py-3 px-5 text-xs font-bold transition shadow-xs flex items-center justify-center gap-2"
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-650" />
                        Running Analysis...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 text-indigo-500" />
                        Regenerate Prediction
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Suggestions list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-indigo-500" /> AI Suggestions & Actions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.length === 0 ? (
                    <p className="text-xs text-slate-400 col-span-2">No recommendations available.</p>
                  ) : (
                    suggestions.map((sug, idx) => (
                      <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-sm flex items-start gap-3 hover:border-slate-350 transition">
                        <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{sug}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Dialog Modal (Embedded inline for self-containment) */}
      <Dialog.Root open={isEditOpen} onOpenChange={(open) => !open && setIsEditOpen(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-[95vw] p-6 z-50 focus:outline-none">
            
            <Dialog.Title className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-500" />
              Edit Student Details
            </Dialog.Title>
            <Dialog.Description className="text-xs text-slate-450 mt-1">
              Modify profiles for {student.name}.
            </Dialog.Description>

            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleEditSave} className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Class</label>
                  <select
                    value={editClass}
                    onChange={(e) => setEditClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                  >
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Section</label>
                  <select
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                  >
                    {["A", "B", "C", "D", "E"].map((s) => (
                      <option key={s} value={s}>
                        Section {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gender</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                >
                  {["Male", "Female", "Other"].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 px-5 text-xs font-semibold transition shadow-md shadow-indigo-100 flex items-center gap-2"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
