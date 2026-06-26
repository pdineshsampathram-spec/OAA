"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  UserSquare, 
  Calendar, 
  X, 
  Download, 
  ChevronRight, 
  FileSpreadsheet, 
  Sparkles,
  Info
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/Toast";
import { getClassReportAction, getStudentReportAction, getAttendanceReportAction } from "@/lib/actions/reports";
import { generateClassPDF } from "@/lib/export/generateClassPDF";
import { generateStudentPDF } from "@/lib/export/generateStudentPDF";
import { generateAttendanceExcel } from "@/lib/export/generateAttendanceExcel";

interface StudentItem {
  id: string;
  name: string;
  class: string;
  section: string;
}

interface ReportsPageProps {
  students: StudentItem[];
  classes: string[];
}

type ReportType = "class" | "student" | "attendance";

export default function ReportsPage({ students, classes }: ReportsPageProps) {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form values
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Toast notifications
  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error" | "warning"; description: string } | null>(null);

  const showToast = (variant: "success" | "error" | "warning", description: string) => {
    setToast({ open: true, variant, description });
  };

  const reportCards = [
    {
      type: "class" as ReportType,
      title: "Class Summary Report",
      description: "Generate a comprehensive analysis of the entire class performance. Includes marks averages, pass ratios, top performing students list, and students marked as at-risk by our AI model.",
      icon: FileText,
      color: "from-blue-500 to-indigo-600",
      accent: "blue",
    },
    {
      type: "student" as ReportType,
      title: "Student Academic Profile",
      description: "Compile a printable individual student profile card. Incorporates subject performance tables, monthly attendance percentages, and personalized advice compiled from our prediction microservice.",
      icon: UserSquare,
      color: "from-purple-500 to-pink-600",
      accent: "purple",
    },
    {
      type: "attendance" as ReportType,
      title: "Monthly Attendance sheet",
      description: "Export full monthly attendance sheets in Microsoft Excel format. Features a cover summary dashboard and an detailed daily visual grid matrix sheet matching standard reporting metrics.",
      icon: Calendar,
      color: "from-emerald-500 to-teal-600",
      accent: "emerald",
    },
  ];

  const handleGenerate = async () => {
    if (!selectedType) return;
    setIsGenerating(true);

    try {
      if (selectedType === "class") {
        if (!selectedClass) {
          showToast("warning", "Please select a target class first.");
          setIsGenerating(false);
          return;
        }
        const res = await getClassReportAction(selectedClass);
        if (res.success && res.data) {
          generateClassPDF(res.data);
          showToast("success", "Class summary report generated and downloaded.");
          setSelectedType(null);
        } else {
          showToast("error", res.error || "Failed to generate class report.");
        }
      } else if (selectedType === "student") {
        if (!selectedStudentId) {
          showToast("warning", "Please select a student record.");
          setIsGenerating(false);
          return;
        }
        const studentName = students.find((s) => s.id === selectedStudentId)?.name || "student";
        const res = await getStudentReportAction(selectedStudentId);
        if (res.success && res.data) {
          generateStudentPDF(res.data);
          showToast("success", `Report card for ${studentName} successfully downloaded.`);
          setSelectedType(null);
        } else {
          showToast("error", res.error || "Failed to generate student report card.");
        }
      } else if (selectedType === "attendance") {
        if (!selectedClass) {
          showToast("warning", "Please select a target class.");
          setIsGenerating(false);
          return;
        }
        if (!selectedMonth) {
          showToast("warning", "Please pick a reporting month.");
          setIsGenerating(false);
          return;
        }
        const res = await getAttendanceReportAction(selectedClass, selectedMonth);
        if (res.success && res.data) {
          generateAttendanceExcel(res.data);
          showToast("success", "Excel monthly sheet generated successfully.");
          setSelectedType(null);
        } else {
          showToast("error", res.error || "Failed to build attendance sheet.");
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during export.";
      showToast("error", errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ToastProvider>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-80px)]">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
              Reports Hub & Exports
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Select, filter, and extract educational reports. Download printer-ready PDF reports or Excel logs.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold self-start">
            <Sparkles className="w-4 h-4" />
            <span>AI Risk Scoring baked directly into reports</span>
          </div>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-slate-600 text-xs leading-relaxed max-w-3xl">
          <Info className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
          <p>
            All generated reports represent immediate live database updates. Report layout and charts are auto-compiled on client-side sandboxes ensuring that patient/student demographics are served securely.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {reportCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.type}
                whileHover={{ y: -6, scale: 1.01 }}
                className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Accent Banner */}
                <div className={`h-2.5 bg-gradient-to-r ${card.color}`} />
                
                <div className="p-6 flex flex-col flex-grow space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 shadow-sm">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">{card.title}</h2>
                  </div>
                  
                  <p className="text-sm text-slate-500 leading-relaxed flex-grow">
                    {card.description}
                  </p>

                  <button
                    onClick={() => {
                      setSelectedType(card.type);
                      // Clear defaults
                      if (classes.length > 0 && !selectedClass) setSelectedClass(classes[0]);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 text-sm font-semibold rounded-xl transition"
                  >
                    <span>Configure & Generate</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Slide-out configuration panel */}
        <AnimatePresence>
          {selectedType && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => !isGenerating && setSelectedType(null)}
                className="fixed inset-0 bg-slate-900 z-40 backdrop-blur-[2px]"
              />

              {/* Sidebar Panel */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
                className="fixed top-0 bottom-0 right-0 w-full max-w-md bg-white shadow-2xl border-l border-slate-100 z-50 p-6 flex flex-col justify-between"
              >
                {/* Panel Header */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      {selectedType === "class" && "Class Report Filters"}
                      {selectedType === "student" && "Student Report Filters"}
                      {selectedType === "attendance" && "Attendance Export Config"}
                    </h3>
                    <button
                      disabled={isGenerating}
                      onClick={() => setSelectedType(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Dynamic filters based on type */}
                  <div className="space-y-5 py-4">
                    {selectedType === "class" && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Class</label>
                        <select
                          value={selectedClass}
                          onChange={(e) => setSelectedClass(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        >
                          <option value="">-- Choose Class --</option>
                          {classes.map((cls) => (
                            <option key={cls} value={cls}>Class {cls}</option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          This export compiles full GPA averages, grade classifications, and outputs student counts for the designated class.
                        </p>
                      </div>
                    )}

                    {selectedType === "student" && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Student</label>
                        <select
                          value={selectedStudentId}
                          onChange={(e) => setSelectedStudentId(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        >
                          <option value="">-- Choose Student --</option>
                          {students.map((stud) => (
                            <option key={stud.id} value={stud.id}>
                              {stud.name} (Class {stud.class} - {stud.section})
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          Outputs individual grades tables, attendance metrics breakdown, and risk assessment indicators mapped to standard layouts.
                        </p>
                      </div>
                    )}

                    {selectedType === "attendance" && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Class</label>
                          <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                          >
                            <option value="">-- Choose Class --</option>
                            {classes.map((cls) => (
                              <option key={cls} value={cls}>Class {cls}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Target Month</label>
                          <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          Builds spreadsheet worksheets containing a monthly attendance summary and full daily P/A/L layout keys for review in Excel.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Download Actions */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <button
                    disabled={isGenerating}
                    onClick={handleGenerate}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition disabled:opacity-75"
                  >
                    {isGenerating ? (
                      <>
                        <LoadingSpinner size="sm" color="border-white" />
                        <span>Compiling File Data...</span>
                      </>
                    ) : (
                      <>
                        {selectedType === "attendance" ? (
                          <FileSpreadsheet className="w-4 h-4" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>
                          Download {selectedType === "attendance" ? "Excel Sheet" : "PDF Report"}
                        </span>
                      </>
                    )}
                  </button>
                  
                  <button
                    disabled={isGenerating}
                    onClick={() => setSelectedType(null)}
                    className="w-full py-3 hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-sm font-semibold rounded-xl border border-transparent hover:border-slate-100 transition text-center disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
