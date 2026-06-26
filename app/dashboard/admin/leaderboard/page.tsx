import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLeaderboard } from "@/lib/scoring/oaaEngine";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";

export const metadata = {
  title: "OAA Leaderboard | EduTrack",
  description: "Student leaderboard ranked by Overall Academic Analysis scores",
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { class?: string; section?: string; page?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const schoolId = session.user.schoolId || "school_1";
  const page = parseInt(searchParams.page || "1");
  const limit = 25;
  const offset = (page - 1) * limit;

  const leaderboard = await getLeaderboard({
    class: searchParams.class,
    section: searchParams.section,
    limit,
    offset,
    schoolId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          🏆 OAA Leaderboard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Student rankings based on Overall Academic Analysis scores
        </p>
      </div>

      <LeaderboardTable
        initialData={leaderboard}
        currentPage={page}
        pageSize={limit}
      />
    </div>
  );
}
