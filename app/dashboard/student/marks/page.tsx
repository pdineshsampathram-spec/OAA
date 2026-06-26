import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMarksByStudent, getSubjectAvgByStudent } from "@/lib/db/queries/marks";
import StudentMarksView from "@/components/student/StudentMarksView";

export const revalidate = 0;

export default async function StudentMarksPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "student" || !session.user.studentId) {
    redirect("/dashboard");
  }

  const [allMarks, subjectAvgs] = await Promise.all([
    getMarksByStudent(session.user.studentId),
    getSubjectAvgByStudent(session.user.studentId),
  ]);

  return <StudentMarksView marks={allMarks} subjectAvgs={subjectAvgs} />;
}
