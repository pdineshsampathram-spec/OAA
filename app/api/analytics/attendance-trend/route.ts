import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { db } from "@/lib/db";
import { attendance, students } from "@/lib/db/schema";
import { eq, sql, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 7;

    if (isNaN(days) || days <= 0) {
      return NextResponse.json(
        { data: null, error: "Invalid days parameter" },
        { status: 400 }
      );
    }

    const trend = await db
      .select({
        date: attendance.date,
        presentCount: sql<number>`SUM(CASE WHEN ${attendance.status} IN ('present', 'late') THEN 1 ELSE 0 END)`,
        totalCount: count(attendance.id),
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(eq(students.schoolId, session.user.schoolId))
      .groupBy(attendance.date)
      .orderBy(sql`${attendance.date} DESC`)
      .limit(days);

    const dailyTrend = trend
      .map((t) => ({
        date: t.date,
        attendanceRate: t.totalCount > 0 ? (t.presentCount / t.totalCount) * 100 : 0,
        presentCount: t.presentCount || 0,
        totalCount: t.totalCount || 0,
      }))
      .reverse();

    return NextResponse.json({ data: dailyTrend, error: null }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/analytics/attendance-trend error:", error);
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ data: null, error: message }, { status });
  }
}
