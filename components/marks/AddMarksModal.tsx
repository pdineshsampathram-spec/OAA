"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Search, Check, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { addMarkAction, bulkAddMarksAction } from "@/lib/actions/marks";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Student } from "@/lib/db/schema";

const EXAM_TYPES = [
  { value: "unit_test", label: "Unit Test" },
  { value: "midterm", label: "Midterm" },
  { value: "final", label: "Final" },
  { value: "assignment", label: "Assignment" },
] as const;

const SUBJECTS = [
  "Math",
  "Science",
  "English",
  "Social Studies",
  "Computer",
  "Telugu",
  "Art",
] as const;

// Zod schemas
const singleEntrySchema = z
  .object({
    studentId: z.string().min(1, "Please select a student"),
    subject: z.string().min(1, "Please select or type a subject"),
    examType: z.enum(["unit_test", "midterm", "final", "assignment"]),
    marks: z.coerce.number().min(0, "Marks must be 0 or greater"),
    maxMarks: z.coerce.number().min(1, "Max marks must be at least 1"),
  })
  .refine((data) => data.marks <= data.maxMarks, {
    message: "Marks cannot exceed maximum marks",
    path: ["marks"],
  });

type SingleEntryForm = z.infer<typeof singleEntrySchema>;

interface AddMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSuccess?: () => void;
}

