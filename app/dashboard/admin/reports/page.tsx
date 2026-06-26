import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import ReportsPage from "@/components/reports/ReportsPage";

export const revalidate = 0;

export default async function DashboardReportsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const { schoolId } = session.user;
  const activeSchoolId = schoolId || "school_1";

  // Fetch all active students in this school for dropdown selections
  const studentList = await db
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

  // Extract unique classes
  const classesList = Array.from(new Set(studentList.map((s) => s.class))).sort();

  return (
    <ReportsPage
      students={studentList}
      classes={classesList}
    />
  );
}
