import { NextResponse } from "next/server";
import { getServerSession, ApiError, requireRole } from "@/lib/api/auth-helper";
import { calculateClassPotential } from "@/lib/scoring/oaaEngine";
import { rateLimitCheck } from "@/lib/api/rate-limit";

/**
 * GET /api/oaa/class-potential
 * Returns CP index for a given class+section. Teacher/admin/principal only.
 * Query params: class (required), section (required)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    requireRole(session, ["teacher", "admin", "principal"]);

    const userId = session.user?.id || "anon";
    const { allowed, retryAfter } = rateLimitCheck(`cp_${userId}`, 10, 60000);
    if (!allowed) {
      return NextResponse.json({ error: `Rate limited. Retry in ${retryAfter}s.`, status: 429 }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("class");
    const section = searchParams.get("section");

    if (!classId || !section) {
      return NextResponse.json(
        { error: "Both 'class' and 'section' query params are required.", status: 400 },
        { status: 400 }
      );
    }

    const schoolId = session.user?.schoolId || "school_1";
    const result = await calculateClassPotential(classId, section, schoolId);

    return NextResponse.json({ data: result, error: null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}
