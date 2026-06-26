import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getStudentById } from "@/lib/db/queries/students";
import StudentProfileView from "@/components/student/StudentProfileView";

export const revalidate = 0;

export default async function StudentProfilePage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "student" || !session.user.studentId) {
    redirect("/dashboard");
  }

  const student = await getStudentById(session.user.studentId);
  if (!student) {
    redirect("/dashboard");
  }

  return (
    <StudentProfileView
      student={student}
      email={session.user.email || ""}
    />
  );
}
