import * as XLSX from "xlsx";

export interface AttendanceDailyRecord {
  date: string;
  status: "present" | "absent" | "late";
}

export interface StudentAttendanceSummary {
  name: string;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
  daily: AttendanceDailyRecord[];
}

export interface AttendanceReport {
  className: string;
  month: string;
  students: StudentAttendanceSummary[];
  allDates: string[]; // Sorted dates in YYYY-MM-DD format
}

export function generateAttendanceExcel(data: AttendanceReport): void {
  // --- SHEET 1: Summary ---
  const summaryHeaders = [
    "Student Name",
    "Total Days",
    "Present",
    "Absent",
    "Late",
    "Attendance Percentage"
  ];

  const summaryRows = data.students.map((student) => [
    student.name,
    student.totalDays,
    student.present,
    student.absent,
    student.late,
    `${(student.percentage * 100).toFixed(1)}%`
  ]);

  const summaryData = [summaryHeaders, ...summaryRows];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // --- SHEET 2: Daily ---
  // Headers: Student Name, followed by all dates (formatted for display e.g. MM-DD)
  const dailyHeaders = ["Student Name", ...data.allDates.map(d => d.slice(5))];
  
  const dailyRows = data.students.map((student) => {
    // Map dates to status letters P, A, L
    const dateMap = new Map(student.daily.map(d => [d.date, d.status]));
    
    const rowCells = [student.name];
    data.allDates.forEach((date) => {
      const status = dateMap.get(date);
      if (status === "present") {
        rowCells.push("P");
      } else if (status === "absent") {
        rowCells.push("A");
      } else if (status === "late") {
        rowCells.push("L");
      } else {
        rowCells.push("-"); // No record
      }
    });
    
    return rowCells;
  });

  const dailyData = [dailyHeaders, ...dailyRows];
  const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);

  // Set column widths for better readability
  summarySheet["!cols"] = [
    { wch: 25 }, // Student Name
    { wch: 12 }, // Total Days
    { wch: 10 }, // Present
    { wch: 10 }, // Absent
    { wch: 10 }, // Late
    { wch: 22 }  // Percentage
  ];

  dailySheet["!cols"] = [
    { wch: 25 }, // Student Name
    ...data.allDates.map(() => ({ wch: 6 })) // Small width for date cells
  ];

  // Create Workbook and append sheets
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summarySheet, "Attendance Summary");
  XLSX.utils.book_append_sheet(wb, dailySheet, "Daily Attendance");

  // Trigger browser download
  const fileName = `attendance_${data.className.toLowerCase().replace(/\s+/g, "_")}_${data.month.toLowerCase().replace(/\s+/g, "_")}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
