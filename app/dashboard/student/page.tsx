import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { oaaScores, skills, projects, aiPredictions, redDots } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { getStudentById } from "@/lib/db/queries/students";
import { getStudentRestriction } from "@/lib/discipline/checkRestriction";
import { calculateOAAScore } from "@/lib/scoring/oaaEngine";
import StudentDashboardView from "@/components/student/StudentDashboardView";
import DisciplineRestrictionBanner from "@/components/discipline/DisciplineRestrictionBanner";

export const revalidate = 0;

export default async function StudentDashboardPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "student") {
    redirect("/dashboard/admin");
  }

  const studentId = session.user.studentId;
  if (!studentId) {
    redirect("/login");
  }

  // 1. Restriction Check (Server-Side)
  const restriction = await getStudentRestriction(studentId);

  if (restriction.isLocked) {
    return (
      <div className="fixed inset-0 z-50 bg-[#151517] flex items-center justify-center p-6">
        <DisciplineRestrictionBanner restriction="locked" />
      </div>
    );
  }

  // 2. Fetch OAA metrics and calculate if not present
  let oaa = await db
    .select({
      academicScore: oaaScores.academicScore,
      skillsScore: oaaScores.skillsScore,
      projectScore: oaaScores.projectScore,
      behaviorScore: oaaScores.behaviorScore,
      totalOaaScore: oaaScores.totalOaaScore,
      percentileRank: oaaScores.percentileRank,
    })
    .from(oaaScores)
    .where(eq(oaaScores.studentId, studentId))
    .limit(1);

  if (oaa.length === 0) {
    await calculateOAAScore(studentId);
    oaa = await db
      .select({
        academicScore: oaaScores.academicScore,
        skillsScore: oaaScores.skillsScore,
        projectScore: oaaScores.projectScore,
        behaviorScore: oaaScores.behaviorScore,
        totalOaaScore: oaaScores.totalOaaScore,
        percentileRank: oaaScores.percentileRank,
      })
      .from(oaaScores)
      .where(eq(oaaScores.studentId, studentId))
      .limit(1);
  }

  const oaaScore = oaa[0] || {
    academicScore: 0,
    skillsScore: 0,
    projectScore: 0,
    behaviorScore: 10,
    totalOaaScore: 10,
    percentileRank: 0,
  };

  // 3. Fetch skills, projects, predictions, and student profile in parallel
  const [studentData, studentSkills, studentProjects, latestPrediction, dotCountRes] = await Promise.all([
    getStudentById(studentId),
    db
      .select({
        id: skills.id,
        skillName: skills.skillName,
        proficiencyLevel: skills.proficiencyLevel,
        verified: skills.verified,
      })
      .from(skills)
      .where(eq(skills.studentId, studentId)),
    db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        techStack: projects.techStack,
        repoUrl: projects.repoUrl,
        score: projects.score,
      })
      .from(projects)
      .where(eq(projects.studentId, studentId)),
    db
      .select({
        id: aiPredictions.id,
        riskFlag: aiPredictions.riskFlag,
        score: aiPredictions.score,
        suggestions: aiPredictions.suggestions,
        createdAt: aiPredictions.createdAt,
      })
      .from(aiPredictions)
      .where(eq(aiPredictions.studentId, studentId))
      .orderBy(desc(aiPredictions.createdAt))
      .limit(1),
    db
      .select({ count: count(redDots.id) })
      .from(redDots)
      .where(eq(redDots.studentId, studentId)),
  ]);

  if (!studentData) {
    redirect("/login");
  }

  const dotCount = Number(dotCountRes[0]?.count) || 0;
  const prediction = latestPrediction[0] || null;

  return (
    <StudentDashboardView
      student={studentData}
      oaaScore={oaaScore}
      skills={studentSkills}
      projects={studentProjects}
      prediction={prediction}
      restriction={restriction.restriction}
      dotCount={dotCount}
    />
  );
}
