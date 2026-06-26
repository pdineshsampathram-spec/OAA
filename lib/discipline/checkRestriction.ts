import { db } from "@/lib/db";
import { redDots } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export interface RestrictionResult {
  dotCount: number;
  restriction: "none" | "flag_only" | "read_only" | "locked";
  canChat: boolean;
  canCreateTeams: boolean;
  isLocked: boolean;
  excludedFromLeaderboard: boolean;
}

/**
 * Returns the current discipline restriction level for a student.
 * Used server-side in middleware and by API routes.
 *
 * Business rules:
 * - 0 dots:   "none"    → full access
 * - 1–2 dots: "flag_only" → warning, full access with flag
 * - 3–4 dots: "read_only" → chat read-only, cannot create teams
 * - 5+ dots:  "locked"    → full account lockout, excluded from leaderboards
 */
export async function getStudentRestriction(studentId: string): Promise<RestrictionResult> {
  const dotCountRes = await db
    .select({ count: count(redDots.id) })
    .from(redDots)
    .where(eq(redDots.studentId, studentId));

  const dotCount = Number(dotCountRes[0]?.count) || 0;

  let restriction: RestrictionResult["restriction"] = "none";
  let canChat = true;
  let canCreateTeams = true;
  let isLocked = false;
  let excludedFromLeaderboard = false;

  if (dotCount >= 5) {
    restriction = "locked";
    canChat = false;
    canCreateTeams = false;
    isLocked = true;
    excludedFromLeaderboard = true;
  } else if (dotCount >= 3) {
    restriction = "read_only";
    canChat = true; // Can read but not send
    canCreateTeams = false;
  } else if (dotCount >= 1) {
    restriction = "flag_only";
  }

  return {
    dotCount,
    restriction,
    canChat,
    canCreateTeams,
    isLocked,
    excludedFromLeaderboard,
  };
}

/**
 * Determines the action and restriction based on the dot count.
 */
export function getDisciplineAction(dotCount: number): {
  actionTaken: "warning" | "hearing" | "suspension_review";
  portalRestriction: "none" | "flag_only" | "read_only" | "locked";
} {
  if (dotCount >= 5) {
    return { actionTaken: "suspension_review", portalRestriction: "locked" };
  } else if (dotCount >= 3) {
    return { actionTaken: "hearing", portalRestriction: "read_only" };
  } else {
    return { actionTaken: "warning", portalRestriction: "flag_only" };
  }
}
