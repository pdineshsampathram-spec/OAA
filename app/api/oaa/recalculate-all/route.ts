import { NextResponse } from "next/server";
import { getServerSession, ApiError, requireRole } from "@/lib/api/auth-helper";
import { recalculateAllRanks } from "@/lib/scoring/oaaEngine";
import { rateLimitCheck } from "@/lib/api/rate-limit";

/**
 * POST /api/oaa/recalculate-all
 * Triggers full recalculation of OAA scores and percentile ranks for all students.
 * Admin/principal only.
 */
export async function POST() {
  try {
    const session = await getServerSession();
    requireRole(session, ["admin", "principal"]);

    const userId = session.user?.id || "anon";
    const { allowed, retryAfter } = rateLimitCheck(`recalc_${userId}`, 2, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Rate limited. Retry in ${retryAfter}s.`, status: 429 },
        { status: 429 }
      );
    }

    const schoolId = session.user?.schoolId || "school_1";
    const startTime = Date.now();

    const studentsProcessed = await recalculateAllRanks(schoolId);

    const duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;

    return NextResponse.json({
      success: true,
      studentsProcessed,
      duration,
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}
