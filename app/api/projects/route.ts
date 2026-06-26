import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { calculateOAAScore } from "@/lib/scoring/oaaEngine";

/**
 * POST /api/projects — Add a new project for the logged-in student
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    const studentId = session.user?.studentId;

    if (!studentId) {
      return NextResponse.json({ error: "Only students can add projects.", status: 403 }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { title, description, techStack, repoUrl, score } = body;

    if (!title || !description || !techStack) {
      return NextResponse.json({ error: "title, description, and techStack are required.", status: 400 }, { status: 400 });
    }

    const newProject = await db.insert(projects).values({
      id: `proj_${generateId()}`,
      studentId,
      title,
      description,
      techStack,
      repoUrl: repoUrl || null,
      score: Number(score) || 0, // Defaults to 0, or mock score
      createdAt: new Date().toISOString(),
    }).returning();

    // Recalculate OAA score for student
    await calculateOAAScore(studentId);

    return NextResponse.json({ data: newProject[0], error: null }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}
