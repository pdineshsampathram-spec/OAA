import { db } from "@/lib/db";
import { attendance, students } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, like, sql, count } from "drizzle-orm";
import type { Attendance, NewAttendance } from "@/lib/db/schema";

/**
 * Get all attendance records for a specific date, optionally filtered by class.
 */
export async function getAttendanceByDate(
  date: string,
  schoolId: string,
  className?: string
) {
  const conditions = [
    eq(attendance.date, date),
    eq(students.schoolId, schoolId),
  ];

  if (className) {
    conditions.push(eq(students.class, className));
  }

  return db
    .select({
      id: attendance.id,
      studentId: attendance.studentId,
      studentName: students.name,
      class: students.class,
      section: students.section,
      date: attendance.date,
      status: attendance.status,
      recordedBy: attendance.recordedBy,
      createdAt: attendance.createdAt,
    })
    .from(attendance)
    .innerJoin(students, eq(attendance.studentId, students.id))
    .where(and(...conditions))
    .orderBy(students.name);
}

/**
 * Get attendance history for a student, optionally filtered by date range.
 */
export async function getAttendanceByStudent(
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<Attendance[]> {
  const conditions = [eq(attendance.studentId, studentId)];

  if (startDate) {
    conditions.push(gte(attendance.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(attendance.date, endDate));
  }

  return db
    .select()
    .from(attendance)
    .where(and(...conditions))
    .orderBy(desc(attendance.date));
}

/**
 * Batch insert or update attendance records.
 */
export async function upsertAttendanceBatch(records: NewAttendance[]): Promise<Attendance[]> {
  if (records.length === 0) return [];
  return db
    .insert(attendance)
    .values(records)
    .onConflictDoUpdate({
      target: [attendance.studentId, attendance.date],
      set: {
        status: sql`excluded.status`,
      },
    })
    .returning();
}

/**
 * Get monthly attendance calendar data for a student.
 */
export async function getAttendanceMonthly(
  studentId: string,
  year: number,
  month: number
): Promise<Attendance[]> {
  const paddedMonth = month.toString().padStart(2, "0");
  const pattern = `${year}-${paddedMonth}-%`;

  return db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.studentId, studentId),
        like(attendance.date, pattern)
      )
    )
    .orderBy(attendance.date);
}

/**
 * Get overall attendance rate for a specific student as a float between 0 and 1.
 */
export async function getAttendanceRate(studentId: string): Promise<number> {
  const res = await db
    .select({
      presentOrLate: sql<number>`SUM(CASE WHEN ${attendance.status} IN ('present', 'late') THEN 1 ELSE 0 END)`,
      total: count(attendance.id),
    })
    .from(attendance)
    .where(eq(attendance.studentId, studentId));

  const total = res[0]?.total || 0;
  if (total === 0) return 0;
  const presentOrLate = res[0]?.presentOrLate || 0;
  return presentOrLate / total;
}
