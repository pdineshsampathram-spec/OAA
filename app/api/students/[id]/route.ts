import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { getStudentById, updateStudent, deleteStudent } from "@/lib/db/queries/students";
import { z } from "zod";

const studentPatchSchema = z.object({
  name: z.string().min(1).optional(),
  class: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
  gender: z.string().min(1).optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const student = await getStudentById(params.id);

    if (!student || student.deletedAt) {
      return NextResponse.json({ data: null, error: "Student not found" }, { status: 404 });
    }

    if (student.schoolId !== session.user.schoolId) {
      return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: student, error: null }, { status: 200 });
  } catch (error: unknown) {
    console.error(`GET /api/students/${params.id} error:`, error);
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ data: null, error: message }, { status });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const body = await request.json();
    const validatedData = studentPatchSchema.parse(body);

    const student = await getStudentById(params.id);

    if (!student || student.deletedAt) {
      return NextResponse.json({ data: null, error: "Student not found" }, { status: 404 });
    }

    if (student.schoolId !== session.user.schoolId) {
      return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
    }

    const updated = await updateStudent(params.id, validatedData);

    return NextResponse.json({ data: updated, error: null }, { status: 200 });
  } catch (error: unknown) {
    console.error(`PATCH /api/students/${params.id} error:`, error);
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

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const student = await getStudentById(params.id);

    if (!student || student.deletedAt) {
      return NextResponse.json({ data: null, error: "Student not found" }, { status: 404 });
    }

    if (student.schoolId !== session.user.schoolId) {
      return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
    }

    const deleted = await deleteStudent(params.id);

    return NextResponse.json({ data: { success: deleted }, error: null }, { status: 200 });
  } catch (error: unknown) {
    console.error(`DELETE /api/students/${params.id} error:`, error);
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ data: null, error: message }, { status });
  }
}
