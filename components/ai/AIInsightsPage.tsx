"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  Play, 
  ArrowRight,
  AlertCircle
} from "lucide-react";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/Toast";
import { getInitials } from "@/lib/utils";

interface StudentPrediction {
  id: string;
  studentId: string;
  riskFlag: 0 | 1;
  score: number;
  suggestions: string;
  createdAt: string;
  student: {
    name: string;
    class: string;
    section: string;
  };
}

interface StudentItem {
  id: string;
  name: string;
  class: string;
  section: string;
}

interface AIInsightsPageProps {
  initialPredictions: StudentPrediction[];
  students: StudentItem[];
}

type RiskTab = "all" | "high" | "medium" | "low";

export default function AIInsightsPage({ initialPredictions, students }: AIInsightsPageProps) {
  const router = useRouter();
  const [predictions, setPredictions] = useState<StudentPrediction[]>(initialPredictions);
  const [selectedTab, setSelectedTab] = useState<RiskTab>("all");
  
  // Sequential running predictions states
  const [isRunning, setIsRunning] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [currentRunningName, setCurrentRunningName] = useState("");
  
  // Toast notifications
  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error" | "info"; description: string } | null>(null);

  const showToast = (variant: "success" | "error" | "info", description: string) => {
    setToast({ open: true, variant, description });
  };

  // Classify risk levels
  const classifiedPredictions = useMemo(() => {
    return predictions.map((p) => {
      let riskLevel: "High" | "Medium" | "Low" = "Low";
      if (p.score >= 0.70) riskLevel = "High";
      else if (p.score >= 0.35) riskLevel = "Medium";
      
      let parsedSuggestions: string[] = [];
      try {
        parsedSuggestions = JSON.parse(p.suggestions);
      } catch {
        parsedSuggestions = [p.suggestions];
      }

      return {
        ...p,
        riskLevel,
        topSuggestion: parsedSuggestions[0] || "No actions flagged",
      };
    });
  }, [predictions]);

  // Risk stats counts
  const stats = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;

    classifiedPredictions.forEach((p) => {
      if (p.riskLevel === "High") high++;
      else if (p.riskLevel === "Medium") medium++;
      else low++;
    });

    return { high, medium, low, total: predictions.length };
  }, [classifiedPredictions, predictions]);

  // Filtered list based on active tab
  const filteredPredictions = useMemo(() => {
    return classifiedPredictions.filter((p) => {
      if (selectedTab === "high") return p.riskLevel === "High";
      if (selectedTab === "medium") return p.riskLevel === "Medium";
      if (selectedTab === "low") return p.riskLevel === "Low";
      return true;
    });
  }, [classifiedPredictions, selectedTab]);

  // Sequentially calculate predictions for all students
  const runBatchPredictions = async () => {
    if (students.length === 0) {
      showToast("error", "No students registered to evaluate predictions.");
      return;
    }

    setIsRunning(true);
    setProgressIndex(0);
    showToast("info", "Starting sequential AI evaluations...");

    const updatedList = [...predictions];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      setProgressIndex(i);
      setCurrentRunningName(student.name);

      try {
        const response = await fetch("/api/ai/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: student.id }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.prediction) {
            const pred = result.prediction;
            const formatted: StudentPrediction = {
              id: pred.id,
              studentId: pred.studentId,
              riskFlag: pred.riskFlag,
              score: pred.score,
              suggestions: pred.suggestions,
              createdAt: pred.createdAt,
              student: {
                name: student.name,
                class: student.class,
                section: student.section,
              },
            };

            // Update in place or append
            const idx = updatedList.findIndex(p => p.studentId === student.id);
            if (idx !== -1) {
              updatedList[idx] = formatted;
            } else {
              updatedList.unshift(formatted);
            }
            // Update local state during loop for visual updates
            setPredictions([...updatedList]);
          }
        }
      } catch (err) {
        console.error(`AI evaluation failed for ${student.name}:`, err);
      }

      // Small delay between calls to ease resource consumption
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setIsRunning(false);
    setProgressIndex(students.length);
    showToast("success", `Completed evaluations for all ${students.length} students!`);
    router.refresh();
  };

  // Progress calculations
  const progressPercent = students.length > 0 ? (progressIndex / students.length) * 100 : 0;

  return (
    <ToastProvider>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-80px)]">
        {/* Header Gradient Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-8 text-white shadow-xl overflow-hidden border border-indigo-900/40">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
                  <Brain className="w-7 h-7" />
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI-Powered Insights Hub</h1>
              </div>
              <p className="text-indigo-200/70 text-sm max-w-xl leading-relaxed">
                Utilize standard Random Forest classifiers trained on student grades, class attendance history, marks trend margins, and absent streaks to identify students needing guidance.
              </p>
            </div>
            
            <button
              disabled={isRunning}
              onClick={runBatchPredictions}
              className="flex items-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition self-start md:self-auto"
            >
              {isRunning ? (
                <>
                  <LoadingSpinner size="sm" color="border-white" />
                  <span>Evaluating Risk Logs...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Evaluate Predictions (All Students)</span>
                </>
              )}
            </button>
          </div>

          {/* Sequential Evaluation Progress Bar */}
          <AnimatePresence>
            {isRunning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-5 border-t border-indigo-900/50 space-y-2.5"
              >
                <div className="flex justify-between items-center text-xs font-semibold text-indigo-200">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                    Evaluating: <strong className="text-white">{currentRunningName}</strong>
                  </span>
                  <span>{progressIndex + 1} of {students.length} Students</span>
                </div>
                {/* Progress bar container */}
                <div className="h-2.5 bg-slate-950/80 rounded-full overflow-hidden border border-slate-900 shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ ease: "easeInOut" }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Risk Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card High Risk */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-rose-500" />
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">High Risk Profile</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-0.5">{stats.high}</h3>
            </div>
          </div>

          {/* Card Medium Risk */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-amber-500" />
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Medium Risk Profile</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-0.5">{stats.medium}</h3>
            </div>
          </div>

          {/* Card Low Risk */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-emerald-500" />
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Low Risk / On Track</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-0.5">{stats.low}</h3>
            </div>
          </div>
        </div>

        {/* Filters Tabs & Student List container */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Evaluated Students Registry
            </h2>

            {/* Tabs Selector */}
            <div className="flex bg-slate-50 border border-slate-200/60 rounded-xl p-1 gap-1 w-full md:w-auto">
              {(["all", "high", "medium", "low"] as RiskTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    selectedTab === tab
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab} ({tab === "all" ? stats.total : stats[tab as keyof typeof stats]})
                </button>
              ))}
            </div>
          </div>

          {/* Student list */}
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {filteredPredictions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2">
                <HelpCircle className="w-10 h-10 text-slate-300" />
                <span className="text-sm font-semibold">No students match selected risk filter.</span>
              </div>
            ) : (
              <motion.div
                layout
                className="min-w-[800px]"
              >
                {filteredPredictions.map((pred) => {
                  const rScorePct = Math.round(pred.score * 100);
                  const isHigh = pred.riskLevel === "High";
                  const isMedium = pred.riskLevel === "Medium";
                  
                  const riskBadge = isHigh
                    ? "bg-rose-50 text-rose-700 border-rose-100 font-extrabold"
                    : isMedium
                    ? "bg-amber-50 text-amber-700 border-amber-100 font-bold"
                    : "bg-emerald-50 text-emerald-700 border-emerald-100 font-semibold";

                  const progressBarColor = isHigh
                    ? "bg-rose-500 shadow-rose-500/10"
                    : isMedium
                    ? "bg-amber-500 shadow-amber-500/10"
                    : "bg-emerald-500 shadow-emerald-500/10";

                  return (
                    <div
                      key={pred.id}
                      className="px-6 py-4 flex items-center justify-between gap-6 hover:bg-slate-50/40 transition"
                    >
                      {/* Demographics */}
                      <div className="flex items-center gap-3 w-72 flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/50 flex items-center justify-center font-bold text-slate-600 text-sm shadow-inner uppercase">
                          {getInitials(pred.student.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{pred.student.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Class {pred.student.class} - Section {pred.student.section}</p>
                        </div>
                      </div>

                      {/* AI Risk state */}
                      <div className="w-28 flex-shrink-0">
                        <span className={`inline-block px-3 py-1.5 rounded-xl border text-2xs uppercase tracking-wider text-center w-full ${riskBadge}`}>
                          {pred.riskLevel} Risk
                        </span>
                      </div>

                      {/* Risk Score Progress Bar */}
                      <div className="flex-1 max-w-xs space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                          <span>Risk Score</span>
                          <span>{rScorePct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
                            style={{ width: `${rScorePct}%` }}
                          />
                        </div>
                      </div>

                      {/* Top Warning recommendation */}
                      <div className="flex-1 min-w-[200px] text-xs text-slate-500 leading-relaxed italic border-l border-slate-100 pl-4">
                        <span className="font-semibold text-slate-600 block not-italic uppercase tracking-wider text-2xs mb-0.5">Top Suggestion</span>
                        {pred.topSuggestion}
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => router.push(`/dashboard/admin/students/${pred.studentId}`)}
                        className="flex items-center gap-1.5 px-4.5 py-2.5 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-700 transition flex-shrink-0 shadow-sm"
                      >
                        <span>View Profile</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>

        {/* Custom Toast Render */}
        {toast && (
          <Toast
            open={toast.open}
            onOpenChange={(open) => setToast(open ? toast : null)}
            variant={toast.variant}
            description={toast.description}
          />
        )}
        <ToastViewport />
      </div>
    </ToastProvider>
  );
}
