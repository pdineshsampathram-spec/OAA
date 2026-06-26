import { NextResponse } from "next/server";
import { getServerSession, ApiError, requireRole } from "@/lib/api/auth-helper";
import { db } from "@/lib/db";
import { redDots, users, oaaScores } from "@/lib/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { getStudentRestriction, getDisciplineAction } from "@/lib/discipline/checkRestriction";

/**
 * POST /api/discipline — Issue a new red dot
 * Body: { studentId: string, reason: string }
 * Auth: only teacher, admin, or principal
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    requireRole(session, ["teacher", "admin", "principal"]);

    const body = await request.json().catch(() => ({}));
    const { studentId, reason } = body;

    if (!studentId || !reason) {
      return NextResponse.json(
        { error: "studentId and reason are required.", status: 400 },
        { status: 400 }
      );
    }

    if (typeof reason === "string" && reason.length < 10) {
      return NextResponse.json(
        { error: "Reason must be at least 10 characters.", status: 400 },
        { status: 400 }
      );
    }

    // 1. Count existing red dots
    const existingRes = await db
      .select({ count: count(redDots.id) })
      .from(redDots)
      .where(eq(redDots.studentId, studentId));
    const existingCount = Number(existingRes[0]?.count) || 0;
    const newCount = existingCount + 1;

    // 2. Determine action and restriction
    const { actionTaken, portalRestriction } = getDisciplineAction(newCount);

    // 3. Insert new red dot record
    await db.insert(redDots).values({
      id: `rd_${generateId()}`,
      studentId,
      issuedBy: session.user.id || "unknown",
      reason,
      dotCount: newCount,
      actionTaken,
      portalRestriction,
    });

    // 4. Update behavior score in oaa_scores
    const newBehaviorScore = Math.max(0, 10 - newCount * 2);
    const existingOaa = await db
      .select()
      .from(oaaScores)
      .where(eq(oaaScores.studentId, studentId))
      .limit(1);

    let oaaScoreImpact = 0;
    if (existingOaa.length > 0) {
      const oldBehavior = existingOaa[0].behaviorScore;
      oaaScoreImpact = oldBehavior - newBehaviorScore;

      await db
        .update(oaaScores)
        .set({
          behaviorScore: newBehaviorScore,
          totalOaaScore:
            existingOaa[0].academicScore +
            existingOaa[0].skillsScore +
            existingOaa[0].projectScore +
            newBehaviorScore,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(oaaScores.studentId, studentId));
    }

    return NextResponse.json({
      success: true,
      newDotCount: newCount,
      actionTaken,
      portalRestriction,
      oaaScoreImpact,
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}

/**
 * GET /api/discipline?studentId=X — Get red dot history
 * GET /api/discipline/check?studentId=X is handled separately via query param detection
 */
export async function GET(request: Request) {
  try {
    await getServerSession();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const isCheckEndpoint = searchParams.get("check") === "true";

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId query param is required.", status: 400 },
        { status: 400 }
      );
    }

    // Check endpoint — returns current restriction level
    if (isCheckEndpoint) {
      const restriction = await getStudentRestriction(studentId);
      return NextResponse.json({ data: restriction, error: null });
    }

    // History endpoint — returns all red dot records with issuer name
    const history = await db
      .select({
        id: redDots.id,
        studentId: redDots.studentId,
        reason: redDots.reason,
        dotCount: redDots.dotCount,
        actionTaken: redDots.actionTaken,
        portalRestriction: redDots.portalRestriction,
        createdAt: redDots.createdAt,
        issuedByName: users.name,
        issuedByRole: users.role,
      })
      .from(redDots)
      .innerJoin(users, eq(redDots.issuedBy, users.id))
      .where(eq(redDots.studentId, studentId))
      .orderBy(desc(redDots.createdAt));

    return NextResponse.json({ data: history, error: null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}
