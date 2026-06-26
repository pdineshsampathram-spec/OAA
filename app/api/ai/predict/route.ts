import { NextResponse } from "next/server";
import { getServerSession, ApiError } from "@/lib/api/auth-helper";
import { getStudentById } from "@/lib/db/queries/students";
import { getAttendanceRate } from "@/lib/db/queries/attendance";
import { upsertPrediction } from "@/lib/db/queries/predictions";
import { rateLimitCheck } from "@/lib/api/rate-limit";
import { generateId } from "@/lib/utils";
import { db } from "@/lib/db";
import { oaaScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/ai/predict
 *
 * Predicts student risk using the external AI microservice.
 * Falls back to a local rules engine if the microservice is offline.
 * Never returns a 500 — always returns a safe shape for the frontend.
 */
export async function POST(request: Request) {
  try {
    // 1. Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const { allowed, retryAfter } = rateLimitCheck(ip, 30, 60000);
    if (!allowed) {
      return NextResponse.json(
        {
          error: `Too Many Requests. Retry in ${retryAfter}s.`,
          riskScore: 0,
          riskFlag: 0,
          recommendations: [],
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    // 2. Auth check
    const session = await getServerSession();

    // 3. Parse request body
    const body = await request.json().catch(() => ({}));
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required", riskScore: 0, riskFlag: 0, recommendations: [] },
        { status: 400 }
      );
    }

    // ─── STEP 1: Fetch student data ──────────────────────────────────────
    let studentData;
    try {
      studentData = await getStudentById(studentId);
    } catch (err) {
      console.error("Failed to fetch student:", err);
      return NextResponse.json({
        studentId,
        error: "Failed to fetch student data",
        riskScore: 0,
        riskFlag: 0,
        recommendations: [],
        source: "error",
        computedAt: new Date().toISOString(),
      });
    }

    if (!studentData || studentData.deletedAt) {
      return NextResponse.json(
        { error: "Student not found", riskScore: 0, riskFlag: 0, recommendations: [] },
        { status: 404 }
      );
    }

    // Multi-tenant check
    if (studentData.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: "Forbidden", riskScore: 0, riskFlag: 0, recommendations: [] },
        { status: 403 }
      );
    }

    // ─── Calculate features from marks ────────────────────────────────────
    const marksList = studentData.marks || [];
    const avgMarks =
      marksList.length > 0
        ? marksList.reduce((sum, m) => sum + (m.marks / (m.maxMarks || 100)) * 100, 0) / marksList.length
        : 0;

    // Attendance rate
    let attendanceRate = 0;
    try {
      attendanceRate = await getAttendanceRate(studentId);
    } catch (err) {
      console.warn("Failed to get attendance rate:", err);
    }

    // Performance trend: last 3 exams avg vs first 3 exams avg
    const chronoMarks = [...marksList].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let marksTrend = 0;
    if (chronoMarks.length >= 2) {
      const first3 = chronoMarks.slice(0, Math.min(3, chronoMarks.length));
      const last3 = chronoMarks.slice(-Math.min(3, chronoMarks.length));
      const avgFirst = first3.reduce((s, m) => s + (m.marks / (m.maxMarks || 100)) * 100, 0) / first3.length;
      const avgLast = last3.reduce((s, m) => s + (m.marks / (m.maxMarks || 100)) * 100, 0) / last3.length;
      marksTrend = avgLast - avgFirst;
    }

    // Weak subjects: count subjects where avg < 40%
    const subjectMarks: Record<string, { sum: number; count: number }> = {};
    for (const m of marksList) {
      const pct = (m.marks / (m.maxMarks || 100)) * 100;
      if (!subjectMarks[m.subject]) subjectMarks[m.subject] = { sum: 0, count: 0 };
      subjectMarks[m.subject].sum += pct;
      subjectMarks[m.subject].count += 1;
    }
    let weakSubjectsCount = 0;
    const weakSubjectNames: string[] = [];
    for (const sub of Object.keys(subjectMarks)) {
      const avgSub = subjectMarks[sub].sum / subjectMarks[sub].count;
      if (avgSub < 40) {
        weakSubjectsCount++;
        weakSubjectNames.push(sub);
      }
    }

    // Absent streak: max consecutive absent days in last 30 days
    let absentStreak = 0;
    try {
      const attendanceRecords = studentData.attendance || [];
      const last30Days = attendanceRecords
        .filter((a) => {
          const d = new Date(a.date);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return d >= thirtyDaysAgo;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let currentStreak = 0;
      for (const record of last30Days) {
        if (record.status === "absent") {
          currentStreak++;
          if (currentStreak > absentStreak) absentStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
      }
    } catch (err) {
      console.warn("Failed to compute absent streak:", err);
    }

    // Fetch OAA scores if they exist
    let oaaData = null;
    try {
      const oaaRes = await db.select().from(oaaScores).where(eq(oaaScores.studentId, studentId)).limit(1);
      oaaData = oaaRes[0] || null;
    } catch (err) {
      console.warn("Failed to fetch OAA scores:", err);
    }

    const features = {
      avgMarks,
      attendanceRate,
      marksTrend,
      weakSubjectsCount,
      absentStreak,
    };

    // ─── STEP 2: Try external AI microservice ─────────────────────────────
    let riskScore = 0;
    let riskFlag: 0 | 1 = 0;
    let recommendations: string[] = [];
    let source: "microservice" | "fallback" = "fallback";

    if (process.env.AI_SERVICE_URL) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const aiResponse = await fetch(`${process.env.AI_SERVICE_URL}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(features),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (aiResponse.ok) {
          const result = await aiResponse.json();
          if (result && typeof result.riskFlag !== "undefined") {
            riskFlag = result.riskFlag ? 1 : 0;
            riskScore = typeof result.score === "number" ? Math.round(result.score * 100) : 0;
            if (Array.isArray(result.suggestions)) {
              recommendations = result.suggestions;
            } else if (typeof result.suggestions === "string") {
              try {
                recommendations = JSON.parse(result.suggestions);
              } catch {
                recommendations = [result.suggestions];
              }
            }
            source = "microservice";
          }
        } else {
          console.warn(`AI service returned status ${aiResponse.status}`);
        }
      } catch (err) {
        console.warn("AI microservice call failed, using fallback:", err);
      }
    }

    // ─── STEP 3: Fallback engine (must never crash) ───────────────────────
    if (source === "fallback") {
      riskScore = 0;

      // Condition 1: Low academic performance
      if (avgMarks < 40) {
        riskScore += 35;
        recommendations.push(
          `Academic performance critically low (${Math.round(avgMarks)}%). Schedule immediate remedial sessions${weakSubjectNames.length > 0 ? ` in ${weakSubjectNames.join(", ")}` : ""}.`
        );
      }

      // Condition 2: Poor attendance
      if (attendanceRate < 0.6) {
        riskScore += 30;
        recommendations.push(
          `Attendance rate at ${Math.round(attendanceRate * 100)}% — risk of exam ineligibility. Contact guardian immediately.`
        );
      }

      // Condition 3: Declining performance trend
      if (marksTrend < -5) {
        riskScore += 15;
        recommendations.push(
          `Performance declining by ${Math.round(Math.abs(marksTrend))} points. Schedule teacher-student meeting to identify causes.`
        );
      }

      // Condition 4: Multiple weak subjects
      if (weakSubjectsCount >= 3) {
        riskScore += 20;
        recommendations.push(
          `Struggling in ${weakSubjectsCount} subjects. Assign peer tutoring or after-school support.`
        );
      }

      // Cap at 100
      riskScore = Math.min(100, riskScore);
      riskFlag = riskScore >= 50 ? 1 : 0;

      // Default recommendations if none triggered
      if (recommendations.length === 0) {
        recommendations.push("Student on track — maintain current study habits and attendance.");
        recommendations.push("Encourage participation in extracurricular activities and skill-building.");
        recommendations.push("Continue monitoring progress with periodic check-ins.");
      }

      // Ensure exactly 3 recommendations
      while (recommendations.length < 3) {
        recommendations.push("Continue regular academic monitoring and provide supportive guidance.");
      }
      recommendations = recommendations.slice(0, 3);
    }

    // ─── STEP 4: Upsert prediction to database ───────────────────────────
    let prediction;
    try {
      prediction = await upsertPrediction({
        id: `pred_${generateId()}`,
        studentId,
        riskFlag,
        score: riskScore / 100, // Normalize to 0–1 for storage
        suggestions: JSON.stringify(recommendations),
      });
    } catch (err) {
      console.error("Failed to upsert prediction:", err);
      // Still return the computed result even if DB write fails
      prediction = {
        id: "temp",
        studentId,
        riskFlag,
        score: riskScore / 100,
        suggestions: JSON.stringify(recommendations),
        createdAt: new Date().toISOString(),
      };
    }

    // ─── STEP 5: Return result ────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      studentId,
      riskScore,
      riskFlag,
      recommendations,
      source,
      computedAt: new Date().toISOString(),
      prediction,
      oaaScore: oaaData
        ? {
            totalOaaScore: oaaData.totalOaaScore,
            academicScore: oaaData.academicScore,
            skillsScore: oaaData.skillsScore,
            projectScore: oaaData.projectScore,
            behaviorScore: oaaData.behaviorScore,
            percentileRank: oaaData.percentileRank,
          }
        : null,
      data: prediction,
      error: null,
    });
  } catch (error: unknown) {
    // ─── STEP 6: Global error handler (never return 500) ──────────────────
    console.error("AI Predict route error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 200;

    return NextResponse.json(
      {
        error: message,
        riskScore: 0,
        riskFlag: 0,
        recommendations: [],
        source: "error",
        computedAt: new Date().toISOString(),
      },
      { status }
    );
  }
}
