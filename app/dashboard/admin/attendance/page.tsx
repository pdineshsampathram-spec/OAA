import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getStudents } from "@/lib/db/queries/students";
import AttendancePage from "@/components/attendance/AttendancePage";

export const revalidate = 0; // force dynamic rendering

export default async function DashboardAttendancePage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const schoolId = (session.user as { schoolId?: string }).schoolId || "school_1";

  // Fetch all students for the school to compile the registers
  const studentsResult = await getStudents({
    schoolId,
    limit: 1000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Attendance Tracker</h2>
        <p className="text-xs text-slate-400 mt-1">
          Monitor and log daily attendance. Select the date and class rosters to mark present, late, or absent.
        </p>
      </div>

      <AttendancePage students={studentsResult.students} />
    </div>
  );
}
