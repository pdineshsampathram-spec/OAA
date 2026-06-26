import { db } from "@/lib/db";
import { marks, students } from "@/lib/db/schema";
import { eq, and, desc, avg } from "drizzle-orm";
import type { Mark, NewMark } from "@/lib/db/schema";

/**
 * Get all marks for a specific student.
 */
export async function getMarksByStudent(studentId: string): Promise<Mark[]> {
  return db
    .select()
    .from(marks)
    .where(eq(marks.studentId, studentId))
    .orderBy(desc(marks.createdAt));
}

/**
 * Get all marks for a class within a school.
 */
export async function getMarksByClass(schoolId: string, className: string) {
  return db
    .select({
      id: marks.id,
      studentId: marks.studentId,
      studentName: students.name,
      subject: marks.subject,
      examType: marks.examType,
      marks: marks.marks,
      maxMarks: marks.maxMarks,
      recordedBy: marks.recordedBy,
      createdAt: marks.createdAt,
    })
    .from(marks)
    .innerJoin(students, eq(marks.studentId, students.id))
    .where(
      and(
        eq(students.schoolId, schoolId),
        eq(students.class, className)
      )
    )
    .orderBy(desc(marks.createdAt));
}

/**
 * Insert a single mark record.
 */
export async function createMark(data: NewMark): Promise<Mark> {
  const res = await db.insert(marks).values(data).returning();
  return res[0];
}

/**
 * Batch insert multiple mark records.
 */
export async function createMarksBulk(records: NewMark[]): Promise<Mark[]> {
  if (records.length === 0) return [];
  return db.insert(marks).values(records).returning();
}

/**
 * Update the marks value of an existing record.
 */
export async function updateMark(id: string, newMarks: number): Promise<Mark> {
  const res = await db
    .update(marks)
    .set({ marks: newMarks })
    .where(eq(marks.id, id))
    .returning();
  return res[0];
}

/**
 * Delete a mark record.
 */
export async function deleteMark(id: string): Promise<boolean> {
  const res = await db.delete(marks).where(eq(marks.id, id)).returning();
  return res.length > 0;
}

/**
 * Get average marks grouped by subject for a specific student.
 */
export async function getSubjectAvgByStudent(studentId: string) {
  const res = await db
    .select({
      subject: marks.subject,
      avgMarks: avg(marks.marks),
    })
    .from(marks)
    .where(eq(marks.studentId, studentId))
    .groupBy(marks.subject);

  return res.map((item) => ({
    subject: item.subject,
    avgMarks: Number(item.avgMarks) || 0,
  }));
}

/**
 * Get all marks for a specific school.
 */
export async function getMarksForSchool(schoolId: string) {
  return db
    .select({
      id: marks.id,
      studentId: marks.studentId,
      studentName: students.name,
      class: students.class,
      section: students.section,
      subject: marks.subject,
      examType: marks.examType,
      marks: marks.marks,
      maxMarks: marks.maxMarks,
      recordedBy: marks.recordedBy,
      createdAt: marks.createdAt,
    })
    .from(marks)
    .innerJoin(students, eq(marks.studentId, students.id))
    .where(eq(students.schoolId, schoolId))
    .orderBy(desc(marks.createdAt));
}

