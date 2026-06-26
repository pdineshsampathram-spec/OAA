import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { getAttendanceByDate, upsertAttendanceBatch } from "@/lib/db/queries/attendance";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const attendanceRecordSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "studentId is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  status: z.enum(["present", "absent", "late"]),
});

const attendanceBatchSchema = z.array(attendanceRecordSchema);

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date");
    const className = searchParams.get("class") || undefined;

    if (!date) {
      return NextResponse.json(
        { data: null, error: "date query parameter (YYYY-MM-DD) is required" },
        { status: 400 }
      );
    }

    const data = await getAttendanceByDate(date, session.user.schoolId, className);
    return NextResponse.json({ data, error: null }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/attendance error:", error);
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ data: null, error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    const body = await request.json();
    const validatedData = attendanceBatchSchema.parse(body);

    if (validatedData.length === 0) {
      return NextResponse.json({ data: [], error: null }, { status: 201 });
    }

    const studentIds = Array.from(new Set(validatedData.map((r) => r.studentId)));

    // Multi-tenant check: make sure all students belong to the school
    const validStudents = await db
      .select({ id: students.id })
      .from(students)
      .where(
        and(
          inArray(students.id, studentIds),
          eq(students.schoolId, session.user.schoolId),
          isNull(students.deletedAt)
        )
      );

    const validStudentIds = new Set(validStudents.map((s) => s.id));
    const allValid = studentIds.every((id) => validStudentIds.has(id));

    if (!allValid) {
      return NextResponse.json(
        { data: null, error: "One or more students do not exist or do not belong to your school" },
        { status: 400 }
      );
    }

    const recordsToUpsert = validatedData.map((r) => ({
      id: r.id || `att_${generateId()}`,
      studentId: r.studentId,
      date: r.date,
      status: r.status,
      recordedBy: session.user.id,
    }));

    const result = await upsertAttendanceBatch(recordsToUpsert);

    return NextResponse.json({ data: result, error: null }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/attendance error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { data: null, error: error.issues[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ data: null, error: message }, { status });
  }
}
