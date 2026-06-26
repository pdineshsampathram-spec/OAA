"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Database,
  ArrowRight,
  Shield,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";

interface StudentPreview {
  studentId?: string;
  name: string;
  email?: string;
  class: string;
  section: string;
  gender: string;
  marks?: Array<{ subject: string; marks: number; maxMarks: number }>;
  academicMarks?: Array<{ subject: string; marks: number; max_marks: number }>;
  skills?: Array<{ skillName: string; proficiencyLevel: string }>;
  projects?: Array<{ title: string; description?: string; techStack?: string; repoUrl?: string; score?: number }>;
}

export default function IngestPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"excel" | "transcript">("excel");
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<StudentPreview[] | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setPreviewData(null);
      setErrorMsg(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewData(null);
      setErrorMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    setErrorMsg(null);
    setPreviewData(null);

    const formData = new FormData();
    formData.append("file", file);

    const endpoint = activeTab === "excel" ? "/api/admin/ingest/excel" : "/api/admin/ingest/transcript";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to process the document.");
      }

      if (data.success) {
        if (activeTab === "excel") {
          setPreviewData(data.data);
        } else {
          setPreviewData([data.data]);
        }
      } else {
        throw new Error("Invalid response status from server.");
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      setErrorMsg(error.message || "An unexpected error occurred during processing.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData) return;
    setIsCommitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch("/api/admin/ingest/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: previewData }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to commit records to database.");
      }

      if (data.success) {
        setSuccessMsg(`Successfully committed ${data.count} student profiles and updated OAA ranks!`);
        setPreviewData(null);
        setFile(null);
        setTimeout(() => {
          setSuccessMsg(null);
          router.push("/dashboard/admin/students");
        }, 3000);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      setErrorMsg(error.message || "Failed to commit ingestion.");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/[0.04] dark:border-white/[0.04] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <Database className="w-8 h-8 text-indigo-500" />
            Resilient Ingestion Gateway
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Ingest academic records into the OAA database. Map columns dynamically on spreadsheets or extract structured data from student transcript PDFs via Gemini AI.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-400 rounded-xl text-xs font-semibold self-start">
          <Shield className="w-4 h-4" />
          <span>DPDP Act 2023 Compliant Ingestion Pipeline</span>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-black/[0.04] dark:border-white/[0.04] p-1 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl max-w-md">
        <button
          onClick={() => {
            if (!isLoading && !isCommitting) {
              setActiveTab("excel");
              setFile(null);
              setPreviewData(null);
              setErrorMsg(null);
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition duration-200 ${
            activeTab === "excel"
              ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white shadow-sm border border-black/[0.02] dark:border-white/[0.02]"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Spreadsheet (CSV / Excel)
        </button>
        <button
          onClick={() => {
            if (!isLoading && !isCommitting) {
              setActiveTab("transcript");
              setFile(null);
              setPreviewData(null);
              setErrorMsg(null);
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition duration-200 ${
            activeTab === "transcript"
              ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white shadow-sm border border-black/[0.02] dark:border-white/[0.02]"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          Gemini PDF Transcript Parsing
        </button>
      </div>

      {/* Main Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Upload Container */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-950 border border-black/[0.04] dark:border-white/[0.04] rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              {activeTab === "excel" ? "Upload Spreadsheet" : "Upload Single Transcript PDF"}
            </h2>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[220px] ${
                dragActive
                  ? "border-indigo-500 bg-indigo-500/5"
                  : "border-slate-200 dark:border-zinc-800 hover:border-indigo-500/40 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30"
              }`}
            >
              <input
                id="file-upload"
                type="file"
                accept={activeTab === "excel" ? ".csv, .xlsx, .xls" : ".pdf"}
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading || isCommitting}
              />
              <label htmlFor="file-upload" className="cursor-pointer w-full flex flex-col items-center justify-center">
                <div className="p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl text-slate-500 dark:text-zinc-400 mb-4 shadow-inner">
                  <Upload className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Drag and drop file here
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  or click to select file from device
                </span>
                <span className="text-[9px] text-slate-400 dark:text-zinc-500 block mt-3 font-semibold uppercase tracking-wider">
                  {activeTab === "excel" ? "Supports CSV, XLSX, XLS" : "Supports PDF transcripts"}
                </span>
              </label>
            </div>

            {/* Selected File Display */}
            {file && (
              <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 border border-slate-150 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2.5 truncate">
                  {activeTab === "excel" ? (
                    <FileSpreadsheet className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  ) : (
                    <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  )}
                  <span className="text-slate-700 dark:text-zinc-300 truncate">{file.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || isLoading || isCommitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/10 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {activeTab === "excel" ? "Mapping Columns..." : "Structured Extracting via Gemini..."}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {activeTab === "excel" ? "Run Similarity Column Mapping" : "Parse Transcript with Gemini"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info or Preview */}
        <div className="lg:col-span-7 space-y-6">
          {/* Notification banners */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 rounded-2xl flex items-center gap-3 text-xs md:text-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-2xl flex items-center gap-3 text-xs md:text-sm"
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview data details */}
          {previewData ? (
            <div className="bg-white dark:bg-zinc-950 border border-black/[0.04] dark:border-white/[0.04] rounded-3xl p-6 md:p-8 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.04] dark:border-white/[0.04] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    Preview Parsed Records
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                    Verify mapped academic rows before commit
                  </p>
                </div>
                <button
                  onClick={handleCommit}
                  disabled={isCommitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-2.5 px-4 text-xs font-bold transition shadow-md shadow-emerald-600/10 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                >
                  {isCommitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Writing to DB...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>Commit to Database</span>
                    </>
                  )}
                </button>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto max-h-[400px] border border-black/[0.04] dark:border-white/[0.04] rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-black/[0.04] dark:border-white/[0.04] font-bold text-slate-700 dark:text-zinc-300 select-none">
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Class/Sec</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Subjects Parsed</th>
                      {activeTab === "transcript" && <th className="p-3">Skills / Projects</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => {
                      const marksList = row.marks || row.academicMarks || [];
                      const skillsList = row.skills || [];
                      const projList = row.projects || [];
                      
                      return (
                        <tr key={idx} className="border-b border-black/[0.02] dark:border-white/[0.02] text-slate-600 dark:text-zinc-400 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                          <td className="p-3 font-semibold text-slate-800 dark:text-white">{row.name}</td>
                          <td className="p-3 font-bold text-slate-500">{row.class}-{row.section}</td>
                          <td className="p-3 font-medium text-slate-500">{row.email || "Auto-Generated"}</td>
                          <td className="p-3 max-w-[200px]">
                            <div className="flex flex-wrap gap-1">
                              {marksList.length > 0 ? (
                                (marksList as Array<{ subject: string; marks: number }>).map((m, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-[9px] rounded font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/50">
                                    {m.subject}: {m.marks}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-400">None</span>
                              )}
                            </div>
                          </td>
                          {activeTab === "transcript" && (
                            <td className="p-3">
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-1">
                                  {skillsList.map((s, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-[9px] rounded font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/50">
                                      {s.skillName} ({s.proficiencyLevel})
                                    </span>
                                  ))}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {projList.map((p, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-[9px] rounded font-bold text-amber-700 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/50">
                                      Proj: {p.title} (Score: {p.score})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Help / Info Card */
            <div className="bg-slate-50 dark:bg-zinc-900/20 border border-slate-200/60 dark:border-zinc-800 p-6 md:p-8 rounded-3xl space-y-6">
              <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                How the Ingestion Engine Works
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-500 leading-relaxed">
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                    Spreadsheet column mapping
                  </div>
                  <p>
                    OAA uses token similarity matching algorithms to read column headers. It automatically normalizes varying names like &quot;Roll Number&quot;, &quot;Student Name&quot;, or &quot;Math Marks&quot; into clean database properties.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    Structured Gemini Extraction
                  </div>
                  <p>
                    Uploading a PDF transcript routes its contents into Gemini API. It uses custom schemas to extract unstructured transcript blocks into fully validated student, mark, skill, and project tables in one run.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