export default function AddMarksModal({ isOpen, onClose, students, onSuccess }: AddMarksModalProps) {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Single entry form setup
  const {
    register: registerSingle,
    handleSubmit: handleSubmitSingle,
    watch: watchSingle,
    setValue: setValueSingle,
    reset: resetSingle,
    formState: { errors: errorsSingle },
  } = useForm<SingleEntryForm>({
    resolver: zodResolver(singleEntrySchema) as unknown as import("react-hook-form").Resolver<SingleEntryForm>,
    defaultValues: {
      studentId: "",
      subject: "Math",
      examType: "unit_test",
      marks: 0,
      maxMarks: 100,
    },
  });

  const selectedStudentId = watchSingle("studentId");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  const filteredStudentsForSelect = students.filter((s) =>
    s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  // Bulk entry states
  const [bulkClass, setBulkClass] = useState("10");
  const [bulkSection, setBulkSection] = useState("A");
  const [bulkSubject, setBulkSubject] = useState("Math");
  const [bulkExamType, setBulkExamType] = useState<"unit_test" | "midterm" | "final" | "assignment">("unit_test");
  const [bulkMaxMarks, setBulkMaxMarks] = useState<number>(100);
  const [bulkMarksList, setBulkMarksList] = useState<{ studentId: string; name: string; marks: string }[]>([]);

  // Unique classes/sections from students list for dropdowns
  const availableClasses = Array.from(new Set(students.map((s) => s.class))).sort();
  const availableSections = Array.from(new Set(students.map((s) => s.section))).sort();

  // Load students for bulk entry when class/section filters change
  useEffect(() => {
    const studentsInClass = students.filter(
      (s) => s.class === bulkClass && s.section === bulkSection
    );
    setBulkMarksList(
      studentsInClass.map((s) => ({
        studentId: s.id,
        name: s.name,
        marks: "",
      }))
    );
  }, [bulkClass, bulkSection, students, isOpen]);

  const onSingleSubmit = async (data: SingleEntryForm) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await addMarkAction({
        id: `mark_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        studentId: data.studentId,
        subject: data.subject,
        examType: data.examType,
        marks: data.marks,
        maxMarks: data.maxMarks,
        recordedBy: user?.id || null,
      });

      if (res.success) {
        resetSingle();
        setStudentSearchQuery("");
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.error || "Something went wrong.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    // Validate bulk inputs
    const recordsToInsert = [];
    for (const item of bulkMarksList) {
      if (item.marks.trim() === "") continue;

      const numericMark = Number(item.marks);
      if (isNaN(numericMark) || numericMark < 0) {
        setErrorMsg(`Invalid score entered for ${item.name}. Must be a non-negative number.`);
        setIsSubmitting(false);
        return;
      }

      if (numericMark > bulkMaxMarks) {
        setErrorMsg(`Score for ${item.name} (${numericMark}) cannot exceed maximum marks (${bulkMaxMarks}).`);
        setIsSubmitting(false);
        return;
      }

      recordsToInsert.push({
        id: `mark_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${item.studentId}`,
        studentId: item.studentId,
        subject: bulkSubject,
        examType: bulkExamType,
        marks: numericMark,
        maxMarks: bulkMaxMarks,
        recordedBy: user?.id || null,
      });
    }

    if (recordsToInsert.length === 0) {
      setErrorMsg("Please enter scores for at least one student.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await bulkAddMarksAction(recordsToInsert);
      if (res.success) {
        setBulkMarksList((prev) => prev.map((item) => ({ ...item, marks: "" })));
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.error || "Failed to save bulk marks.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkMarkChange = (studentId: string, val: string) => {
    setBulkMarksList((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, marks: val } : item))
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-[95vw] max-h-[85vh] p-6 z-50 overflow-y-auto flex flex-col focus:outline-none">
          
          <Dialog.Title className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Add Student Marks
          </Dialog.Title>
          <Dialog.Description className="text-xs text-slate-400 mt-1">
            Input academic results. Ensure entered scores do not exceed maximum score limits.
          </Dialog.Description>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Error Message banner */}
          {errorMsg && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Custom Tabs */}
          <div className="flex border-b border-slate-100 mt-6 mb-4">
            <button
              onClick={() => {
                setActiveTab("single");
                setErrorMsg(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition ${
                activeTab === "single"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Single Entry
            </button>
            <button
              onClick={() => {
                setActiveTab("bulk");
                setErrorMsg(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition ${
                activeTab === "bulk"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Bulk Entry (Class Sheet)
            </button>
          </div>

          {/* TAB CONTENT: SINGLE ENTRY */}
          {activeTab === "single" && (
            <form onSubmit={handleSubmitSingle(onSingleSubmit)} className="space-y-4 flex-1">
              {/* Student searchable selector */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Student</label>
                <div className="relative">
                  <div
                    onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-sm text-slate-700 cursor-pointer flex justify-between items-center hover:bg-slate-100/50 transition"
                  >
                    <span>
                      {selectedStudentId
                        ? students.find((s) => s.id === selectedStudentId)?.name || "Select Student"
                        : "Select Student..."}
                    </span>
                    <span className="text-slate-400 text-xs">▼</span>
                  </div>

                  {isStudentDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-150 rounded-2xl shadow-xl p-2 z-50 max-h-60 overflow-y-auto">
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search student..."
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-slate-50 border border-slate-200/85 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-0.5">
                        {filteredStudentsForSelect.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">No students found</div>
                        ) : (
                          filteredStudentsForSelect.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setValueSingle("studentId", s.id, { shouldValidate: true });
                                setIsStudentDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-indigo-50/50 text-left transition ${
                                selectedStudentId === s.id
                                  ? "bg-indigo-50 text-indigo-700 font-medium"
                                  : "text-slate-600"
                              }`}
                            >
                              <span>
                                {s.name} (Class {s.class}
                                {s.section})
                              </span>
                              {selectedStudentId === s.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {errorsSingle.studentId && (
                  <p className="text-[10px] text-rose-500 mt-1 font-medium">{errorsSingle.studentId.message}</p>
                )}
              </div>

              {/* Subject & Exam Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject</label>
                  <select
                    {...registerSingle("subject")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition"
                  >
                    {SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Exam Type</label>
                  <select
                    {...registerSingle("examType")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition"
                  >
                    {EXAM_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Marks & Max Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Marks Obtained</label>
                  <input
                    type="number"
                    step="any"
                    {...registerSingle("marks")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition"
                  />
                  {errorsSingle.marks && (
                    <p className="text-[10px] text-rose-500 mt-1 font-medium">{errorsSingle.marks.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Maximum Marks</label>
                  <input
                    type="number"
                    step="any"
                    {...registerSingle("maxMarks")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition"
                  />
                  {errorsSingle.maxMarks && (
                    <p className="text-[10px] text-rose-500 mt-1 font-medium">{errorsSingle.maxMarks.message}</p>
                  )}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 px-5 text-xs font-semibold transition shadow-md shadow-indigo-100 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Marks"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB CONTENT: BULK ENTRY */}
          {activeTab === "bulk" && (
            <form onSubmit={onBulkSubmit} className="space-y-4 flex-grow flex flex-col min-h-0">
              {/* Dropdowns for class, section, subject, exam type */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Class</label>
                  <select
                    value={bulkClass}
                    onChange={(e) => setBulkClass(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-xl px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                  >
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        Class {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Section</label>
                  <select
                    value={bulkSection}
                    onChange={(e) => setBulkSection(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-xl px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                  >
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject</label>
                  <select
                    value={bulkSubject}
                    onChange={(e) => setBulkSubject(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-xl px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                  >
                    {SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Exam Type</label>
                  <select
                    value={bulkExamType}
                    onChange={(e) => setBulkExamType(e.target.value as unknown as "unit_test" | "midterm" | "final" | "assignment")}
                    className="w-full bg-white border border-slate-200/80 rounded-xl px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                  >
                    {EXAM_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={bulkMaxMarks}
                    onChange={(e) => setBulkMaxMarks(Number(e.target.value) || 100)}
                    className="w-full bg-white border border-slate-200/80 rounded-xl px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* List of students with inputs */}
              <div className="flex-1 min-h-[200px] max-h-[350px] overflow-y-auto border border-slate-100 rounded-2xl">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-left">
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Name</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right w-40">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {bulkMarksList.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-xs text-slate-400">
                          No students found in Class {bulkClass}-{bulkSection}.
                        </td>
                      </tr>
                    ) : (
                      bulkMarksList.map((item) => (
                        <tr key={item.studentId} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 text-xs font-medium text-slate-700">{item.name}</td>
                          <td className="px-4 py-2 w-40 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="text"
                                placeholder="--"
                                value={item.marks}
                                onChange={(e) => handleBulkMarkChange(item.studentId, e.target.value)}
                                className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                              />
                              <span className="text-[10px] text-slate-400 font-bold">/ {bulkMaxMarks}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || bulkMarksList.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 px-5 text-xs font-semibold transition shadow-md shadow-indigo-100 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving Sheet...
                    </>
                  ) : (
                    "Save All Marks"
                  )}
                </button>
              </div>
            </form>
          )}

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
