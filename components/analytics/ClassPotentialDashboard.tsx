"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Users, TrendingUp, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CPData {
  classId: string;
  section: string;
  cp: number;
  studentCount: number;
  avgMarks: number;
}

interface ClassPotentialDashboardProps {
  initialData: CPData[];
}

function getCPColor(cp: number): string {
  if (cp >= 75) return "#10b981";
  if (cp >= 50) return "#f59e0b";
  return "#ef4444";
}

function getCPBg(cp: number): string {
  if (cp >= 75) return "bg-emerald-50 border-emerald-200";
  if (cp >= 50) return "bg-amber-50 border-amber-200";
  return "bg-rose-50 border-rose-200";
}

function getCPText(cp: number): string {
  if (cp >= 75) return "text-emerald-600";
  if (cp >= 50) return "text-amber-600";
  return "text-rose-600";
}

export default function ClassPotentialDashboard({
  initialData,
}: ClassPotentialDashboardProps) {
  const [selectedSection, setSelectedSection] = useState<CPData | null>(null);

  // Prepare chart data
  const chartData = initialData.map((d) => ({
    name: `${d.classId}-${d.section}`,
    cp: d.cp,
    students: d.studentCount,
    avgMarks: d.avgMarks,
  }));

  // Averages
  const avgCP = initialData.length > 0
    ? initialData.reduce((s, d) => s + d.cp, 0) / initialData.length
    : 0;
  const totalStudents = initialData.reduce((s, d) => s + d.studentCount, 0);
  const topSection = [...initialData].sort((a, b) => b.cp - a.cp)[0];
  const weakSection = [...initialData].sort((a, b) => a.cp - b.cp)[0];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg CP Index</p>
          <p className={cn("text-3xl font-extrabold mt-1", getCPText(avgCP))}>{avgCP.toFixed(1)}</p>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-1">{totalStudents}</p>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Section</p>
          <p className="text-lg font-extrabold text-emerald-600 mt-1">{topSection ? `${topSection.classId}-${topSection.section}` : "—"}</p>
          <p className="text-xs text-slate-400">{topSection ? `CP: ${topSection.cp.toFixed(1)}` : ""}</p>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Needs Attention</p>
          <p className="text-lg font-extrabold text-rose-600 mt-1">{weakSection ? `${weakSection.classId}-${weakSection.section}` : "—"}</p>
          <p className="text-xs text-slate-400">{weakSection ? `CP: ${weakSection.cp.toFixed(1)}` : ""}</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {initialData.map((section, i) => (
          <motion.div
            key={`${section.classId}-${section.section}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => setSelectedSection(section)}
            className={cn(
              "p-5 rounded-2xl border cursor-pointer transition-shadow hover:shadow-lg",
              getCPBg(section.cp)
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {section.classId} • Section {section.section}
                </p>
                <p className={cn("text-4xl font-extrabold mt-2", getCPText(section.cp))}>
                  {section.cp.toFixed(1)}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 mt-1" />
            </div>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {section.studentCount} students
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Avg: {section.avgMarks.toFixed(1)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CP Comparison Chart */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-extrabold text-slate-700 mb-4">CP Index Comparison</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                fontSize: "12px",
              }}
            />
            <ReferenceLine y={75} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Target", fill: "#10b981", fontSize: 10 }} />
            <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Warning", fill: "#f59e0b", fontSize: 10 }} />
            <Bar dataKey="cp" radius={[8, 8, 0, 0]} maxBarSize={50}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={getCPColor(entry.cp)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Drill-Down Panel */}
      <AnimatePresence>
        {selectedSection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-700">
                  📋 {selectedSection.classId} — Section {selectedSection.section} Details
                </h2>
                <button
                  onClick={() => setSelectedSection(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">CP Index</p>
                  <p className={cn("text-2xl font-extrabold", getCPText(selectedSection.cp))}>{selectedSection.cp.toFixed(1)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Students</p>
                  <p className="text-2xl font-extrabold text-slate-800">{selectedSection.studentCount}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Marks</p>
                  <p className="text-2xl font-extrabold text-slate-800">{selectedSection.avgMarks.toFixed(1)}</p>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-700">
                <p className="font-bold">💡 Recommendation</p>
                <p className="mt-1">
                  {selectedSection.cp >= 75
                    ? "This section is performing excellently. Consider advanced enrichment programs."
                    : selectedSection.cp >= 50
                    ? "This section shows moderate potential. Focus on weak subjects and increase engagement."
                    : "This section needs urgent intervention. Schedule remedial sessions and parent-teacher meetings."}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
