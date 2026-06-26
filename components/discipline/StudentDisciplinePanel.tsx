"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, User, Shield } from "lucide-react";
import RedDotBadge from "./RedDotBadge";
import { cn, formatDate } from "@/lib/utils";

interface DotHistoryEntry {
  id: string;
  reason: string;
  dotCount: number;
  actionTaken: string;
  portalRestriction: string;
  createdAt: string;
  issuedByName: string;
  issuedByRole: string;
}

interface Restriction {
  dotCount: number;
  restriction: string;
  canChat: boolean;
  canCreateTeams: boolean;
  isLocked: boolean;
  excludedFromLeaderboard: boolean;
}

interface StudentDisciplinePanelProps {
  studentId: string;
}

export default function StudentDisciplinePanel({ studentId }: StudentDisciplinePanelProps) {
  const [history, setHistory] = useState<DotHistoryEntry[]>([]);
  const [restriction, setRestriction] = useState<Restriction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [histRes, checkRes] = await Promise.all([
          fetch(`/api/discipline?studentId=${studentId}`),
          fetch(`/api/discipline?studentId=${studentId}&check=true`),
        ]);
        const histData = await histRes.json();
        const checkData = await checkRes.json();
        setHistory(histData.data || []);
        setRestriction(checkData.data || null);
      } catch (err) {
        console.error("Failed to fetch discipline data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="w-6 h-6 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const dotCount = restriction?.dotCount || 0;

  return (
    <div className="space-y-6">
      {/* Badge + Restriction Summary */}
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <RedDotBadge dotCount={dotCount} size="lg" />

        {restriction && (
          <div className="flex-1 grid grid-cols-2 gap-3 text-xs">
            <div className={cn("p-3 rounded-xl border", restriction.canChat ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
              <span className="font-bold">{restriction.canChat ? "✓" : "✗"} Chat Access</span>
            </div>
            <div className={cn("p-3 rounded-xl border", restriction.canCreateTeams ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
              <span className="font-bold">{restriction.canCreateTeams ? "✓" : "✗"} Create Teams</span>
            </div>
            <div className={cn("p-3 rounded-xl border", !restriction.isLocked ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
              <span className="font-bold">{restriction.isLocked ? "✗ Locked" : "✓ Active"}</span>
            </div>
            <div className={cn("p-3 rounded-xl border", !restriction.excludedFromLeaderboard ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
              <span className="font-bold">{restriction.excludedFromLeaderboard ? "✗ Excluded" : "✓ Leaderboard"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          Discipline History
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-bold text-emerald-600">Clean Record</p>
            <p>No disciplinary actions on file.</p>
          </div>
        ) : (
          <div className="relative space-y-0 ml-4">
            {/* Timeline line */}
            <div className="absolute left-3 top-4 bottom-4 w-px bg-rose-200" />

            {history.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className="relative flex items-start gap-4 py-3"
              >
                {/* Dot on timeline */}
                <div className="relative z-10 mt-0.5 w-6 h-6 rounded-full bg-rose-500 border-2 border-white shadow-md flex items-center justify-center text-[9px] font-bold text-white">
                  {entry.dotCount}
                </div>

                {/* Content */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{entry.reason}</p>
                    <span className={cn(
                      "shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg",
                      entry.actionTaken === "warning" ? "bg-amber-50 text-amber-600" :
                      entry.actionTaken === "hearing" ? "bg-orange-50 text-orange-600" :
                      "bg-rose-50 text-rose-600"
                    )}>
                      {entry.actionTaken.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {entry.issuedByName || "Faculty"} ({entry.issuedByRole})
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
