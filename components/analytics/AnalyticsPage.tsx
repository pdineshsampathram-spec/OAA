"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  Calendar, 
  Filter, 
  Download, 
  Sparkles, 
  BookOpen, 
  CalendarCheck, 
  Percent,
  AlertCircle
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Standard grade calculator
function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 40) return "D";
  return "F";
}

// Map grade to color details
function getGradeColors(grade: string) {
  if (grade.startsWith("A")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (grade.startsWith("B")) return "bg-amber-100 text-amber-800 border-amber-200";
  if (grade.startsWith("C") || grade === "D") return "bg-orange-100 text-orange-800 border-orange-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

interface StudentItem {
  id: string;
  name: string;
  class: string;
  section: string;
}

interface MarkItem {
  id: string;
  studentId: string;
  subject: string;
  examType: string;
  marks: number;
  maxMarks: number;
  createdAt: string;
}

interface AttendanceItem {
  id: string;
  studentId: string;
  date: string;
  status: "present" | "absent" | "late";
}

interface AnalyticsPageProps {
  students: StudentItem[];
  initialMarks: MarkItem[];
  initialAttendance: AttendanceItem[];
  classes: string[];
  sections: string[];
  schoolName: string;
}

export default function AnalyticsPage({
  students,
  initialMarks,
  initialAttendance,
  classes,
  sections,
  schoolName
}: AnalyticsPageProps) {
  const [mounted, setMounted] = useState(false);
  
  // Filters state
  const [selectedClass, setSelectedClass] = useState(classes[0] || "");
  const [selectedSection, setSelectedSection] = useState("");
  const [dateRangeType, setDateRangeType] = useState<"7" | "30" | "90" | "custom">("30");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute start/end dates
  const datesLimit = useMemo(() => {
    const end = new Date();
    const start = new Date();
    
    if (dateRangeType === "7") {
      start.setDate(end.getDate() - 7);
    } else if (dateRangeType === "30") {
      start.setDate(end.getDate() - 30);
    } else if (dateRangeType === "90") {
      start.setDate(end.getDate() - 90);
    } else if (dateRangeType === "custom" && customStartDate) {
      return {
        start: new Date(customStartDate),
        end: customEndDate ? new Date(customEndDate) : new Date()
      };
    }

    return { start, end };
  }, [dateRangeType, customStartDate, customEndDate]);

  // Derived filtered datasets
  const analyticsData = useMemo(() => {
    // 1. Filter students list
    const filteredStudents = students.filter((s) => {
      if (selectedClass && s.class !== selectedClass) return false;
      if (selectedSection && s.section !== selectedSection) return false;
      return true;
    });

    const activeStudentIds = new Set(filteredStudents.map(s => s.id));

    // 2. Filter marks in date range & active students
    const filteredMarks = initialMarks.filter((m) => {
      if (!activeStudentIds.has(m.studentId)) return false;
      const markDate = new Date(m.createdAt);
      return markDate >= datesLimit.start && markDate <= datesLimit.end;
    });

    // 3. Filter attendance in date range & active students
    const filteredAttendance = initialAttendance.filter((a) => {
      if (!activeStudentIds.has(a.studentId)) return false;
      const attDate = new Date(a.date);
      return attDate >= datesLimit.start && attDate <= datesLimit.end;
    });

    // --- CHART 1: Marks Distribution per Subject ---
    const subjectScores: Record<string, { totalPct: number; count: number }> = {};
    filteredMarks.forEach((m) => {
      const pct = m.marks / m.maxMarks * 100;
      if (!subjectScores[m.subject]) {
        subjectScores[m.subject] = { totalPct: 0, count: 0 };
      }
      subjectScores[m.subject].totalPct += pct;
      subjectScores[m.subject].count += 1;
    });

    const marksDistributionData = Object.keys(subjectScores).map((sub) => ({
      subject: sub,
      average: Math.round(subjectScores[sub].totalPct / subjectScores[sub].count),
    }));

    // --- CHART 2: Attendance Trend Over Time ---
    const attendanceByDate: Record<string, { presentOrLate: number; total: number }> = {};
    filteredAttendance.forEach((a) => {
      if (!attendanceByDate[a.date]) {
        attendanceByDate[a.date] = { presentOrLate: 0, total: 0 };
      }
      attendanceByDate[a.date].total += 1;
      if (a.status === "present" || a.status === "late") {
        attendanceByDate[a.date].presentOrLate += 1;
      }
    });

    const attendanceTrendData = Object.keys(attendanceByDate)
      .sort()
      .map((dt) => ({
        date: dt.slice(5), // Show as MM-DD
        rate: Math.round((attendanceByDate[dt].presentOrLate / attendanceByDate[dt].total) * 100),
      }));

    // --- CHART 3: Pass/Fail Pie Chart ---
    const totalMarks = filteredMarks.length;
    const passedMarks = filteredMarks.filter(m => m.marks >= m.maxMarks * 0.40).length;
    const failedMarks = totalMarks - passedMarks;
    const passRateData = [
      { name: "Pass", value: passedMarks, color: "#10B981" },
      { name: "Fail", value: failedMarks, color: "#F43F5E" }
    ];

    // --- CHART 4: Grade Distribution ---
    const gradesCounts: Record<string, number> = {
      "A+": 0, "A": 0, "B+": 0, "B": 0, "C": 0, "D": 0, "F": 0
    };

    // Calculate student overall averages
    const studentGrades = filteredStudents.map((s) => {
      const sMarks = filteredMarks.filter(m => m.studentId === s.id);
      const avg = sMarks.length > 0
        ? sMarks.reduce((sum, m) => sum + (m.marks / m.maxMarks * 100), 0) / sMarks.length
        : null;
      
      const grade = avg !== null ? getGrade(avg) : null;
      if (grade && gradesCounts[grade] !== undefined) {
        gradesCounts[grade] += 1;
      }
      return {
        id: s.id,
        name: s.name,
        avgMarks: avg,
        grade
      };
    });

    const gradeDistributionData = Object.keys(gradesCounts).map((g) => ({
      grade: g,
      count: gradesCounts[g]
    }));

    // --- Heatmap Table Data ---
    const uniqueSubjects = Array.from(new Set(initialMarks.map(m => m.subject))).sort();
    
    const heatmapRows = filteredStudents.map((s) => {
      const sMarks = filteredMarks.filter(m => m.studentId === s.id);
      
      const subjectAverages: Record<string, string> = {};
      uniqueSubjects.forEach((sub) => {
        const subMarks = sMarks.filter(m => m.subject === sub);
        if (subMarks.length > 0) {
          const avg = subMarks.reduce((sum, m) => sum + (m.marks / m.maxMarks * 100), 0) / subMarks.length;
          subjectAverages[sub] = `${Math.round(avg)}%`;
        } else {
          subjectAverages[sub] = "-";
        }
      });

      const overallAvg = sMarks.length > 0
        ? sMarks.reduce((sum, m) => sum + (m.marks / m.maxMarks * 100), 0) / sMarks.length
        : 0;

      return {
        id: s.id,
        name: s.name,
        subjectAverages,
        overallAvg: overallAvg > 0 ? `${Math.round(overallAvg)}%` : "-",
        grade: overallAvg > 0 ? getGrade(overallAvg) : "-"
      };
    });

    // Key Stats
    const totalFilteredStudents = filteredStudents.length;
    const classAvgPercent = totalFilteredStudents > 0 
      ? studentGrades.reduce((sum, s) => sum + (s.avgMarks || 0), 0) / studentGrades.filter(s => s.avgMarks !== null).length || 0
      : 0;

    const classPassPercent = totalMarks > 0 ? (passedMarks / totalMarks) * 100 : 100;

    const classAttendanceRate = filteredAttendance.length > 0
      ? (filteredAttendance.filter(a => a.status === "present" || a.status === "late").length / filteredAttendance.length) * 100
      : 100;

    return {
      totalFilteredStudents,
      classAvgPercent,
      classPassPercent,
      classAttendanceRate,
      marksDistributionData,
      attendanceTrendData,
      passRateData,
      gradeDistributionData,
      uniqueSubjects,
      heatmapRows,
      filteredStudents,
      filteredMarks,
      filteredAttendance
    };
  }, [students, initialMarks, initialAttendance, selectedClass, selectedSection, datesLimit]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const primaryColor = [79, 70, 229]; // #4F46E5
    const darkSlate = [30, 41, 59]; // #1E293B

    // Top brand header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text("EduTrack Analytics Summary", 15, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`School: ${schoolName}`, 15, 27);
    doc.text(`Class/Section: Class ${selectedClass} - ${selectedSection || 'All Sections'}`, 15, 33);
    doc.text(`Date Range: ${datesLimit.start.toLocaleDateString()} to ${datesLimit.end.toLocaleDateString()}`, 15, 39);

    // KPI Cards
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 47, 56, 20, "F");
    doc.rect(15, 47, 56, 20, "S");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL STUDENTS", 18, 54);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(String(analyticsData.totalFilteredStudents), 18, 62);

    doc.setFillColor(248, 250, 252);
    doc.rect(76, 47, 56, 20, "F");
    doc.rect(76, 47, 56, 20, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("GPA CLASS AVERAGE", 79, 54);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${analyticsData.classAvgPercent.toFixed(1)}%`, 79, 62);

    doc.setFillColor(248, 250, 252);
    doc.rect(137, 47, 56, 20, "F");
    doc.rect(137, 47, 56, 20, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("CLASS PASS RATE", 140, 54);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${analyticsData.classPassPercent.toFixed(1)}%`, 140, 62);

    // Subject Performance Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text("Subject average distribution", 15, 78);

    const subRows = analyticsData.marksDistributionData.map(s => [s.subject, `${s.average}%`]);

    type DocWithAutoTable = jsPDF & { 
      autoTable: (opt: object) => void;
      lastAutoTable: { finalY: number };
    };

    (doc as unknown as DocWithAutoTable).autoTable({
      startY: 83,
      head: [["Subject Title", "Average Marks Percentage"]],
      body: subRows,
      theme: "striped",
      headStyles: { fillColor: primaryColor },
      margin: { left: 15, right: 15 }
    });
    
    doc.addPage();
    // Header page 2
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 4, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text("Class Performance Heatmap (Subject GPAs)", 15, 15);

    const heatmapHeaders = ["Student Name", ...analyticsData.uniqueSubjects, "Overall Avg", "Grade"];
    const heatmapRowsData = analyticsData.heatmapRows.map((row) => [
      row.name,
      ...analyticsData.uniqueSubjects.map(sub => row.subjectAverages[sub]),
      row.overallAvg,
      row.grade
    ]);

    (doc as unknown as DocWithAutoTable).autoTable({
      startY: 20,
      head: [heatmapHeaders],
      body: heatmapRowsData,
      theme: "grid",
      headStyles: { fillColor: [71, 85, 105] },
      margin: { left: 15, right: 15 }
    });

    doc.save(`class_analytics_${selectedClass}.pdf`);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            Analytics Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Analyze subject GPAs, class pass-fail rates, daily attendance fluctuations, and grade distributions.
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition"
        >
          <Download className="w-4.5 h-4.5" />
          <span>Export Analytics PDF</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4 flex-wrap justify-between">
        <div className="flex items-center gap-2 text-slate-700 text-sm font-semibold">
          <Filter className="w-4 h-4 text-indigo-500" />
          <span>Filter Records:</span>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap flex-1 justify-end">
          {/* Class selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase">Class</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {classes.map(c => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>

          {/* Section Selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase">Section</span>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Sections</option>
              {sections.map(s => (
                <option key={s} value={s}>Section {s}</option>
              ))}
            </select>
          </div>

          {/* Date Picker Range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={dateRangeType}
              onChange={(e) => setDateRangeType(e.target.value as "7" | "30" | "90" | "custom")}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
        </div>

        {/* Custom date range inputs */}
        {dateRangeType === "custom" && (
          <div className="w-full flex items-center justify-end gap-3 pt-3 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Students */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Class Size</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{analyticsData.totalFilteredStudents}</h3>
          </div>
        </div>

        {/* GPA Average */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Marks Average</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{analyticsData.classAvgPercent.toFixed(1)}%</h3>
          </div>
        </div>

        {/* Pass Rate */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Class Pass Rate</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{analyticsData.classPassPercent.toFixed(1)}%</h3>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl border border-violet-100">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Class Attendance</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{analyticsData.classAttendanceRate.toFixed(1)}%</h3>
          </div>
        </div>
      </div>

      {/* Chart Widgets (2x2 Grid) */}
      {mounted && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Chart 1: Subject average distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Subject Average Distribution</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.marksDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="subject" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#64748B' }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#64748B' }} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} />
                  <Bar dataKey="average" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={45} name="Average Score (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Attendance Fluctuations */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Attendance Fluctuation Trend</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.attendanceTrendData}>
                  <defs>
                    <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#64748B' }} />
                  <YAxis domain={[50, 100]} tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#64748B' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="rate" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#attGrad)" name="Attendance Rate (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Pass/Fail Pie Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Pass / Fail Ratio (All exams)</h3>
            <div className="h-72 w-full flex items-center justify-center">
              {analyticsData.filteredMarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                  <AlertCircle className="w-8 h-8" />
                  <span className="text-xs">No marks records available in date range</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.passRateData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {analyticsData.passRateData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" iconType="circle" style={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 4: Grade distribution counts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Letter Grade Volume counts</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.gradeDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="grade" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#64748B' }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#64748B' }} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} />
                  <Bar dataKey="count" fill="#EC4899" radius={[6, 6, 0, 0]} maxBarSize={40} name="Students Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap performance grid table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Class Performance Heatmap</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Student average percentages for each subject. Cells are color-coded based on the letter grade.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-inner max-h-96">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">Student Name</th>
                {analyticsData.uniqueSubjects.map(sub => (
                  <th key={sub} className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{sub}</th>
                ))}
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center min-w-[120px]">Overall Avg</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-sm text-slate-700">
              {analyticsData.heatmapRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-3.5 font-semibold text-slate-800">{row.name}</td>
                  {analyticsData.uniqueSubjects.map((sub) => {
                    const val = row.subjectAverages[sub];
                    const num = parseInt(val);
                    const cellColor = isNaN(num) 
                      ? "text-slate-400 font-normal" 
                      : getGradeColors(getGrade(num));
                    return (
                      <td key={sub} className="px-3 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg border text-xs font-bold min-w-[50px] ${cellColor}`}>
                          {val}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center font-bold text-indigo-700">{row.overallAvg}</td>
                  <td className="px-6 py-3 text-center font-bold text-slate-800">{row.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
