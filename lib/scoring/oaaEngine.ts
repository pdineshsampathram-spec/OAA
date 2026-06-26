import { db } from "@/lib/db";
import { students, marks, skills, projects, redDots, oaaScores } from "@/lib/db/schema";
import { eq, and, isNull, desc, avg, sql, count } from "drizzle-orm";
import { generateId } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────

export interface OAABreakdown {
  rawAvgMarks: number;
  totalSkillPoints: number;
  skillCount: number;
  avgProjectScore: number;
  projectCount: number;
  redDotCount: number;
}

export interface OAAResult {
  studentId: string;
  academicScore: number;
  skillsScore: number;
  projectScore: number;
  behaviorScore: number;
  totalOaaScore: number;
  breakdown: OAABreakdown;
}

export interface CPResult {
  classId: string;
  section: string;
  cp: number;
  studentCount: number;
  avgMarks: number;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  class: string;
  section: string;
  totalOaaScore: number;
  academicScore: number;
  skillsScore: number;
  projectScore: number;
  behaviorScore: number;
  percentileRank: number;
  redDotCount: number;
}

// ─── 1. Calculate OAA Score for a single student ─────────────────────────

/**
 * OAA = (0.40 × AcademicScore) + (0.30 × SkillsScore) + (0.20 × ProjectScore) + (0.10 × BehaviorScore)
 *
 * - AcademicScore: (student avg marks / max marks) × 40 → range 0–40
 * - SkillsScore: beginner=2, intermediate=4, advanced=6 pts, capped at 30
 * - ProjectScore: average of project.score values → range 0–20
 * - BehaviorScore: 10 - (redDotCount × 2), floor at 0
 */
export async function calculateOAAScore(studentId: string): Promise<OAAResult> {
  // ── Academic Score (0–40) ──────────────────────────────────────────
  const marksRes = await db
    .select({
      avgMarks: avg(marks.marks),
      avgMaxMarks: avg(marks.maxMarks),
    })
    .from(marks)
    .where(eq(marks.studentId, studentId));

  const rawAvgMarks = Number(marksRes[0]?.avgMarks) || 0;
  const rawAvgMaxMarks = Number(marksRes[0]?.avgMaxMarks) || 100;
  const academicScore = Math.min(40, (rawAvgMarks / rawAvgMaxMarks) * 40);

  // ── Skills Score (0–30) ───────────────────────────────────────────
  const studentSkills = await db
    .select()
    .from(skills)
    .where(eq(skills.studentId, studentId));

  let totalSkillPoints = 0;
  for (const skill of studentSkills) {
    switch (skill.proficiencyLevel) {
      case "beginner":
        totalSkillPoints += 2;
        break;
      case "intermediate":
        totalSkillPoints += 4;
        break;
      case "advanced":
        totalSkillPoints += 6;
        break;
    }
  }
  const skillsScore = Math.min(30, totalSkillPoints);

  // ── Project Score (0–20) ──────────────────────────────────────────
  const projectRes = await db
    .select({
      avgScore: avg(projects.score),
      projectCount: count(projects.id),
    })
    .from(projects)
    .where(eq(projects.studentId, studentId));

  const avgProjectScore = Number(projectRes[0]?.avgScore) || 0;
  const projectCount = Number(projectRes[0]?.projectCount) || 0;
  const projectScore = projectCount > 0 ? Math.min(20, avgProjectScore) : 0;

  // ── Behavior Score (0–10) ─────────────────────────────────────────
  const dotCountRes = await db
    .select({ count: count(redDots.id) })
    .from(redDots)
    .where(eq(redDots.studentId, studentId));

  const redDotCount = Number(dotCountRes[0]?.count) || 0;
  const behaviorScore = Math.max(0, 10 - redDotCount * 2);

  // ── Total OAA Score ───────────────────────────────────────────────
  const totalOaaScore = Number(
    (academicScore + skillsScore + projectScore + behaviorScore).toFixed(2)
  );

  return {
    studentId,
    academicScore: Number(academicScore.toFixed(2)),
    skillsScore: Number(skillsScore.toFixed(2)),
    projectScore: Number(projectScore.toFixed(2)),
    behaviorScore: Number(behaviorScore.toFixed(2)),
    totalOaaScore,
    breakdown: {
      rawAvgMarks,
      totalSkillPoints,
      skillCount: studentSkills.length,
      avgProjectScore,
      projectCount,
      redDotCount,
    },
  };
}

// ─── 2. Calculate Class Potential ────────────────────────────────────────

/**
 * CP = (μ / Mmax) × 100
 * μ = average of all student total marks in the class+section
 * Mmax = 100 per subject × number of unique subjects
 */
export async function calculateClassPotential(
  classId: string,
  section: string,
  schoolId: string = "school_1"
): Promise<CPResult> {
  // Get all students in the class+section
  const classStudents = await db
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.class, classId),
        eq(students.section, section),
        eq(students.schoolId, schoolId),
        isNull(students.deletedAt)
      )
    );

  const studentCount = classStudents.length;
  if (studentCount === 0) {
    return { classId, section, cp: 0, studentCount: 0, avgMarks: 0 };
  }

  const studentIds = classStudents.map((s) => s.id);

  // Get average marks across all students in the class
  const marksData = await db
    .select({
      avgMarks: avg(marks.marks),
    })
    .from(marks)
    .where(sql`${marks.studentId} IN ${studentIds}`);

  const mu = Number(marksData[0]?.avgMarks) || 0;

  const Mmax = 100; // Per subject basis (normalized to 100)

  const cp = Number(((mu / Mmax) * 100).toFixed(2));

  return {
    classId,
    section,
    cp,
    studentCount,
    avgMarks: Number(mu.toFixed(2)),
  };
}

