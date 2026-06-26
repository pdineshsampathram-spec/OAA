import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAttendanceRate } from "@/lib/db/queries/attendance";
import StudentAttendanceView from "@/components/student/StudentAttendanceView";

export const revalidate = 0;

export default async function StudentAttendancePage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "student" || !session.user.studentId) {
    redirect("/dashboard");
  }

  const studentId = session.user.studentId;

  const [records, rate] = await Promise.all([
    db
      .select()
      .from(attendance)
      .where(eq(attendance.studentId, studentId))
      .orderBy(desc(attendance.date)),
    getAttendanceRate(studentId),
  ]);

  // Count stats
  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const lateCount = records.filter((r) => r.status === "late").length;

  return (
    <StudentAttendanceView
      records={records}
      rate={rate}
      presentCount={presentCount}
      absentCount={absentCount}
      lateCount={lateCount}
    />
  );
}
