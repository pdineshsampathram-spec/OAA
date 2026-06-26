import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getPredictionsBySchool } from "@/lib/db/queries/predictions";
import AIInsightsPage from "@/components/ai/AIInsightsPage";

export const revalidate = 0;

export default async function DashboardAIInsightsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const { schoolId } = session.user;
  const activeSchoolId = schoolId || "school_1";

  // Fetch all predictions with student data joined
  const predictionsData = await getPredictionsBySchool(activeSchoolId);

  // Fetch all active students in this school (needed to trigger predictions batch)
  const schoolStudents = await db
    .select({
      id: students.id,
      name: students.name,
      class: students.class,
      section: students.section,
    })
    .from(students)
    .where(and(
      eq(students.schoolId, activeSchoolId),
      isNull(students.deletedAt)
    ));

  // Structure predictions prop cleanly
  const predictions = predictionsData.map((item) => ({
    id: item.prediction.id,
    studentId: item.prediction.studentId,
    riskFlag: item.prediction.riskFlag,
    score: item.prediction.score,
    suggestions: item.prediction.suggestions,
    createdAt: item.prediction.createdAt,
    student: {
      name: item.student.name,
      class: item.student.class,
      section: item.student.section,
    },
  }));

  return (
    <AIInsightsPage
      initialPredictions={predictions}
      students={schoolStudents}
    />
  );
}