// ─── 3. Recalculate All Ranks ───────────────────────────────────────────

/**
 * Runs calculateOAAScore for every student, upserts to oaa_scores,
 * then computes percentile rank within each department (class).
 */
export async function recalculateAllRanks(schoolId: string = "school_1"): Promise<number> {
  // Fetch all active students
  const allStudents = await db
    .select({ id: students.id, class: students.class, section: students.section })
    .from(students)
    .where(and(eq(students.schoolId, schoolId), isNull(students.deletedAt)));

  // Calculate and upsert OAA scores for all students
  const results: { studentId: string; class: string; totalOaaScore: number }[] = [];

  for (const student of allStudents) {
    const oaaResult = await calculateOAAScore(student.id);

    // Calculate class potential contribution
    const marksRes = await db
      .select({ avgMarks: avg(marks.marks) })
      .from(marks)
      .where(eq(marks.studentId, student.id));
    const studentAvg = Number(marksRes[0]?.avgMarks) || 0;
    const cpContribution = studentAvg / 100; // Normalized

    // Upsert into oaa_scores
    const existing = await db
      .select()
      .from(oaaScores)
      .where(eq(oaaScores.studentId, student.id))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(oaaScores)
        .set({
          academicScore: oaaResult.academicScore,
          skillsScore: oaaResult.skillsScore,
          projectScore: oaaResult.projectScore,
          behaviorScore: oaaResult.behaviorScore,
          totalOaaScore: oaaResult.totalOaaScore,
          classPotentialContribution: cpContribution,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(oaaScores.studentId, student.id));
    } else {
      await db.insert(oaaScores).values({
        id: `oaa_${generateId()}`,
        studentId: student.id,
        academicScore: oaaResult.academicScore,
        skillsScore: oaaResult.skillsScore,
        projectScore: oaaResult.projectScore,
        behaviorScore: oaaResult.behaviorScore,
        totalOaaScore: oaaResult.totalOaaScore,
        classPotentialContribution: cpContribution,
        percentileRank: 0,
        updatedAt: new Date().toISOString(),
      });
    }

    results.push({
      studentId: student.id,
      class: student.class,
      totalOaaScore: oaaResult.totalOaaScore,
    });
  }

  // Calculate percentile ranks within each class (department)
  const classBuckets = new Map<string, { studentId: string; totalOaaScore: number }[]>();
  for (const r of results) {
    if (!classBuckets.has(r.class)) classBuckets.set(r.class, []);
    classBuckets.get(r.class)!.push(r);
  }

  for (const bucket of Array.from(classBuckets.values())) {
    // Sort ascending by score
    bucket.sort((a: { totalOaaScore: number }, b: { totalOaaScore: number }) => a.totalOaaScore - b.totalOaaScore);
    const n = bucket.length;

    for (let i = 0; i < n; i++) {
      // Percentile rank = (number of students below / total) × 100
      const percentile = Number(((i / n) * 100).toFixed(2));
      await db
        .update(oaaScores)
        .set({ percentileRank: percentile })
        .where(eq(oaaScores.studentId, bucket[i].studentId));
    }
  }

  return allStudents.length;
}

// ─── 4. Get Leaderboard ─────────────────────────────────────────────────

export async function getLeaderboard(filters: {
  department?: string;
  class?: string;
  section?: string;
  limit?: number;
  offset?: number;
  schoolId?: string;
}): Promise<LeaderboardEntry[]> {
  const schoolId = filters.schoolId || "school_1";
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const conditions = [
    eq(students.schoolId, schoolId),
    isNull(students.deletedAt),
  ];

  if (filters.class) {
    conditions.push(eq(students.class, filters.class));
  }
  if (filters.section) {
    conditions.push(eq(students.section, filters.section));
  }

  const data = await db
    .select({
      studentId: students.id,
      name: students.name,
      class: students.class,
      section: students.section,
      academicScore: oaaScores.academicScore,
      skillsScore: oaaScores.skillsScore,
      projectScore: oaaScores.projectScore,
      behaviorScore: oaaScores.behaviorScore,
      totalOaaScore: oaaScores.totalOaaScore,
      percentileRank: oaaScores.percentileRank,
    })
    .from(oaaScores)
    .innerJoin(students, eq(oaaScores.studentId, students.id))
    .where(and(...conditions))
    .orderBy(desc(oaaScores.totalOaaScore))
    .limit(limit)
    .offset(offset);

  // Fetch red dot counts for each student
  const leaderboard: LeaderboardEntry[] = [];

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    const dotRes = await db
      .select({ count: count(redDots.id) })
      .from(redDots)
      .where(eq(redDots.studentId, entry.studentId));

    leaderboard.push({
      rank: offset + i + 1,
      studentId: entry.studentId,
      name: entry.name,
      class: entry.class,
      section: entry.section,
      totalOaaScore: Number(entry.totalOaaScore) || 0,
      academicScore: Number(entry.academicScore) || 0,
      skillsScore: Number(entry.skillsScore) || 0,
      projectScore: Number(entry.projectScore) || 0,
      behaviorScore: Number(entry.behaviorScore) || 0,
      percentileRank: Number(entry.percentileRank) || 0,
      redDotCount: Number(dotRes[0]?.count) || 0,
    });
  }

  return leaderboard;
}
