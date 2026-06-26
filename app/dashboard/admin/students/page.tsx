import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getStudentsWithStats } from "@/lib/db/queries/students";
import StudentsPage from "@/components/students/StudentsPage";

export const revalidate = 0; // force dynamic rendering

interface PageProps {
  searchParams: {
    search?: string;
    class?: string;
    section?: string;
    gender?: string;
    page?: string;
  };
}

export default async function DashboardStudentsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const schoolId = (session.user as { schoolId?: string }).schoolId || "school_1";

  const search = searchParams.search || "";
  const className = searchParams.class === "all" ? undefined : searchParams.class;
  const section = searchParams.section === "all" ? undefined : searchParams.section;
  const gender = searchParams.gender === "all" ? undefined : searchParams.gender;
  const page = Number(searchParams.page) || 1;
  const limit = 20;

  // Fetch paginated student records with stats joined
  const { students, totalCount, totalPages } = await getStudentsWithStats({
    schoolId,
    search,
    class: className,
    section,
    gender,
    page,
    limit,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Student Directory</h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage student rosters, track academic and attendance averages, and monitor AI risk alerts.
        </p>
      </div>

      <StudentsPage
        students={students}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={page}
      />
    </div>
  );
}
