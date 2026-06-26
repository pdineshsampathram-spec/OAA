import { db } from "@/lib/db";
import { students, marks, attendance, aiPredictions } from "@/lib/db/schema";
import { eq, and, like, desc, count, avg, isNull, sql } from "drizzle-orm";
import type { Student, NewStudent, Mark, Attendance, AiPrediction } from "@/lib/db/schema";

export interface GetStudentsFilters {
  schoolId: string;
  search?: string;
  class?: string;
  section?: string;
  page?: number;
  limit?: number;
}

export interface StudentWithRelations extends Student {
  marks: Mark[];
  attendance: Attendance[];
  prediction: AiPrediction | null;
}

/**
 * Get paginated list of students based on search, class, and section filters.
 */
export async function getStudents(filters: GetStudentsFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(students.schoolId, filters.schoolId),
    isNull(students.deletedAt),
  ];

  if (filters.search) {
    conditions.push(like(students.name, `%${filters.search}%`));
  }
  if (filters.class) {
    conditions.push(eq(students.class, filters.class));
  }
  if (filters.section) {
    conditions.push(eq(students.section, filters.section));
  }

  const whereClause = and(...conditions);

  // 1. Get total count
  const totalCountRes = await db
    .select({ count: count(students.id) })
    .from(students)
    .where(whereClause);
  const totalCount = totalCountRes[0]?.count || 0;

  // 2. Get students
  const data = await db
    .select()
    .from(students)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(students.createdAt));

  return {
    students: data,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Get a single student by ID with all related marks, attendance records, and predictions.
 */
export async function getStudentById(id: string): Promise<StudentWithRelations | null> {
  // Fetch student
  const studentRes = await db
    .select()
    .from(students)
    .where(eq(students.id, id))
    .limit(1);

  if (studentRes.length === 0) {
    return null;
  }
  const student = studentRes[0];

  // Fetch marks
  const studentMarks = await db
    .select()
    .from(marks)
    .where(eq(marks.studentId, id))
    .orderBy(desc(marks.createdAt));

  // Fetch attendance
  const studentAttendance = await db
    .select()
    .from(attendance)
    .where(eq(attendance.studentId, id))
    .orderBy(desc(attendance.date));

  // Fetch prediction (get the latest prediction)
  const predictionRes = await db
    .select()
    .from(aiPredictions)
    .where(eq(aiPredictions.studentId, id))
    .orderBy(desc(aiPredictions.createdAt))
    .limit(1);
  const prediction = predictionRes[0] || null;

  return {
    ...student,
    marks: studentMarks,
    attendance: studentAttendance,
    prediction,
  };
}

/**
 * Get paginated list of students with calculated stats (avg marks, attendance rate, risk flag)
 */
export async function getStudentsWithStats(filters: {
  schoolId: string;
  search?: string;
  class?: string;
  section?: string;
  gender?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(students.schoolId, filters.schoolId),
    isNull(students.deletedAt),
  ];

  if (filters.search) {
    conditions.push(like(students.name, `%${filters.search}%`));
  }
  if (filters.class) {
    conditions.push(eq(students.class, filters.class));
  }
  if (filters.section) {
    conditions.push(eq(students.section, filters.section));
  }
  if (filters.gender) {
    conditions.push(eq(students.gender, filters.gender));
  }

  const whereClause = and(...conditions);

  // 1. Get total count
  const totalCountRes = await db
    .select({ count: count(students.id) })
    .from(students)
    .where(whereClause);
  const totalCount = totalCountRes[0]?.count || 0;

  // 2. Get students with subqueries
  const data = await db
    .select({
      id: students.id,
      name: students.name,
      class: students.class,
      section: students.section,
      gender: students.gender,
      schoolId: students.schoolId,
      createdAt: students.createdAt,
      avgMarks: sql<number>`COALESCE((SELECT AVG(marks) FROM marks WHERE student_id = students.id), 0)`,
      attendanceRate: sql<number>`COALESCE((SELECT CAST(SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) AS REAL) / COUNT(id) FROM attendance WHERE student_id = students.id), 0)`,
      riskFlag: sql<number | null>`(SELECT risk_flag FROM ai_predictions WHERE student_id = students.id ORDER BY created_at DESC LIMIT 1)`,
    })
    .from(students)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(students.createdAt));

  // 3. Fetch all students in the school with their average marks to compute their global rank
  const allSchoolPerformers = await db
    .select({
      id: students.id,
      avgMarks: sql<number>`COALESCE((SELECT AVG(marks) FROM marks WHERE student_id = students.id), 0)`,
    })
    .from(students)
    .where(and(eq(students.schoolId, filters.schoolId), isNull(students.deletedAt)))
    .orderBy(desc(sql`COALESCE((SELECT AVG(marks) FROM marks WHERE student_id = students.id), 0)`));

  // Create a map from studentId -> rank
  const rankMap = new Map<string, number>();
  allSchoolPerformers.forEach((performer, idx) => {
    rankMap.set(performer.id, idx + 1);
  });

  // 4. Fetch subject scores for the returned students to derive skills dynamically
  const studentIds = data.map((s) => s.id);
  const studentSubjectScores = studentIds.length > 0
    ? await db
        .select({
          studentId: marks.studentId,
          subject: marks.subject,
          avgScore: avg(marks.marks),
        })
        .from(marks)
        .where(sql`${marks.studentId} IN ${studentIds}`)
        .groupBy(marks.studentId, marks.subject)
    : [];

  // Group subject scores by studentId
  const subjectScoresMap = new Map<string, { subject: string; score: number }[]>();
  studentSubjectScores.forEach((row) => {
    const sId = row.studentId;
    if (!subjectScoresMap.has(sId)) {
      subjectScoresMap.set(sId, []);
    }
    subjectScoresMap.get(sId)!.push({
      subject: row.subject,
      score: Number(row.avgScore) || 0,
    });
  });

  // Map subjects to specific skills
  const subjectToSkillMap: Record<string, string> = {
    Math: "Analytical Reasoning",
    Science: "Scientific Inquiry",
    Computer: "Logical Coding",
    English: "Verbal Literacy",
    Telugu: "Linguistic Fluency",
  };

  const getSkillsForStudent = (sId: string): string[] => {
    const scores = subjectScoresMap.get(sId) || [];
    if (scores.length === 0) {
      return ["Critical Thinking", "Problem Solving"];
    }
    // Sort scores descending to find top performing subjects
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const topSkills = sorted
      .map((s) => subjectToSkillMap[s.subject])
      .filter(Boolean);
    
    // Add default soft skills if we have fewer than 2
    if (topSkills.length < 2) {
      topSkills.push("Critical Thinking");
    }
    if (topSkills.length < 3) {
      topSkills.push("Teamwork");
    }
    return topSkills.slice(0, 3);
  };

  return {
    students: data.map((item) => ({
      ...item,
      avgMarks: Number(item.avgMarks) || 0,
      attendanceRate: Number(item.attendanceRate) || 0,
      riskFlag: item.riskFlag === 1,
      rank: rankMap.get(item.id) || 1,
      skills: getSkillsForStudent(item.id),
    })),
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Get a student's academic rank in the school based on marks average.
 */
export async function getStudentRank(studentId: string, schoolId: string): Promise<number> {
  const allPerformers = await db
    .select({
      studentId: students.id,
      avgMarks: avg(marks.marks),
    })
    .from(students)
    .innerJoin(marks, eq(students.id, marks.studentId))
    .where(and(eq(students.schoolId, schoolId), isNull(students.deletedAt)))
    .groupBy(students.id)
    .orderBy(desc(avg(marks.marks)));

  const index = allPerformers.findIndex((p) => p.studentId === studentId);
  return index !== -1 ? index + 1 : 1;
}

/**
 * Create a new student.
 */
export async function createStudent(data: NewStudent): Promise<Student> {
  const res = await db.insert(students).values(data).returning();
  return res[0];
}

/**
 * Update an existing student.
 */
export async function updateStudent(id: string, data: Partial<NewStudent>): Promise<Student> {
  const res = await db
    .update(students)
    .set(data)
    .where(eq(students.id, id))
    .returning();
  return res[0];
}

/**
 * Delete a student.
 */
export async function deleteStudent(id: string): Promise<boolean> {
  const res = await db
    .update(students)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(students.id, id))
    .returning();
  return res.length > 0;
}

/**
 * Get the top performing students by average marks.
 */
export async function getTopPerformers(schoolId: string, limitNum = 5) {
  const res = await db
    .select({
      id: students.id,
      name: students.name,
      class: students.class,
      section: students.section,
      avgMarks: avg(marks.marks),
    })
    .from(students)
    .innerJoin(marks, eq(students.id, marks.studentId))
    .where(eq(students.schoolId, schoolId))
    .groupBy(students.id)
    .orderBy(desc(avg(marks.marks)))
    .limit(limitNum);

  return res.map((row) => ({
    id: row.id,
    name: row.name,
    class: row.class,
    section: row.section,
    avgMarks: Number(row.avgMarks) || 0,
  }));
}
