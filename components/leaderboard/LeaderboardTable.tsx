"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, TrendingUp, TrendingDown, Minus } from "lucide-react";
import RedDotBadge from "@/components/discipline/RedDotBadge";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  class: string;
  section: string;
  totalOaaScore: number;
  academicScore: number;
  skillsScore: number;
  projectScore: number;
  behaviorScore: number;
  percentileRank: number;
  redDotCount: number;
}

interface LeaderboardTableProps {
  initialData: LeaderboardEntry[];
  currentPage: number;
  pageSize: number;
}

type SortKey = "rank" | "totalOaaScore" | "academicScore" | "skillsScore" | "projectScore" | "behaviorScore";

const CLASSES = ["All", "1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["All", "A", "B", "C", "D"];

function getScoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

function getScoreBg(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function getMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

export default function LeaderboardTable({
  initialData,
  currentPage,
  pageSize,
}: LeaderboardTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("totalOaaScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [classFilter, setClassFilter] = useState(searchParams.get("class") || "All");
  const [sectionFilter, setSectionFilter] = useState(searchParams.get("section") || "All");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleFilterChange = (type: "class" | "section", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "All") {
      params.delete(type);
    } else {
      params.set(type, value);
    }
    params.set("page", "1");
    if (type === "class") setClassFilter(value);
    if (type === "section") setSectionFilter(value);
    router.push(`?${params.toString()}`);
  };

  const filteredData = useMemo(() => {
    let data = [...initialData];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((e) => e.name.toLowerCase().includes(q));
    }

    // Sort
    data.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });

    return data;
  }, [initialData, search, sortKey, sortDir]);

  const SortHeader = ({ label, sortKeyName, className }: { label: string; sortKeyName: SortKey; className?: string }) => (
    <th
      onClick={() => handleSort(sortKeyName)}
      className={cn("px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-slate-600 select-none transition", className)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyName && (
          <span className="text-indigo-500">{sortDir === "desc" ? "↓" : "↑"}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-4 flex flex-wrap items-center gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
          />
        </div>

        {/* Class dropdown */}
        <select
          value={classFilter}
          onChange={(e) => handleFilterChange("class", e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/20 outline-none transition cursor-pointer"
        >
          {CLASSES.map((c) => (
            <option key={c} value={c}>{c === "All" ? "All Classes" : c}</option>
          ))}
        </select>

        {/* Section dropdown */}
        <select
          value={sectionFilter}
          onChange={(e) => handleFilterChange("section", e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/20 outline-none transition cursor-pointer"
        >
          {SECTIONS.map((s) => (
            <option key={s} value={s}>{s === "All" ? "All Sections" : `Section ${s}`}</option>
          ))}
        </select>

        {/* Breakdown toggle */}
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition",
            showBreakdown
              ? "bg-indigo-50 border-indigo-200 text-indigo-600"
              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Breakdown
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <SortHeader label="Rank" sortKeyName="rank" className="w-20" />
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Student</th>
                <SortHeader label="OAA Score" sortKeyName="totalOaaScore" />
                <SortHeader label="Academic (/40)" sortKeyName="academicScore" />
                {showBreakdown && (
                  <>
                    <SortHeader label="Skills (/30)" sortKeyName="skillsScore" />
                    <SortHeader label="Projects (/20)" sortKeyName="projectScore" />
                  </>
                )}
                <SortHeader label="Behavior (/10)" sortKeyName="behaviorScore" />
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Red Dots</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Trend</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredData.map((entry, i) => {
                  const isLocked = entry.redDotCount >= 5;
                  return (
                    <motion.tr
                      key={entry.studentId}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      className={cn(
                        "border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors",
                        isLocked && "opacity-40"
                      )}
                    >
                      {/* Rank */}
                      <td className="px-4 py-4">
                        <span className={cn(
                          "text-lg font-extrabold",
                          entry.rank <= 3 && !isLocked ? "text-2xl" : "text-slate-500"
                        )}>
                          {isLocked ? entry.rank : getMedal(entry.rank)}
                        </span>
                      </td>

                      {/* Student */}
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{entry.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {entry.class} • Section {entry.section}
                          </p>
                        </div>
                      </td>

                      {/* OAA Score */}
                      <td className="px-4 py-4">
                        <span className={cn("text-xl font-extrabold", getScoreColor(entry.totalOaaScore))}>
                          {entry.totalOaaScore.toFixed(1)}
                        </span>
                      </td>

                      {/* Academic */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-600">{entry.academicScore.toFixed(1)}</span>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", getScoreBg(entry.academicScore / 40 * 100))} style={{ width: `${(entry.academicScore / 40) * 100}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* Skills (breakdown) */}
                      {showBreakdown && (
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-600">{entry.skillsScore.toFixed(1)}</span>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-violet-500" style={{ width: `${(entry.skillsScore / 30) * 100}%` }} />
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Projects (breakdown) */}
                      {showBreakdown && (
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-600">{entry.projectScore.toFixed(1)}</span>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${(entry.projectScore / 20) * 100}%` }} />
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Behavior */}
                      <td className="px-4 py-4">
                        <span className={cn(
                          "text-xs font-extrabold",
                          entry.behaviorScore < 6 ? "text-rose-500" : "text-slate-600"
                        )}>
                          {entry.behaviorScore.toFixed(1)}
                        </span>
                      </td>

                      {/* Red Dots */}
                      <td className="px-4 py-4">
                        <RedDotBadge dotCount={entry.redDotCount} size="sm" />
                      </td>

                      {/* Trend */}
                      <td className="px-4 py-4">
                        {entry.percentileRank >= 70 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : entry.percentileRank < 30 ? (
                          <TrendingDown className="w-4 h-4 text-rose-500" />
                        ) : (
                          <Minus className="w-4 h-4 text-slate-400" />
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">
            No students found matching your filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Showing {filteredData.length} of {initialData.length} students • Page {currentPage}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(Math.max(1, currentPage - 1)));
              router.push(`?${params.toString()}`);
            }}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <span className="text-sm font-bold text-slate-600 px-3">{currentPage}</span>
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(currentPage + 1));
              router.push(`?${params.toString()}`);
            }}
            disabled={initialData.length < pageSize}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
