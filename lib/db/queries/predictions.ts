import { db } from "@/lib/db";
import { aiPredictions, students } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { AiPrediction, NewAiPrediction, Student } from "@/lib/db/schema";

export interface StudentPredictionJoin {
  prediction: AiPrediction;
  student: Student;
}

/**
 * Get the latest AI prediction for a specific student.
 */
export async function getPredictionByStudent(studentId: string): Promise<AiPrediction | null> {
  const res = await db
    .select()
    .from(aiPredictions)
    .where(eq(aiPredictions.studentId, studentId))
    .orderBy(desc(aiPredictions.createdAt))
    .limit(1);
  return res[0] || null;
}

/**
 * Get all AI predictions for a school with student data joined.
 */
export async function getPredictionsBySchool(schoolId: string): Promise<StudentPredictionJoin[]> {
  const res = await db
    .select({
      prediction: aiPredictions,
      student: students,
    })
    .from(aiPredictions)
    .innerJoin(students, eq(aiPredictions.studentId, students.id))
    .where(eq(students.schoolId, schoolId))
    .orderBy(desc(aiPredictions.createdAt));

  return res;
}

/**
 * Insert or update the AI prediction for a student.
 */
export async function upsertPrediction(data: NewAiPrediction): Promise<AiPrediction> {
  // Query if there is an existing prediction record for the student
  const existing = await db
    .select()
    .from(aiPredictions)
    .where(eq(aiPredictions.studentId, data.studentId))
    .limit(1);

  if (existing.length > 0) {
    const res = await db
      .update(aiPredictions)
      .set({
        riskFlag: data.riskFlag,
        score: data.score,
        suggestions: data.suggestions,
        createdAt: data.createdAt || sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(aiPredictions.id, existing[0].id))
      .returning();
    return res[0];
  } else {
    const res = await db.insert(aiPredictions).values(data).returning();
    return res[0];
  }
}

/**
 * Get list of students flagged as high risk (riskFlag = 1) in a school.
 */
export async function getAtRiskStudents(
  schoolId: string,
  limitNum?: number
): Promise<StudentPredictionJoin[]> {
  const query = db
    .select({
      prediction: aiPredictions,
      student: students,
    })
    .from(aiPredictions)
    .innerJoin(students, eq(aiPredictions.studentId, students.id))
    .where(
      and(
        eq(students.schoolId, schoolId),
        eq(aiPredictions.riskFlag, 1)
      )
    )
    .orderBy(desc(aiPredictions.score));

  if (limitNum !== undefined) {
    return query.limit(limitNum);
  }

  return query;
}
