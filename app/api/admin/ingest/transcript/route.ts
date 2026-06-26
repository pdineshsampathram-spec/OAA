import { NextResponse } from "next/server";
import { getServerSession, ApiError, requireRole } from "@/lib/api/auth-helper";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    requireRole(session, ["teacher", "admin", "principal"]);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ error: "No file uploaded", status: 400 }, { status: 400 });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:7860";
    
    // Forward the file to the python microservice
    const pythonFormData = new FormData();
    pythonFormData.append("file", file);

    const response = await fetch(`${aiServiceUrl}/ingest/transcript`, {
      method: "POST",
      body: pythonFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Python service error: ${errorText}`, status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}
