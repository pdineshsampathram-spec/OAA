import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { createMarksBulk } from "@/lib/db/queries/marks";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const marksBulkSchema = z.array(
  z.object({
    id: z.string().optional(),
    studentId: z.string().min(1, "studentId is required"),
    subject: z.string().min(1, "subject is required"),
    examType: z.enum(["unit_test", "midterm", "final", "assignment"]),
    marks: z.number().min(0, "marks must be at least 0"),
    maxMarks: z.number().default(100),
  })
);

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    const body = await request.json();
    const validatedData = marksBulkSchema.parse(body);

    if (validatedData.length === 0) {
      return NextResponse.json({ data: { inserted: 0 }, error: null }, { status: 201 });
    }

    const studentIds = Array.from(new Set(validatedData.map((m) => m.studentId)));

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

    const recordsToInsert = validatedData.map((m) => ({
      id: m.id || `mark_${generateId()}`,
      studentId: m.studentId,
      subject: m.subject,
      examType: m.examType,
      marks: m.marks,
      maxMarks: m.maxMarks,
      recordedBy: session.user.id,
    }));

    const inserted = await createMarksBulk(recordsToInsert);

    return NextResponse.json({ data: { inserted: inserted.length }, error: null }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/marks/bulk error:", error);
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
