import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { getStudents, createStudent } from "@/lib/db/queries/students";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const studentCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  class: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  gender: z.string().min(1, "Gender is required"),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || undefined;
    const className = searchParams.get("class") || undefined;
    const section = searchParams.get("section") || undefined;
    
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const result = await getStudents({
      schoolId: session.user.schoolId,
      search,
      class: className,
      section,
      page,
      limit,
    });

    return NextResponse.json({ data: result, error: null }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/students error:", error);
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ data: null, error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    const body = await request.json();
    const validatedData = studentCreateSchema.parse(body);

    const newStudent = await createStudent({
      id: validatedData.id || `stud_${generateId()}`,
      name: validatedData.name,
      class: validatedData.class,
      section: validatedData.section,
      gender: validatedData.gender,
      schoolId: session.user.schoolId,
    });

    // Fire async prediction
    const origin = new URL(request.url).origin;
    fetch(`${origin}/api/ai/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": request.headers.get("cookie") || "",
      },
      body: JSON.stringify({ studentId: newStudent.id }),
    }).catch((err) => {
      console.error("Async predict call failed for student:", newStudent.id, err);
    });

    return NextResponse.json({ data: newStudent, error: null }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/students error:", error);
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
