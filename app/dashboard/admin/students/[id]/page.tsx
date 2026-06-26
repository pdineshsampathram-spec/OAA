import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getStudentById, getStudentRank } from "@/lib/db/queries/students";
import StudentDetail from "@/components/students/StudentDetail";

export const revalidate = 0; // force dynamic rendering

interface PageProps {
  params: {
    id: string;
  };
}

export default async function StudentProfileDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const schoolId = (session.user as { schoolId?: string }).schoolId || "school_1";

  // Fetch student by id
  const student = await getStudentById(params.id);
  if (!student) {
    notFound();
  }

  // Ensure the user's school matches the student's school for isolation
  if (student.schoolId && student.schoolId !== schoolId) {
    redirect("/dashboard/admin/students");
  }

  // Get student rank
  const rank = await getStudentRank(params.id, schoolId);

  return (
    <StudentDetail
      student={student}
      marks={student.marks}
      attendance={student.attendance}
      prediction={student.prediction}
      rank={rank}
    />
  );
}
