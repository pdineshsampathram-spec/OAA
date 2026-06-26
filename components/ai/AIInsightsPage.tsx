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
  const [currentPhase, setCurrentPhase] = useState("Initializing analyzer...");
  
  // Toast notifications
  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error" | "info"; description: string } | null>(null);

  const showToast = (variant: "success" | "error" | "info", description: string) => {
    setToast({ open: true, variant, description });
  };

  // Classify risk levels
  const classifiedPredictions = useMemo(() => {
    return predictions.map((p) => {
      const normalizedScore = p.score > 1 ? p.score / 100 : p.score;
      let riskLevel: "High" | "Medium" | "Low" = "Low";
      if (normalizedScore >= 0.70) riskLevel = "High";
      else if (normalizedScore >= 0.35) riskLevel = "Medium";
      
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

      const phases = [
        "Accessing academic records...",
        "Evaluating attendance margins...",
        "Checking absent streaks...",
        "Running AI classification model...",
        "Structuring personalized action items..."
      ];

      // Simulate high-speed AI telemetry phases
      let phaseIdx = 0;
      setCurrentPhase(phases[0]);
      const phaseInterval = setInterval(() => {
        phaseIdx++;
        if (phaseIdx < phases.length) {
          setCurrentPhase(phases[phaseIdx]);
        }
      }, 70);

      try {
        const response = await fetch("/api/ai/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: student.id }),
        });

        clearInterval(phaseInterval);
        setCurrentPhase("Persisted prediction successfully.");

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
        clearInterval(phaseInterval);
        setCurrentPhase("Prediction failed.");
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

          {/* Premium Immersive Evaluation Loader Overlay */}
          <AnimatePresence>
            {isRunning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 20 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center"
                >
                  {/* Background soft radial glow */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Pulsing and Rotating Core Scanning Element */}
                  <div className="relative flex justify-center mb-8">
                    {/* Ring ripples */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-24 h-24 rounded-full border border-indigo-500/25 animate-ping absolute" />
                      <div className="w-32 h-32 rounded-full border border-violet-500/15 animate-pulse absolute" />
                    </div>
                    
                    {/* Glowing active core */}
                    <div className="relative w-20 h-20 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Brain className="w-10 h-10 text-white animate-pulse" />
                    </div>
                  </div>

                  {/* Analyzer Title */}
                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight">AI Risk Diagnostics Running</h3>
                  <p className="text-indigo-200/60 text-xs max-w-sm mx-auto mb-6 leading-relaxed">
                    Executing random forest inference pipelines across multi-layered student academic and attendance data models.
                  </p>

                  {/* Progress Telemetry Console */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 mb-6 text-left space-y-4 shadow-inner">
                    <div className="flex justify-between items-center text-xs font-semibold text-indigo-300">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                        Student: <strong className="text-white">{currentRunningName}</strong>
                      </span>
                      <span className="text-indigo-400/80">{progressIndex + 1} of {students.length}</span>
                    </div>

                    {/* Progress slider bar */}
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                      <motion.div
                        className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>

                    {/* Live Scrolling Console Feed */}
                    <div className="font-mono text-2xs space-y-1.5 text-indigo-400 bg-slate-950 p-3 rounded-lg border border-slate-900/60 h-24 overflow-hidden flex flex-col justify-end select-none">
                      <div className="opacity-40 select-none">
                        {progressIndex > 0 ? `✓ Completed: ${students[progressIndex - 1]?.name || ""}` : "System status: Ready"}
                      </div>
                      <div className="text-indigo-300 animate-pulse flex items-center gap-1.5">
                        <span className="text-indigo-500">&gt;</span> {currentPhase}
                      </div>
                    </div>
                  </div>

                  {/* Batch Completion Percentage */}
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Batch Completion: {Math.round(progressPercent)}%
                  </div>
                </motion.div>
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
                  const pScore = pred.score > 1 ? pred.score / 100 : pred.score;
                  const rScorePct = Math.round(pScore * 100);
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
