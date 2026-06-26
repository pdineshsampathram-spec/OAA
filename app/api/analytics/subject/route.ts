import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { db } from "@/lib/db";
import { marks, students } from "@/lib/db/schema";
import { eq, sql, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    const schoolId = session.user.schoolId;

    const data = await db
      .select({
        subject: marks.subject,
        avg: sql<number>`avg(${marks.marks} / ${marks.maxMarks} * 100)`,
        total: count(),
      })
      .from(marks)
      .innerJoin(students, eq(marks.studentId, students.id))
      .where(eq(students.schoolId, schoolId))
      .groupBy(marks.subject);

    return NextResponse.json({ data, error: null }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/analytics/subject error:", error);
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ data: null, error: message }, { status });
  }
}
