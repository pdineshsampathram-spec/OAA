import { NextResponse } from "next/server";
import { getServerSession, ApiError, requireRole } from "@/lib/api/auth-helper";
import { parseMarksPDF } from "@/lib/ingest/pdfParser";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    requireRole(session, ["teacher", "admin", "principal"]);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded", status: 400 }, { status: 400 });
    }

    const filename = file.name || "transcript.pdf";
    if (!filename.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload a PDF marks document.", status: 400 },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. First, attempt parsing with our high-precision local/Gemini PDF engine
    try {
      const parsedResult = await parseMarksPDF(buffer, filename);
      if (parsedResult.success && parsedResult.students.length > 0) {
        return NextResponse.json({
          success: true,
          filename,
          data: parsedResult.students,
          studentsCount: parsedResult.students.length,
          subjectsIdentified: parsedResult.subjectsIdentified,
          examType: parsedResult.examTypeDetected,
          parser: parsedResult.parserUsed,
        });
      }
    } catch (parseErr) {
      console.warn("Direct PDF parsing failed, trying microservice fallback:", parseErr);
    }

    // 2. Secondary fallback: forward to Python microservice if running
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:7860";
    try {
      const pythonFormData = new FormData();
      pythonFormData.append("file", file);

      const response = await fetch(`${aiServiceUrl}/ingest/transcript`, {
        method: "POST",
        body: pythonFormData,
      });

      if (response.ok) {
        const data = await response.json();
        const incomingData = Array.isArray(data.data) ? data.data : [data.data];
        return NextResponse.json({
          success: true,
          filename,
          data: incomingData,
          studentsCount: incomingData.length,
          parser: data.parser || "python_microservice",
        });
      }
    } catch (microserviceErr) {
      console.warn("Python microservice unreachable:", microserviceErr);
    }

    return NextResponse.json(
      {
        error: "Unable to extract student marks from the uploaded PDF. Please ensure the PDF is not password-protected and contains readable text.",
        status: 422,
      },
      { status: 422 }
    );
  } catch (error: unknown) {
    console.error("Transcript Ingest Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}

