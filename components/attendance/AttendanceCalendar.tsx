"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2, Calendar } from "lucide-react";
import { getAttendanceCalendarAction } from "@/lib/actions/attendance";

interface AttendanceCalendarProps {
  selectedDate: Date;
  onChangeDate: (date: Date) => void;
  schoolId: string;
  classFilter: string;
}

export default function AttendanceCalendar({
  selectedDate,
  onChangeDate,
  schoolId,
  classFilter,
}: AttendanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  const [rates, setRates] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Re-fetch monthly daily rates whenever month, year, school, or class filter changes
  useEffect(() => {
    let active = true;
    async function loadRates() {
      setIsLoading(true);
      try {
        const res = await getAttendanceCalendarAction(
          currentMonth + 1, // API is 1-indexed for months
          currentYear,
          schoolId,
          classFilter !== "all" ? classFilter : undefined
        );
        if (active && res.success && res.data) {
          setRates(res.data);
        }
      } catch (err) {
        console.error("Failed to load calendar rates:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadRates();
    return () => {
      active = false;
    };
  }, [currentMonth, currentYear, schoolId, classFilter]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helpers for calendar rendering
  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  // Adjust firstDay index to start week on Monday: Mon=0, Tue=1, ..., Sun=6
  // Native getDay(): Sun=0, Mon=1, Tue=2, ..., Sat=6
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const getCellRateStyle = (rate: number | undefined) => {
    if (rate === undefined) return "bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent";
    if (rate > 0.90) return "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200";
    if (rate >= 0.75) return "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200";
    return "bg-rose-50 hover:bg-rose-100 text-rose-850 border-rose-200";
  };

  const getDotStyle = (rate: number | undefined) => {
    if (rate === undefined) return "bg-slate-300";
    if (rate > 0.90) return "bg-emerald-500";
    if (rate >= 0.75) return "bg-amber-500";
    return "bg-rose-500";
  };

  // Generate calendar slots
  const cells = [];
  // Padded cells at start
  for (let i = 0; i < startOffset; i++) {
    cells.push(<div key={`pad-${i}`} className="h-10 w-full" />);
  }

  // Active day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    const rate = rates[dateStr];
    
    const isSelected =
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear;

    const cellClass = getCellRateStyle(rate);
    const dotClass = getDotStyle(rate);

    cells.push(
      <button
        key={`day-${day}`}
        type="button"
        onClick={() => onChangeDate(new Date(currentYear, currentMonth, day))}
        className={`h-10 w-full rounded-xl border flex flex-col items-center justify-center relative transition select-none ${cellClass} ${
          isSelected ? "ring-2 ring-indigo-650 ring-offset-1 font-bold border-indigo-400" : "font-semibold"
        }`}
      >
        <span className="text-xs">{day}</span>
        {rate !== undefined && (
          <span className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${dotClass}`} />
        )}
      </button>
    );
  }

  return (
    <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
      {/* Month & Year header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-500" />
          {monthNames[currentMonth]} {currentYear}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
      </div>

      {/* Grid of days */}
      <div className="relative min-h-[220px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10 rounded-xl">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        )}
        <div className="grid grid-cols-7 gap-1.5">{cells}</div>
      </div>

      {/* Legend */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] font-semibold text-slate-500 gap-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> &gt;90% Present
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-amber-500" /> 75%-90%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-rose-500" /> &lt;75%
        </span>
      </div>
    </div>
  );
}
