"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, UserPlus, Loader2, AlertCircle } from "lucide-react";
import { addStudentAction } from "@/lib/actions/students";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
const SECTIONS = ["A", "B", "C", "D", "E"] as const;
const GENDERS = ["Male", "Female", "Other"] as const;

const studentFormSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  class: z.enum(CLASSES),
  section: z.enum(SECTIONS),
  gender: z.enum(GENDERS),
});

type StudentFormData = z.infer<typeof studentFormSchema>;

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (studentName: string) => void;
}

export default function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      class: "10",
      section: "A",
      gender: "Male",
    },
  });

  const onSubmit = async (data: StudentFormData) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const studentId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const schoolId = user?.schoolId || "school_1";

      // 1. Create the student record via Server Action
      const res = await addStudentAction({
        id: studentId,
        name: data.name,
        class: data.class,
        section: data.section,
        gender: data.gender,
        schoolId,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to add student record.");
        setIsSubmitting(false);
        return;
      }

      // 2. Trigger AI prediction calculation in background
      try {
        await fetch("/api/ai/predict", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ studentId }),
        });
      } catch (predictErr) {
        // Fail silently for prediction trigger since student record is successfully created
        console.error("AI Prediction generation trigger failed:", predictErr);
      }

      reset();
      onClose();
      onSuccess(data.name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-[95vw] p-6 z-50 overflow-y-auto flex flex-col focus:outline-none">
          
          <Dialog.Title className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-500" />
            Add New Student
          </Dialog.Title>
          <Dialog.Description className="text-xs text-slate-400 mt-1">
            Register a new student roster. Initial AI risk analysis will run automatically.
          </Dialog.Description>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Error Message */}
          {errorMsg && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-650 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                {...register("name")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition"
              />
              {errors.name && (
                <p className="text-[10px] text-rose-500 mt-1 font-medium">{errors.name.message}</p>
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
                {errors.class && (
                  <p className="text-[10px] text-rose-500 mt-1 font-medium">{errors.class.message}</p>
                )}
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
                {errors.section && (
                  <p className="text-[10px] text-rose-500 mt-1 font-medium">{errors.section.message}</p>
                )}
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
              {errors.gender && (
                <p className="text-[10px] text-rose-500 mt-1 font-medium">{errors.gender.message}</p>
              )}
            </div>

            {/* Auto-filled School Label */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">School Allocation:</span> Automatic placement into{" "}
              <span className="font-bold text-slate-700">{user?.schoolId ? "Demo High School" : "Active Workspace"}</span>.
            </div>

            {/* Footer Buttons */}
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
                className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl py-2.5 px-5 text-xs font-semibold transition shadow-md shadow-indigo-100 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Add Student"
                )}
              </button>
            </div>
          </form>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
