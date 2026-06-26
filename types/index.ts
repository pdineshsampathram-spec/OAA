import type { School, User, Student, Mark, Attendance, AiPrediction, Session } from "@/lib/db/schema";

export type { School, User, Student, Mark, Attendance, AiPrediction, Session };

export interface Analytics {
  totalStudents: number;
  avgMarks: number;
  passPercentage: number;
  attendanceRate: number;
  atRiskCount: number;
}

export interface SubjectStat {
  subject: string;
  avgMarks: number;
  maxMarks: number;
}

export interface DayTrend {
  date: string;
  attendanceRate: number;
  presentCount: number;
  totalCount: number;
}

export interface ClassReport {
  class: string;
  section: string;
  totalStudents: number;
  avgMarks: number;
  attendanceRate: number;
}

export interface StudentReport {
  studentId: string;
  name: string;
  class: string;
  section: string;
  avgMarks: number;
  attendanceRate: number;
  riskFlag: 0 | 1;
}

export interface AttendanceReport {
  date: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
}
