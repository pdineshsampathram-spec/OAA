import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { students, marks, attendance, schools } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import AnalyticsPage from "@/components/analytics/AnalyticsPage";

export const revalidate = 0;

export default async function DashboardAnalyticsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const { schoolId } = session.user;
  const activeSchoolId = schoolId || "school_1";

  // Fetch school details
  const schoolRes = await db
    .select({ name: schools.name })
    .from(schools)
    .where(eq(schools.id, activeSchoolId))
    .limit(1);
  const schoolName = schoolRes[0]?.name || "EduTrack School";

  // 1. Fetch active students in school
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

  if (schoolStudents.length === 0) {
    return (
      <AnalyticsPage
        students={[]}
        initialMarks={[]}
        initialAttendance={[]}
        classes={[]}
        sections={[]}
        schoolName={schoolName}
      />
    );
  }

  const studentIds = schoolStudents.map((s) => s.id);

  // 2. Fetch marks (chunked if large or direct IN)
  const schoolMarks = await db
    .select({
      id: marks.id,
      studentId: marks.studentId,
      subject: marks.subject,
      examType: marks.examType,
      marks: marks.marks,
      maxMarks: marks.maxMarks,
      createdAt: marks.createdAt,
    })
    .from(marks)
    .where(sql`${marks.studentId} IN (${sql.join(studentIds.map((id) => sql`${id}`), sql`, `)})`);

  // 3. Fetch attendance
  const schoolAttendance = await db
    .select({
      id: attendance.id,
      studentId: attendance.studentId,
      date: attendance.date,
      status: attendance.status,
    })
    .from(attendance)
    .where(sql`${attendance.studentId} IN (${sql.join(studentIds.map((id) => sql`${id}`), sql`, `)})`);

  // Unique lists for selectors
  const classesList = Array.from(new Set(schoolStudents.map((s) => s.class))).sort();
  const sectionsList = Array.from(new Set(schoolStudents.map((s) => s.section))).sort();

  return (
    <AnalyticsPage
      students={schoolStudents}
      initialMarks={schoolMarks}
      initialAttendance={schoolAttendance}
      classes={classesList}
      sections={sectionsList}
      schoolName={schoolName}
    />
  );
}
