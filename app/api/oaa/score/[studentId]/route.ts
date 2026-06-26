import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { calculateOAAScore } from "@/lib/scoring/oaaEngine";
import { db } from "@/lib/db";
import { oaaScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { rateLimitCheck } from "@/lib/api/rate-limit";

/**
 * GET /api/oaa/score/[studentId]
 * Returns the current OAA score. If none exists, triggers calculation.
 */
export async function GET(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession();
    const { studentId } = params;

    // Rate limit by userId
    const userId = session.user?.id || "anon";
    const { allowed, retryAfter } = rateLimitCheck(`oaa_${userId}`, 10, 60000);
    if (!allowed) {
      return NextResponse.json({ error: `Rate limited. Retry in ${retryAfter}s.`, status: 429 }, { status: 429 });
    }

    // Check if OAA score exists
    const existing = await db
      .select()
      .from(oaaScores)
      .where(eq(oaaScores.studentId, studentId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ data: existing[0], error: null });
    }

    // No existing score — calculate fresh
    const result = await calculateOAAScore(studentId);

    // Save to DB
    const newScore = await db
      .insert(oaaScores)
      .values({
        id: `oaa_${generateId()}`,
        studentId,
        academicScore: result.academicScore,
        skillsScore: result.skillsScore,
        projectScore: result.projectScore,
        behaviorScore: result.behaviorScore,
        totalOaaScore: result.totalOaaScore,
        percentileRank: 0,
        classPotentialContribution: 0,
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({ data: newScore[0], error: null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}

/**
 * POST /api/oaa/score/[studentId]
 * Manually triggers recalculation for a student. Teacher/admin/principal only.
 */
export async function POST(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession();
    const role = session.user?.role;

    if (!role || !["teacher", "admin", "principal"].includes(role)) {
      return NextResponse.json({ error: "Forbidden", status: 403 }, { status: 403 });
    }

    const { studentId } = params;
    const result = await calculateOAAScore(studentId);

    // Upsert
    const existing = await db
      .select()
      .from(oaaScores)
      .where(eq(oaaScores.studentId, studentId))
      .limit(1);

    let saved;
    if (existing.length > 0) {
      const res = await db
        .update(oaaScores)
        .set({
          academicScore: result.academicScore,
          skillsScore: result.skillsScore,
          projectScore: result.projectScore,
          behaviorScore: result.behaviorScore,
          totalOaaScore: result.totalOaaScore,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(oaaScores.studentId, studentId))
        .returning();
      saved = res[0];
    } else {
      const res = await db
        .insert(oaaScores)
        .values({
          id: `oaa_${generateId()}`,
          studentId,
          academicScore: result.academicScore,
          skillsScore: result.skillsScore,
          projectScore: result.projectScore,
          behaviorScore: result.behaviorScore,
          totalOaaScore: result.totalOaaScore,
          percentileRank: 0,
          classPotentialContribution: 0,
          updatedAt: new Date().toISOString(),
        })
        .returning();
      saved = res[0];
    }

    return NextResponse.json({
      success: true,
      data: saved,
      breakdown: result.breakdown,
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}
