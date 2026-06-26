import { NextResponse } from "next/server";
import { getServerSession, ApiError, requireRole } from "@/lib/api/auth-helper";
import { db } from "@/lib/db";
import { peerMessages, moderationAlerts, students } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";

/**
 * GET /api/chat/moderate — Get unresolved flagged messages for faculty/admin review
 */
export async function GET() {
  try {
    const session = await getServerSession();
    requireRole(session, ["teacher", "admin", "principal"]);

    const alerts = await db
      .select({
        alertId: moderationAlerts.id,
        messageId: moderationAlerts.messageId,
        roomId: moderationAlerts.roomId,
        reason: moderationAlerts.reason,
        createdAt: moderationAlerts.createdAt,
        content: peerMessages.content,
        senderName: students.name,
      })
      .from(moderationAlerts)
      .innerJoin(peerMessages, eq(moderationAlerts.messageId, peerMessages.id))
      .innerJoin(students, eq(peerMessages.senderId, students.id))
      .where(isNull(moderationAlerts.resolvedAt));

    return NextResponse.json({ data: alerts, error: null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}

/**
 * PATCH /api/chat/moderate — Resolve a flag (approve or remove)
 * Body: { messageId: string, action: "approve" | "remove" }
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    requireRole(session, ["teacher", "admin", "principal"]);

    const body = await request.json().catch(() => ({}));
    const { messageId, action } = body;

    if (!messageId || !action || !["approve", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "messageId and action ('approve' | 'remove') are required.", status: 400 },
        { status: 400 }
      );
    }

    if (action === "approve") {
      await db
        .update(peerMessages)
        .set({
          moderationStatus: "clean",
          flagged: 0,
        })
        .where(eq(peerMessages.id, messageId));
    } else {
      await db
        .update(peerMessages)
        .set({
          content: "[Message removed by moderator]",
          moderationStatus: "blocked",
        })
        .where(eq(peerMessages.id, messageId));
    }

    // Mark the alert as resolved
    await db
      .update(moderationAlerts)
      .set({
        resolvedAt: new Date().toISOString(),
        reviewedBy: session.user.id,
      })
      .where(eq(moderationAlerts.messageId, messageId));

    return NextResponse.json({ success: true, error: null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}
