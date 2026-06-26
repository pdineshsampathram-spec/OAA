import { db } from "@/lib/db";
import { students, marks, attendance, aiPredictions } from "@/lib/db/schema";
import { eq, and, sql, avg, count } from "drizzle-orm";
import type { Analytics, SubjectStat, DayTrend } from "@/types";

/**
 * Get overall class analytics for a school, optionally filtered by class.
 */
export async function getClassAnalytics(schoolId: string, className?: string): Promise<Analytics> {
  // 1. Total Students
  const studentFilters = [eq(students.schoolId, schoolId)];
  if (className) {
    studentFilters.push(eq(students.class, className));
  }
  const totalStudentsRes = await db
    .select({ count: count(students.id) })
    .from(students)
    .where(and(...studentFilters));
  const totalStudents = totalStudentsRes[0]?.count || 0;

  // 2. Average Marks
  const marksRes = await db
    .select({
      avg: avg(marks.marks)
    })
    .from(marks)
    .innerJoin(students, eq(marks.studentId, students.id))
    .where(
      and(
        eq(students.schoolId, schoolId),
        className ? eq(students.class, className) : sql`1=1`
      )
    );
  const avgMarks = Number(marksRes[0]?.avg) || 0;

  // 3. Pass Percentage (Pass = marks >= maxMarks * 0.40)
  const passRes = await db
    .select({
      passed: sql<number>`SUM(CASE WHEN ${marks.marks} >= ${marks.maxMarks} * 0.40 THEN 1 ELSE 0 END)`,
      total: count(marks.id)
    })
    .from(marks)
    .innerJoin(students, eq(marks.studentId, students.id))
    .where(
      and(
        eq(students.schoolId, schoolId),
        className ? eq(students.class, className) : sql`1=1`
      )
    );
  const passedCount = passRes[0]?.passed || 0;
  const totalMarksCount = passRes[0]?.total || 0;
  const passPercentage = totalMarksCount > 0 ? (passedCount / totalMarksCount) * 100 : 0;

  // 4. Attendance Rate
  const attendanceRes = await db
    .select({
      presentOrLate: sql<number>`SUM(CASE WHEN ${attendance.status} IN ('present', 'late') THEN 1 ELSE 0 END)`,
      total: count(attendance.id)
    })
    .from(attendance)
    .innerJoin(students, eq(attendance.studentId, students.id))
    .where(
      and(
        eq(students.schoolId, schoolId),
        className ? eq(students.class, className) : sql`1=1`
      )
    );
  const presentOrLateCount = attendanceRes[0]?.presentOrLate || 0;
  const totalAttendanceCount = attendanceRes[0]?.total || 0;
  const attendanceRate = totalAttendanceCount > 0 ? (presentOrLateCount / totalAttendanceCount) * 100 : 0;

  // 5. At Risk Count (riskFlag = 1)
  const riskRes = await db
    .select({
      count: count(aiPredictions.id)
    })
    .from(aiPredictions)
    .innerJoin(students, eq(aiPredictions.studentId, students.id))
    .where(
      and(
        eq(students.schoolId, schoolId),
        eq(aiPredictions.riskFlag, 1),
        className ? eq(students.class, className) : sql`1=1`
      )
    );
  const atRiskCount = riskRes[0]?.count || 0;

  return {
    totalStudents,
    avgMarks,
    passPercentage,
    attendanceRate,
    atRiskCount,
  };
}

/**
 * Get subject-wise statistics for a school.
 */
export async function getSubjectAnalytics(schoolId: string): Promise<SubjectStat[]> {
  const subjectStats = await db
    .select({
      subject: marks.subject,
      avgMarks: avg(marks.marks),
      maxMarks: avg(marks.maxMarks)
    })
    .from(marks)
    .innerJoin(students, eq(marks.studentId, students.id))
    .where(eq(students.schoolId, schoolId))
    .groupBy(marks.subject);

  return subjectStats.map(stat => ({
    subject: stat.subject || "",
    avgMarks: Number(stat.avgMarks) || 0,
    maxMarks: Number(stat.maxMarks) || 100,
  }));
}

/**
 * Get daily attendance trend for the last X days.
 */
export async function getAttendanceTrend(schoolId: string, days: number): Promise<DayTrend[]> {
  const trend = await db
    .select({
      date: attendance.date,
      presentCount: sql<number>`SUM(CASE WHEN ${attendance.status} IN ('present', 'late') THEN 1 ELSE 0 END)`,
      totalCount: count(attendance.id)
    })
    .from(attendance)
    .innerJoin(students, eq(attendance.studentId, students.id))
    .where(eq(students.schoolId, schoolId))
    .groupBy(attendance.date)
    .orderBy(sql`${attendance.date} DESC`)
    .limit(days);

  return trend
    .map(t => ({
      date: t.date,
      attendanceRate: t.totalCount > 0 ? (t.presentCount / t.totalCount) * 100 : 0,
      presentCount: t.presentCount || 0,
      totalCount: t.totalCount || 0,
    }))
    .reverse();
}
