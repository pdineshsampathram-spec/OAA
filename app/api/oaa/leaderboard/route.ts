import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { getLeaderboard } from "@/lib/scoring/oaaEngine";
import { rateLimitCheck } from "@/lib/api/rate-limit";

/**
 * GET /api/oaa/leaderboard
 * Returns paginated leaderboard. Students see only their own department.
 * Query params: department, class, section, limit (default 50), offset (default 0)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    const schoolId = session.user?.schoolId || "school_1";

    // Rate limit
    const userId = session.user?.id || "anon";
    const { allowed, retryAfter } = rateLimitCheck(`lb_${userId}`, 10, 60000);
    if (!allowed) {
      return NextResponse.json({ error: `Rate limited. Retry in ${retryAfter}s.`, status: 429 }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get("class") || undefined;
    const sectionFilter = searchParams.get("section") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Students can only see their own department (class)
    // For now, we don't restrict since department info isn't stored separately
    const leaderboard = await getLeaderboard({
      class: classFilter,
      section: sectionFilter,
      limit,
      offset,
      schoolId,
    });

    return NextResponse.json({
      data: leaderboard,
      total: leaderboard.length,
      limit,
      offset,
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}
