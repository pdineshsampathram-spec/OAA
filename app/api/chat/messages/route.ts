import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { db } from "@/lib/db";
import { peerMessages, students } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { getStudentRestriction } from "@/lib/discipline/checkRestriction";
import { moderateMessage } from "@/lib/chat/moderator";

/**
 * GET /api/chat/messages — Returns paginated messages for a room
 * Params: roomId, page (default 1)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    const role = session.user?.role;

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    if (!roomId) {
      return NextResponse.json({ error: "roomId is required.", status: 400 }, { status: 400 });
    }

    const messages = await db
      .select({
        id: peerMessages.id,
        senderId: peerMessages.senderId,
        senderName: students.name,
        roomId: peerMessages.roomId,
        content: peerMessages.content,
        flagged: peerMessages.flagged,
        flagReason: peerMessages.flagReason,
        moderationStatus: peerMessages.moderationStatus,
        sentAt: peerMessages.sentAt,
      })
      .from(peerMessages)
      .innerJoin(students, eq(peerMessages.senderId, students.id))
      .where(eq(peerMessages.roomId, roomId))
      .orderBy(desc(peerMessages.sentAt))
      .limit(limit)
      .offset(offset);

    // Sanitize for students: hide content of flagged messages
    const isStudent = role === "student";
    const sanitizedMessages = messages.map((msg) => {
      if (isStudent && msg.flagged === 1) {
        return {
          ...msg,
          content: "[Message removed by moderator]",
        };
      }
      return msg;
    });

    return NextResponse.json({ data: sanitizedMessages.reverse(), error: null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}

/**
 * POST /api/chat/messages — Send a new message
 * Body: { roomId: string, content: string }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    const role = session.user?.role;
    const studentId = session.user?.studentId;

    if (role !== "student" || !studentId) {
      return NextResponse.json(
        { error: "Only students can send messages in peer chat.", status: 403 },
        { status: 403 }
      );
    }

    // Check restrictions
    const restriction = await getStudentRestriction(studentId);
    if (restriction.isLocked || !restriction.canChat) {
      return NextResponse.json(
        { error: "You cannot send messages due to disciplinary restrictions.", status: 403 },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { roomId, content } = body;

    if (!roomId || !content) {
      return NextResponse.json(
        { error: "roomId and content are required.", status: 400 },
        { status: 400 }
      );
    }

    const messageId = `msg_${generateId()}`;

    // Fetch student info to return with the optimistic response
    const studentInfo = await db
      .select({ name: students.name })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    const senderName = studentInfo[0]?.name || "Unknown";

    const newMsgValues = {
      id: messageId,
      senderId: studentId,
      roomId,
      content,
      flagged: 0,
      flagReason: null,
      moderationStatus: "pending" as const,
      sentAt: new Date().toISOString(),
    };

    await db.insert(peerMessages).values(newMsgValues);

    // Trigger async moderation
    moderateMessage(messageId, content, roomId).catch((err) => {
      console.error("Moderation background failed:", err);
    });

    const responseData = {
      ...newMsgValues,
      senderName,
    };

    return NextResponse.json({ data: responseData, error: null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}
