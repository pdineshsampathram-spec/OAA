"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Lock,
  Save,
  UserCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import AttendanceCalendar from "./AttendanceCalendar";
import { saveAttendanceAction, getAttendanceByDateAction } from "@/lib/actions/attendance";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Student } from "@/lib/db/schema";

interface AttendancePageProps {
  students: Student[];
}

export default function AttendancePage({ students }: AttendancePageProps) {
  const router = useRouter();
  const { user, role, schoolId } = useCurrentUser();
  const [, startTransition] = useTransition();

  // Selected date state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateStr = selectedDate.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  const isPastDate = dateStr < todayStr;
  const isReadOnly = isPastDate && role === "teacher";

  // Filter states
  const [selectedClass, setSelectedClass] = useState("10");
  const [selectedSection, setSelectedSection] = useState("A");

  // Local attendance records state
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { id?: string; status: "present" | "absent" | "late" }>
  >({});
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Toast notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Get unique classes & sections for filters
  const classes = Array.from(new Set(students.map((s) => s.class))).sort();
  const sections = Array.from(new Set(students.map((s) => s.section))).sort();

  // Filter students based on class & section selection
  const filteredStudents = students.filter(
    (s) => s.class === selectedClass && s.section === selectedSection
  );

  // Load existing records from DB when date, class or section changes
  useEffect(() => {
    let active = true;
    async function fetchRecords() {
      if (!schoolId) return;
      setIsLoadingRecords(true);
      try {
        const res = await getAttendanceByDateAction(dateStr, schoolId, selectedClass);
        if (!active) return;

        if (res.success && res.data) {
          const map: Record<string, { id?: string; status: "present" | "absent" | "late" }> = {};
          
          // Populate existing records
          for (const rec of res.data as { id: string; studentId: string; status: "present" | "absent" | "late" }[]) {
            map[rec.studentId] = {
              id: rec.id,
              status: rec.status,
            };
          }

          setAttendanceMap(map);
        } else {
          setAttendanceMap({});
        }
      } catch (err) {
        console.error("Error fetching attendance records:", err);
      } finally {
        if (active) setIsLoadingRecords(false);
      }
    }

    fetchRecords();
    return () => {
      active = false;
    };
  }, [dateStr, selectedClass, selectedSection, schoolId]);

  // Adjust Date by delta (days)
  const handleDateChange = (delta: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + delta);
    setSelectedDate(nextDate);
  };

  // Set single student status
  const handleStatusChange = (studentId: string, status: "present" | "absent" | "late") => {
    if (isReadOnly) return;
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  // Bulk set status for all currently filtered students
  const handleBulkStatusChange = (status: "present" | "absent" | "late") => {
    if (isReadOnly) return;
    const updated: Record<string, { id?: string; status: "present" | "absent" | "late" }> = { ...attendanceMap };
    for (const student of filteredStudents) {
      updated[student.id] = {
        ...updated[student.id],
        status,
      };
    }
    setAttendanceMap(updated);
  };

  // Submit registers to database
  const handleSave = async () => {
    if (isReadOnly || filteredStudents.length === 0) return;
    setIsSaving(true);
    try {
      const recordsToUpsert = filteredStudents.map((s) => {
        const existing = attendanceMap[s.id];
        return {
          id: existing?.id || `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${s.id}`,
          studentId: s.id,
          date: dateStr,
          status: existing?.status || "present",
          recordedBy: user?.id || null,
        };
      });

      const res = await saveAttendanceAction(recordsToUpsert);
      if (res.success) {
        showNotification("success", `Attendance for Class ${selectedClass}-${selectedSection} saved successfully.`);
        // Force refresh calendar rates state
        setSelectedDate(new Date(selectedDate));
        startTransition(() => {
          router.refresh();
        });
      } else {
        showNotification("error", res.error || "Failed to save attendance.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      showNotification("error", message);
    } finally {
      setIsSaving(false);
    }
  };

  // Count current statuses for stats banner
  const getStats = () => {
    let present = 0;
    let absent = 0;
    let late = 0;

    for (const s of filteredStudents) {
      const status = attendanceMap[s.id]?.status || "present"; // defaults to present if unmarked
      if (status === "present") present++;
      if (status === "absent") absent++;
      if (status === "late") late++;
    }

    const total = filteredStudents.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return { present, absent, late, total, rate };
  };

  const stats = getStats();

  const getFriendlyDate = () => {
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Left is Attendance register sheet, Right is Calendar heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT/MID COLUMN: REGISTER SHEET */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Header & Date Navigation Panel */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDateChange(-1)}
                className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center sm:text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Date</span>
                <span className="text-sm font-bold text-slate-800 block">{getFriendlyDate()}</span>
              </div>
              <button
                onClick={() => handleDateChange(1)}
                className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick jump date input selector */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-slate-400 hidden xs:block" />
              <input
                type="date"
                value={dateStr}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(new Date(e.target.value));
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Role-based past date notification banner */}
          {isReadOnly && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-xs flex items-start gap-3">
              <Lock className="w-4.5 h-4.5 text-rose-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Read-Only Register</p>
                <p className="text-[11px] text-rose-700/90 mt-0.5 leading-relaxed">
                  Attendance registers for past dates cannot be updated by teachers. Please request adjustments from the school administrator or principal.
                </p>
              </div>
            </div>
          )}

          {isPastDate && !isReadOnly && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-800 text-xs flex items-start gap-3">
              <Info className="w-4.5 h-4.5 text-indigo-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Historical Register Override</p>
                <p className="text-[11px] text-indigo-700/90 mt-0.5 leading-relaxed">
                  You are editing attendance records for a past date ({dateStr}) using administrator or principal permissions. Changes will be saved immediately.
                </p>
              </div>
            </div>
          )}

          {/* Roster filter selectors */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Class</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 transition"
                >
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>
                      Class {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Section</span>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 transition"
                >
                  {sections.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bulk actions (hidden if read-only) */}
              {!isReadOnly && filteredStudents.length > 0 && (
                <div className="ml-auto flex items-center gap-2 pt-5">
                  <button
                    type="button"
                    onClick={() => handleBulkStatusChange("present")}
                    className="px-3 py-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                  >
                    All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkStatusChange("absent")}
                    className="px-3 py-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                  >
                    All Absent
                  </button>
                </div>
              )}
            </div>

            {/* Attendance registers list */}
            <div className="relative min-h-[300px]">
              {isLoadingRecords && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              )}

              {filteredStudents.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  No students registered in Class {selectedClass}-{selectedSection}.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {filteredStudents.map((student) => {
                    const status = attendanceMap[student.id]?.status || "present";
                    
                    return (
                      <div
                        key={student.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/40 transition"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-slate-800">{student.name}</span>
                          <span className="text-[10px] text-slate-400">Gender: {student.gender}</span>
                        </div>

                        {/* Status buttons group */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleStatusChange(student.id, "present")}
                            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition select-none ${
                              status === "present"
                                ? "bg-emerald-500 text-white shadow-sm font-bold"
                                : "bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 disabled:hover:bg-slate-50 disabled:hover:text-slate-500"
                            }`}
                          >
                            {status === "present" && <Check className="w-3.5 h-3.5" />}
                            Present
                          </button>

                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleStatusChange(student.id, "late")}
                            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition select-none ${
                              status === "late"
                                ? "bg-amber-500 text-white shadow-sm font-bold"
                                : "bg-slate-50 text-slate-500 hover:bg-amber-50 hover:text-amber-600 disabled:hover:bg-slate-50 disabled:hover:text-slate-500"
                            }`}
                          >
                            {status === "late" && <Check className="w-3.5 h-3.5" />}
                            Late
                          </button>

                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleStatusChange(student.id, "absent")}
                            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition select-none ${
                              status === "absent"
                                ? "bg-rose-500 text-white shadow-sm font-bold"
                                : "bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:hover:bg-slate-50 disabled:hover:text-slate-500"
                            }`}
                          >
                            {status === "absent" && <Check className="w-3.5 h-3.5" />}
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions & stats tally */}
            {filteredStudents.length > 0 && (
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Stats Tally bar */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-bold bg-slate-50 px-3 py-2 rounded-xl">
                  <span className="flex items-center gap-1">
                    Present: <span className="text-emerald-600">{stats.present}</span>
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    Late: <span className="text-amber-500">{stats.late}</span>
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    Absent: <span className="text-rose-500">{stats.absent}</span>
                  </span>
                  <span>|</span>
                  <span>
                    Rate: <span className="text-indigo-650">{stats.rate}%</span>
                  </span>
                </div>

                {/* Save button */}
                {!isReadOnly && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving || isLoadingRecords}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 px-6 text-xs font-bold transition shadow-md shadow-indigo-150 flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving Register...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Register
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CALENDAR HEATMAP */}
        <div className="space-y-6">
          <AttendanceCalendar
            selectedDate={selectedDate}
            onChangeDate={setSelectedDate}
            schoolId={schoolId || "school_1"}
            classFilter={selectedClass}
          />

          <div className="bg-indigo-950 text-white p-4.5 rounded-2xl shadow-md border border-indigo-900/50 flex flex-col gap-2.5 relative overflow-hidden select-none">
            <div className="absolute right-[-20px] top-[-20px] bg-indigo-900/40 w-24 h-24 rounded-full blur-xl pointer-events-none" />
            <h4 className="text-xs font-bold tracking-wider uppercase text-indigo-300 flex items-center gap-2">
              <UserCheck className="w-4.5 h-4.5" />
              Recording Instructions
            </h4>
            <p className="text-[11px] text-indigo-100/90 leading-relaxed mt-1">
              Select class and section filters. Mark students present, late, or absent, then click &quot;Save Register&quot;.
            </p>
            <p className="text-[11px] text-indigo-100/90 leading-relaxed">
              Use the calendar view on the right to navigate dates and review daily averages.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
