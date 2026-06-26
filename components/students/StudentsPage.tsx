"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import StudentGrid from "./StudentGrid";
import StudentTable from "./StudentTable";
import AddStudentModal from "./AddStudentModal";
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

interface StudentsPageProps {
  students: StudentWithStats[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
const SECTIONS = ["A", "B", "C", "D", "E"] as const;
const GENDERS = ["Male", "Female", "Other"] as const;

export default function StudentsPage({
  students,
  totalCount,
  totalPages,
  currentPage,
}: StudentsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = useCurrentUser();
  const [isPending, startTransition] = useTransition();

  // Active view layout: grid or table
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Search input with debounce state
  const [searchVal, setSearchVal] = useState(searchParams.get("search") || "");

  // Filters state from search params
  const classFilter = searchParams.get("class") || "all";
  const sectionFilter = searchParams.get("section") || "all";
  const genderFilter = searchParams.get("gender") || "all";

  // Add Student modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Success toast
  const [toast, setToast] = useState<string | null>(null);

  const updateUrl = useCallback((newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(newParams)) {
      if (val === undefined || val === "all" || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    // Always fallback to page 1 if changing filtering except for page index changes
    if (newParams.page === undefined && newParams.search === undefined) {
      params.set("page", "1");
    }
    startTransition(() => {
      router.push(`/dashboard/admin/students?${params.toString()}`);
    });
  }, [searchParams, router]);

  // Synchronize debounced search to URL
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const currentSearch = searchParams.get("search") || "";
      if (searchVal !== currentSearch) {
        updateUrl({ search: searchVal || undefined, page: "1" });
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchVal, searchParams, updateUrl]);

  // Synchronize local search input state with URL query updates
  const urlSearch = searchParams.get("search") || "";
  useEffect(() => {
    setSearchVal(urlSearch);
  }, [urlSearch]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateUrl({ page: newPage.toString() });
    }
  };

  const handleAddSuccess = (studentName: string) => {
    setToast(`Successfully registered ${studentName}.`);
    setTimeout(() => setToast(null), 4000);
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl bg-emerald-50 border-emerald-100 text-emerald-800 text-xs font-semibold max-w-sm"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Directory Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search & Select dropdowns */}
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-4xl">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition duration-200"
            />
          </div>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => updateUrl({ class: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="all">All Classes</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>

          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => updateUrl({ section: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="all">All Sections</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                Section {s}
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => updateUrl({ gender: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="all">All Genders</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode & Add student */}
        <div className="flex items-center gap-3">
          {/* View Mode toggle */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid"
                  ? "bg-white text-indigo-650 shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "table"
                  ? "bg-white text-indigo-650 shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add Student Button (Hidden for Principals) */}
          {role !== "principal" && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 px-4 text-xs font-semibold transition shadow-md shadow-indigo-100 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          )}
        </div>
      </div>

      {/* Showing count stats */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium select-none">
        <span>
          Showing {students.length} of {totalCount} students
        </span>
        {isPending && (
          <span className="flex items-center gap-1.5 text-indigo-500 font-semibold">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Syncing...
          </span>
        )}
      </div>

      {/* Grid or Table layout container */}
      <div className="relative min-h-[350px]">
        <AnimatePresence mode="wait">
          {viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <StudentGrid students={students} />
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <StudentTable students={students} onRefresh={() => router.refresh()} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-100 select-none">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isPending}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 disabled:opacity-50 disabled:hover:bg-transparent rounded-xl transition"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isPending}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 disabled:opacity-50 disabled:hover:bg-transparent rounded-xl transition"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AddStudentModal */}
      <AddStudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
