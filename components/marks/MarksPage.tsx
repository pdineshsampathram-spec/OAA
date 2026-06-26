"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import AddMarksModal from "./AddMarksModal";
import { updateMarkAction, deleteMarkAction } from "@/lib/actions/marks";
import { formatDate } from "@/lib/utils";
import type { Student } from "@/lib/db/schema";

interface MarkWithStudent {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  subject: string;
  examType: string;
  marks: number;
  maxMarks: number;
  recordedBy: string | null;
  createdAt: string;
}

interface MarksPageProps {
  initialMarks: MarkWithStudent[];
  students: Student[];
}

export default function MarksPage({ initialMarks, students }: MarksPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state for optimistic updates
  const [localMarks, setLocalMarks] = useState<MarkWithStudent[]>(initialMarks);
  
  // Sync local state when initialMarks changes (e.g., from server revalidation)
  useEffect(() => {
    setLocalMarks(initialMarks);
  }, [initialMarks]);

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedExamType, setSelectedExamType] = useState("all");

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Toast notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Get unique filter values from current data
  const classes = Array.from(new Set(students.map((s) => s.class))).sort();
  const subjects = ["Math", "Science", "English", "Social Studies", "Computer", "Telugu", "Art"];
  const examTypes = [
    { value: "unit_test", label: "Unit Test" },
    { value: "midterm", label: "Midterm" },
    { value: "final", label: "Final" },
    { value: "assignment", label: "Assignment" },
  ];

  // Helper for grade calculation
  const getGrade = (marks: number, maxMarks: number) => {
    const pct = (marks / maxMarks) * 100;
    if (pct >= 90) return { label: "A+", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (pct >= 80) return { label: "A", color: "bg-teal-50 text-teal-700 border-teal-200" };
    if (pct >= 70) return { label: "B+", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    if (pct >= 60) return { label: "B", color: "bg-blue-50 text-blue-700 border-blue-200" };
    if (pct >= 50) return { label: "C", color: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "F", color: "bg-rose-50 text-rose-700 border-rose-200" };
  };

  // Filter marks
  const filteredMarks = localMarks.filter((mark) => {
    const matchesSearch = mark.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === "all" || mark.class === selectedClass;
    const matchesSubject = selectedSubject === "all" || mark.subject === selectedSubject;
    const matchesExamType = selectedExamType === "all" || mark.examType === selectedExamType;
    return matchesSearch && matchesClass && matchesSubject && matchesExamType;
  });

  // Handle double click to edit
  const handleStartEdit = (id: string, currentVal: number) => {
    setEditingId(id);
    setEditValue(currentVal.toString());
  };

  // Save edit value
  const handleSaveEdit = async (mark: MarkWithStudent) => {
    const newMarksVal = Number(editValue);
    
    // Validations
    if (isNaN(newMarksVal) || editValue.trim() === "" || newMarksVal < 0) {
      showNotification("error", "Please enter a valid non-negative number.");
      setEditingId(null);
      return;
    }

    if (newMarksVal > mark.maxMarks) {
      showNotification("error", `Marks obtained (${newMarksVal}) cannot exceed max marks (${mark.maxMarks}).`);
      setEditingId(null);
      return;
    }

    if (newMarksVal === mark.marks) {
      setEditingId(null);
      return;
    }

    // Optimistic Update
    const previousMarks = [...localMarks];
    setLocalMarks((prev) =>
      prev.map((m) => (m.id === mark.id ? { ...m, marks: newMarksVal } : m))
    );
    setEditingId(null);

    // Call Action
    try {
      const res = await updateMarkAction(mark.id, newMarksVal);
      if (res.success) {
        showNotification("success", `Updated marks for ${mark.studentName} successfully.`);
        startTransition(() => {
          router.refresh();
        });
      } else {
        // Rollback
        setLocalMarks(previousMarks);
        showNotification("error", res.error || "Failed to update marks.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setLocalMarks(previousMarks);
      showNotification("error", message);
    }
  };

  // Delete Action
  const handleDelete = async (id: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete this mark record for ${studentName}?`)) return;

    const previousMarks = [...localMarks];
    // Optimistic Update
    setLocalMarks((prev) => prev.filter((m) => m.id !== id));

    try {
      const res = await deleteMarkAction(id);
      if (res.success) {
        showNotification("success", "Mark record deleted.");
        startTransition(() => {
          router.refresh();
        });
      } else {
        setLocalMarks(previousMarks);
        showNotification("error", res.error || "Failed to delete record.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setLocalMarks(previousMarks);
      showNotification("error", message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-xs font-semibold max-w-sm ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                : "bg-rose-50 border-rose-100 text-rose-800"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Filter and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-4xl">
          {/* Search bar */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition duration-200"
            />
          </div>

          {/* Class Filter */}
          <div className="relative min-w-[120px]">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition duration-200"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Subject Filter */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition duration-200"
            >
              <option value="all">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Exam Type Filter */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition duration-200"
            >
              <option value="all">All Exam Types</option>
              {examTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Reset Filters */}
          {(searchQuery || selectedClass !== "all" || selectedSubject !== "all" || selectedExamType !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedClass("all");
                setSelectedSubject("all");
                setSelectedExamType("all");
              }}
              className="p-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 rounded-xl transition flex items-center gap-1.5"
            >
              Reset
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              startTransition(() => {
                router.refresh();
              });
            }}
            disabled={isPending}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition flex items-center justify-center"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 px-4 text-xs font-semibold transition shadow-md shadow-indigo-100 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Marks
          </button>
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden select-none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class</th>
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exam Type</th>
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Marks / Max Marks</th>
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Grade</th>
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence initial={false}>
                {filteredMarks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-xs text-slate-400">
                      No matching marks records found. Click &quot;Add Marks&quot; to log a result.
                    </td>
                  </tr>
                ) : (
                  filteredMarks.map((mark) => {
                    const grade = getGrade(mark.marks, mark.maxMarks);
                    const isEditing = editingId === mark.id;
                    const pct = Math.round((mark.marks / mark.maxMarks) * 100);

                    return (
                      <motion.tr
                        key={mark.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="hover:bg-slate-50/50 group transition duration-150"
                      >
                        <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                          {mark.studentName}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {mark.class}-{mark.section}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">
                          {mark.subject}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 capitalize">
                          {mark.examType.replace("_", " ")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveEdit(mark)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEdit(mark);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                autoFocus
                                className="w-16 bg-white border-2 border-indigo-500 rounded-lg px-1.5 py-0.5 text-xs text-right font-semibold text-slate-800 focus:outline-none transition shadow-sm"
                              />
                              <span className="text-[10px] text-slate-400 font-bold">/ {mark.maxMarks}</span>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleStartEdit(mark.id, mark.marks)}
                              className="cursor-pointer hover:bg-slate-100 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 transition"
                              title="Click to edit score"
                            >
                              <span>{mark.marks}</span>
                              <span className="text-slate-400 font-semibold text-[10px]">/ {mark.maxMarks}</span>
                              <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${grade.color}`}>
                            {grade.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {formatDate(mark.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDelete(mark.id, mark.studentName)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* AddMarksModal */}
      <AddMarksModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        students={students}
        onSuccess={() => {
          showNotification("success", "Marks recorded successfully!");
          startTransition(() => {
            router.refresh();
          });
        }}
      />
    </div>
  );
}
