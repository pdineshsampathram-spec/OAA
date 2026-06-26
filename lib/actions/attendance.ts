"use server";

import { db } from "@/lib/db";
import { attendance, students } from "@/lib/db/schema";
import { upsertAttendanceBatch, getAttendanceByDate } from "@/lib/db/queries/attendance";
import { and, eq, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { NewAttendance } from "@/lib/db/schema";

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Save a batch of attendance records (insert or update).
 */
export async function saveAttendanceAction(
  records: NewAttendance[]
): Promise<ActionResult<unknown>> {
  try {
    const res = await upsertAttendanceBatch(records);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/attendance");
    return { success: true, data: res };
  } catch (error: unknown) {
    console.error("saveAttendanceAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to save attendance records";
    return { success: false, error: message };
  }
}

/**
 * Fetch attendance records for a school and optionally a class on a specific date.
 */
export async function getAttendanceByDateAction(
  date: string,
  schoolId: string,
  className?: string
): Promise<ActionResult<unknown[]>> {
  try {
    const res = await getAttendanceByDate(date, schoolId, className);
    return { success: true, data: res };
  } catch (error: unknown) {
    console.error("getAttendanceByDateAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch attendance records";
    return { success: false, error: message };
  }
}

/**
 * Fetch daily attendance rates for a school (and optionally a class) in a specific month and year.
 * Returns an object with date keys (YYYY-MM-DD) and their percentage present/late (0 to 1).
 */
export async function getAttendanceCalendarAction(
  month: number,
  year: number,
  schoolId: string,
  className?: string
): Promise<ActionResult<Record<string, number>>> {
  try {
    const paddedMonth = month.toString().padStart(2, "0");
    const pattern = `${year}-${paddedMonth}-%`;

    const conditions = [
      eq(students.schoolId, schoolId),
      like(attendance.date, pattern),
    ];

    if (className) {
      conditions.push(eq(students.class, className));
    }

    const res = await db
      .select({
        date: attendance.date,
        presentOrLate: sql<number>`SUM(CASE WHEN ${attendance.status} IN ('present', 'late') THEN 1 ELSE 0 END)`,
        total: sql<number>`COUNT(${attendance.id})`,
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(and(...conditions))
      .groupBy(attendance.date);

    const ratesMap: Record<string, number> = {};
    for (const item of res) {
      const total = Number(item.total) || 0;
      if (total > 0) {
        ratesMap[item.date] = (Number(item.presentOrLate) || 0) / total;
      } else {
        ratesMap[item.date] = 0;
      }
    }

    return { success: true, data: ratesMap };
  } catch (error: unknown) {
    console.error("getAttendanceCalendarAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch attendance calendar data";
    return { success: false, error: message };
  }
}
