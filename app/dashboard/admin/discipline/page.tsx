"use client";

import { useState, useEffect } from "react";
import { Search, ShieldAlert, Users, Loader2 } from "lucide-react";
import StudentDisciplinePanel from "@/components/discipline/StudentDisciplinePanel";
import IssueDotModal from "@/components/discipline/IssueDotModal";
import PageTransition from "@/components/layout/PageTransition";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  name: string;
  class: string;
  section: string;
}

export default function DisciplinePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDotCount, setCurrentDotCount] = useState(0);

  // Fetch current dot count for selected student to pass to IssueDotModal
  const fetchCurrentDotCount = async (studentId: string) => {
    try {
      const res = await fetch(`/api/discipline?studentId=${studentId}&check=true`);
      const data = await res.json();
      if (data.data) {
        setCurrentDotCount(data.data.dotCount);
      }
    } catch (err) {
      console.error("Error fetching dot count:", err);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      fetchCurrentDotCount(selectedStudent.id);
    }
  }, [selectedStudent]);

  // Search students
  useEffect(() => {
    if (!searchQuery.trim()) {
      setStudentsList([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(searchQuery)}&limit=10`);
        const data = await res.json();
        if (data.data && data.data.students) {
          setStudentsList(data.data.students);
        }
      } catch (err) {
        console.error("Error searching students:", err);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSuccess = () => {
    if (selectedStudent) {
      // Re-fetch dot count
      fetchCurrentDotCount(selectedStudent.id);
      // Re-render discipline panel (which has internal state, so we trigger a state update by resetting studentId briefly or just rely on its own reload)
      const current = selectedStudent;
      setSelectedStudent(null);
      setTimeout(() => setSelectedStudent(current), 100);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 w-full max-w-[1200px] mx-auto pb-24">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-black/[0.04] dark:border-white/[0.04] pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-rose-500" />
              Discipline Management
            </h1>
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              Manage behavioral red dot flags, issue formal warnings, and track disciplinary restrictions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Student Selector / Search column */}
          <div className="lg:col-span-1 backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Find Student
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-450" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name..."
                className="w-full rounded-xl border border-black/[0.06] bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none dark:border-white/[0.06] dark:bg-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>

            {/* List of students */}
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                </div>
              ) : searchQuery && studentsList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-zinc-500">
                  No students found
                </div>
              ) : !searchQuery ? (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-zinc-500">
                  Type a student name to begin
                </div>
              ) : (
                studentsList.map((student) => {
                  const isSelected = selectedStudent?.id === student.id;
                  return (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-all",
                        isSelected
                          ? "bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:text-white shadow-sm border border-black/[0.02]"
                          : "text-slate-600 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-white/5"
                      )}
                    >
                      <div>
                        <p className="font-bold">{student.name}</p>
                        <p className="opacity-60 text-[10px] mt-0.5">
                          Class {student.class}-{student.section}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Details / Operations column */}
          <div className="lg:col-span-2 space-y-6">
            {selectedStudent ? (
              <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] p-6 space-y-6">
                {/* Selected Student Header with Issue Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-black/[0.04] dark:border-white/[0.04] pb-4 gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                      {selectedStudent.name}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Class {selectedStudent.class}-{selectedStudent.section}
                    </p>
                  </div>
                  <div>
                    <IssueDotModal
                      studentId={selectedStudent.id}
                      studentName={selectedStudent.name}
                      currentDotCount={currentDotCount}
                      onSuccess={handleSuccess}
                    />
                  </div>
                </div>

                {/* Panel */}
                <StudentDisciplinePanel studentId={selectedStudent.id} />
              </div>
            ) : (
              <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] p-12 text-center text-slate-400 dark:text-zinc-500">
                <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-30 animate-pulse text-indigo-500" />
                <p className="text-sm font-semibold">Select a student from the sidebar to review discipline history</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
