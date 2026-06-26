import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { getMarksByStudent, getMarksByClass, getMarksForSchool, createMark } from "@/lib/db/queries/marks";
import { getStudentById } from "@/lib/db/queries/students";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const markCreateSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "studentId is required"),
  subject: z.string().min(1, "subject is required"),
  examType: z.enum(["unit_test", "midterm", "final", "assignment"]),
  marks: z.number().min(0, "marks must be at least 0"),
  maxMarks: z.number().default(100),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    const { searchParams } = new URL(request.url);

    const studentId = searchParams.get("studentId");
    const className = searchParams.get("class");

    if (studentId) {
      const student = await getStudentById(studentId);
      if (!student || student.deletedAt || student.schoolId !== session.user.schoolId) {
        return NextResponse.json({ data: null, error: "Student not found" }, { status: 404 });
      }
      const data = await getMarksByStudent(studentId);
      return NextResponse.json({ data, error: null }, { status: 200 });
    }

    if (className) {
      const data = await getMarksByClass(session.user.schoolId, className);
      return NextResponse.json({ data, error: null }, { status: 200 });
    }

    // Default: return all marks for the school
    const data = await getMarksForSchool(session.user.schoolId);
    return NextResponse.json({ data, error: null }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/marks error:", error);
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ data: null, error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    const body = await request.json();
    const validatedData = markCreateSchema.parse(body);

    const student = await getStudentById(validatedData.studentId);
    if (!student || student.deletedAt || student.schoolId !== session.user.schoolId) {
      return NextResponse.json({ data: null, error: "Student not found" }, { status: 404 });
    }

    const newMark = await createMark({
      id: validatedData.id || `mark_${generateId()}`,
      studentId: validatedData.studentId,
      subject: validatedData.subject,
      examType: validatedData.examType,
      marks: validatedData.marks,
      maxMarks: validatedData.maxMarks,
      recordedBy: session.user.id,
    });

    return NextResponse.json({ data: newMark, error: null }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/marks error:", error);
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
