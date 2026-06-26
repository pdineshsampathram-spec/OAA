import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { getClassAnalytics } from "@/lib/db/queries/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    
    const { searchParams } = new URL(request.url);
    const className = searchParams.get("class") || undefined;

    const data = await getClassAnalytics(session.user.schoolId, className);

    return NextResponse.json(
      { data, error: null },
      {
        status: 200,
        headers: {
          "Cache-Control": "s-maxage=60",
        },
      }
    );
  } catch (error: unknown) {
    console.error("GET /api/analytics/overview error:", error);
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ data: null, error: message }, { status });
  }
}
