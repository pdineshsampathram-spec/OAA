"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getInitials } from "@/lib/utils";
import { deleteStudentAction, updateStudentAction } from "@/lib/actions/students";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface StudentWithStats {
  id: string;
  name: string;
  class: string;
  section: string;
  gender: string;
  schoolId: string | null;
  createdAt: string;
  avgMarks: number;
  attendanceRate: number;
  riskFlag: boolean;
  rank: number;
  skills: string[];
}

interface StudentTableProps {
  students: StudentWithStats[];
  onRefresh: () => void;
}

type SortField = "name" | "class" | "section" | "avgMarks" | "attendanceRate";
type SortOrder = "asc" | "desc";

const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
const SECTIONS = ["A", "B", "C", "D", "E"] as const;
const GENDERS = ["Male", "Female", "Other"] as const;

const editSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  class: z.enum(CLASSES),
  section: z.enum(SECTIONS),
  gender: z.enum(GENDERS),
});

type EditFormData = z.infer<typeof editSchema>;

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

export default function StudentTable({ students, onRefresh }: StudentTableProps) {
  const router = useRouter();
  const { role } = useCurrentUser();

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Edit modal state
  const [editingStudent, setEditingStudent] = useState<StudentWithStats | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors: editErrors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  });

  const handleOpenEdit = (e: React.MouseEvent, student: StudentWithStats) => {
    e.stopPropagation(); // prevent row click navigate
    setEditingStudent(student);
    setEditError(null);
    setValue("name", student.name);
    setValue("class", student.class as typeof CLASSES[number]);
    setValue("section", student.section as typeof SECTIONS[number]);
    setValue("gender", student.gender as typeof GENDERS[number]);
  };

  const handleEditSubmit = async (data: EditFormData) => {
    if (!editingStudent) return;
    setIsSubmittingEdit(true);
    setEditError(null);

    try {
      const res = await updateStudentAction(editingStudent.id, {
        name: data.name,
        class: data.class,
        section: data.section,
        gender: data.gender,
      });

      if (res.success) {
        showToast("success", `Updated student record for ${data.name}.`);
        setEditingStudent(null);
        onRefresh();
      } else {
        setEditError(res.error || "Failed to update student.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setEditError(message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Action
  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // prevent row click navigate
    if (!confirm(`Are you sure you want to delete the student record for ${name}?`)) return;

    try {
      const res = await deleteStudentAction(id);
      if (res.success) {
        showToast("success", "Student record successfully deleted.");
        onRefresh();
      } else {
        showToast("error", res.error || "Failed to delete student.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred.";
      showToast("error", message);
    }
  };

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Render sorting arrows
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-350" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3 h-3 text-indigo-500 font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-indigo-500 font-bold" />
    );
  };

  // Sort students list
  const sortedStudents = [...students].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (typeof valA === "string" && typeof valB === "string") {
      // Natural sorting for classes
      if (sortField === "class") {
        return sortOrder === "asc"
          ? Number(valA) - Number(valB)
          : Number(valB) - Number(valA);
      }
      return sortOrder === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    if (typeof valA === "number" && typeof valB === "number") {
      return sortOrder === "asc" ? valA - valB : valB - valA;
    }

    return 0;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden select-none">
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

      {/* Responsive Table View */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 text-center">#</th>
              <th
                onClick={() => handleSort("name")}
                className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition"
              >
                <div className="flex items-center gap-1">
                  Name {renderSortIcon("name")}
                </div>
              </th>
              <th
                onClick={() => handleSort("class")}
                className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition w-28"
              >
                <div className="flex items-center gap-1">
                  Class {renderSortIcon("class")}
                </div>
              </th>
              <th
                onClick={() => handleSort("section")}
                className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition w-28"
              >
                <div className="flex items-center gap-1">
                  Section {renderSortIcon("section")}
                </div>
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-28">Gender</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center w-24">Rank</th>
              <th
                onClick={() => handleSort("avgMarks")}
                className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition text-right w-32"
              >
                <div className="flex items-center justify-end gap-1">
                  Avg Marks {renderSortIcon("avgMarks")}
                </div>
              </th>
              <th
                onClick={() => handleSort("attendanceRate")}
                className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition text-right w-36"
              >
                <div className="flex items-center justify-end gap-1">
                  Attendance {renderSortIcon("attendanceRate")}
                </div>
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-48">Skills</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center w-24">Risk</th>
              {role !== "principal" && (
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center w-28">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedStudents.length === 0 ? (
              <tr>
                <td colSpan={role !== "principal" ? 11 : 10} className="px-6 py-16 text-center text-xs text-slate-400">
                  No matching student records found.
                </td>
              </tr>
            ) : (
              sortedStudents.map((student, idx) => {
                const avatarStyle = getAvatarStyle(student.name);
                const attPct = Math.round(student.attendanceRate * 100);
                const marksVal = Math.round(student.avgMarks);

                return (
                  <tr
                    key={student.id}
                    onClick={() => router.push(`/dashboard/admin/students/${student.id}`)}
                    className="hover:bg-slate-50/50 group cursor-pointer transition"
                  >
                    <td className="px-6 py-4 text-xs text-slate-400 text-center font-semibold">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-[10px] uppercase ${avatarStyle}`}>
                          {getInitials(student.name)}
                        </div>
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-650 transition">
                          {student.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-semibold">Class {student.class}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-semibold">Section {student.section}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-50 text-slate-500 border border-slate-100">
                        {student.gender}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                        #{student.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700 font-bold text-right">{marksVal}%</td>
                    <td className="px-6 py-4 text-xs text-slate-700 font-bold text-right">{attPct}%</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {student.skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-medium bg-slate-100/70 text-slate-600 border border-slate-200/40"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {student.riskFlag ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          At Risk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Low Risk
                        </span>
                      )}
                    </td>
                    {role !== "principal" && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(e, student)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Edit details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, student.id, student.name)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Student Dialog Modal */}
      <Dialog.Root open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-[95vw] p-6 z-50 focus:outline-none">
            
            <Dialog.Title className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-500" />
              Edit Student Details
            </Dialog.Title>
            <Dialog.Description className="text-xs text-slate-450 mt-1">
              Modify details for {editingStudent?.name}.
            </Dialog.Description>

            <button
              onClick={() => setEditingStudent(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {editError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-650 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(handleEditSubmit)} className="space-y-4 mt-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
                <input
                  type="text"
                  {...register("name")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition"
                />
                {editErrors.name && (
                  <p className="text-[10px] text-rose-500 mt-1 font-medium">{editErrors.name.message}</p>
                )}
              </div>

              {/* Class & Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Class</label>
                  <select
                    {...register("class")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition"
                  >
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Section</label>
                  <select
                    {...register("section")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition"
                  >
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>
                        Section {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gender</label>
                <select
                  {...register("gender")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition"
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 px-5 text-xs font-semibold transition shadow-md shadow-indigo-100 flex items-center gap-2"
                >
                  {isSubmittingEdit ? (
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
