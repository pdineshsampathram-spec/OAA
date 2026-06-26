import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { db } from "@/lib/db";
import { chatRooms } from "@/lib/db/schema";

import { generateId } from "@/lib/utils";
import { getStudentRestriction } from "@/lib/discipline/checkRestriction";

/**
 * GET /api/chat/rooms — List available rooms for the logged-in user
 */
export async function GET() {
  try {
    const session = await getServerSession();
    const role = session.user?.role;
    const studentId = session.user?.studentId;

    // Students with "locked" restriction cannot access rooms
    if (role === "student" && studentId) {
      const restriction = await getStudentRestriction(studentId);
      if (restriction.isLocked) {
        return NextResponse.json({
          data: [],
          restriction: "locked",
          error: "Chat access suspended due to disciplinary action.",
        });
      }
    }

    // Return all rooms (in production, filter by membership)
    const rooms = await db.select().from(chatRooms);

    return NextResponse.json({ data: rooms, error: null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}

/**
 * POST /api/chat/rooms — Create a new team room
 * Body: { roomName: string, members: string[] }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    const role = session.user?.role;
    const studentId = session.user?.studentId;

    // Check restrictions for students
    if (role === "student" && studentId) {
      const restriction = await getStudentRestriction(studentId);
      if (restriction.isLocked || !restriction.canCreateTeams) {
        return NextResponse.json(
          { error: "You cannot create rooms due to disciplinary restrictions.", status: 403 },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const { roomName, members } = body;

    if (!roomName || !Array.isArray(members)) {
      return NextResponse.json(
        { error: "roomName (string) and members (string[]) are required.", status: 400 },
        { status: 400 }
      );
    }

    const room = await db
      .insert(chatRooms)
      .values({
        id: `room_${generateId()}`,
        name: roomName,
        type: "team",
        createdBy: session.user.id,
        memberIds: JSON.stringify(members),
      })
      .returning();

    return NextResponse.json({ data: room[0], error: null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}
