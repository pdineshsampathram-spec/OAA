import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getStudents } from "@/lib/db/queries/students";
import { getMarksForSchool } from "@/lib/db/queries/marks";
import MarksPage from "@/components/marks/MarksPage";

export const revalidate = 0; // force dynamic rendering

export default async function DashboardMarksPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const schoolId = (session.user as { schoolId?: string }).schoolId || "school_1";

  // Fetch all students for dropdown selection and filtering (limit high to fetch full roster)
  const studentsResult = await getStudents({
    schoolId,
    limit: 1000,
  });

  // Fetch all recorded marks for the school
  const marksResult = await getMarksForSchool(schoolId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Academic Marks Entry</h2>
        <p className="text-xs text-slate-400 mt-1">
          Record, filter, and view students&apos; marks across exams and assignments. Double-click any score cell to make inline edits.
        </p>
      </div>

      <MarksPage
        initialMarks={marksResult}
        students={studentsResult.students}
      />
    </div>
  );
}
