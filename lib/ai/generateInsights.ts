import { db } from "@/lib/db";
import { marks, attendance, students } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { upsertPrediction } from "@/lib/db/queries/predictions";
import { generateId } from "@/lib/utils";

export interface StudentInsightResult {
  studentId: string;
  riskScore: number; // 0-100
  riskFlag: 0 | 1;
  recommendations: string[];
  weakSubjects: string[];
  strongSubjects: string[];
  avgMarks: number;
  attendanceRate: number;
  source: "microservice" | "rules_engine";
}

/**
 * Computes and upserts AI insights (risk score, risk flag, and actionable recommendations)
 * for a specific student based on real-time academic marks, attendance, and trends.
 */
export async function generateStudentInsights(studentId: string): Promise<StudentInsightResult> {
  // 1. Fetch student info
  const studentRows = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (studentRows.length === 0) {
    throw new Error(`Student ${studentId} not found`);
  }

  // 2. Fetch all marks
  const studentMarks = await db
    .select()
    .from(marks)
    .where(eq(marks.studentId, studentId))
    .orderBy(desc(marks.createdAt));

  // 3. Compute subject performance and overall average
  const subjectScores: Record<string, { totalPct: number; count: number }> = {};
  let totalPctSum = 0;

  for (const m of studentMarks) {
    const max = Number(m.maxMarks) > 0 ? Number(m.maxMarks) : 100;
    const pct = (Number(m.marks) / max) * 100;
    totalPctSum += pct;

    const subKey = m.subject.trim();
    if (!subjectScores[subKey]) {
      subjectScores[subKey] = { totalPct: 0, count: 0 };
    }
    subjectScores[subKey].totalPct += pct;
    subjectScores[subKey].count += 1;
  }

  const avgMarks = studentMarks.length > 0 ? totalPctSum / studentMarks.length : 0;

  const weakSubjects: string[] = [];
  const strongSubjects: string[] = [];

  for (const [sub, data] of Object.entries(subjectScores)) {
    const subAvg = data.totalPct / data.count;
    if (subAvg < 50) {
      weakSubjects.push(`${sub} (${Math.round(subAvg)}%)`);
    } else if (subAvg >= 75) {
      strongSubjects.push(`${sub} (${Math.round(subAvg)}%)`);
    }
  }

  // 4. Compute attendance rate
  const attendanceRecords = await db
    .select()
    .from(attendance)
    .where(eq(attendance.studentId, studentId));

  let attendanceRate = 0.85; // Default assumption if no records yet
  let absentStreak = 0;

  if (attendanceRecords.length > 0) {
    const presentCount = attendanceRecords.filter((a) => a.status === "present").length;
    attendanceRate = presentCount / attendanceRecords.length;

    // Check absent streak
    const sortedAtt = [...attendanceRecords].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let streak = 0;
    for (const rec of sortedAtt) {
      if (rec.status === "absent") {
        streak++;
        if (streak > absentStreak) absentStreak = streak;
      } else {
        streak = 0;
      }
    }
  }

  // 5. Compute marks trend (recent vs first)
  let marksTrend = 0;
  if (studentMarks.length >= 2) {
    const chrono = [...studentMarks].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const firstGroup = chrono.slice(0, Math.min(3, chrono.length));
    const lastGroup = chrono.slice(-Math.min(3, chrono.length));

    const avgFirst =
      firstGroup.reduce((s, m) => s + (Number(m.marks) / (Number(m.maxMarks) || 100)) * 100, 0) /
      firstGroup.length;
    const avgLast =
      lastGroup.reduce((s, m) => s + (Number(m.marks) / (Number(m.maxMarks) || 100)) * 100, 0) /
      lastGroup.length;
    marksTrend = avgLast - avgFirst;
  }

  // 6. Try external AI microservice
  let riskScore = 0;
  let riskFlag: 0 | 1 = 0;
  let recommendations: string[] = [];
  let source: "microservice" | "rules_engine" = "rules_engine";

  const aiServiceUrl = process.env.AI_SERVICE_URL;
  if (aiServiceUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const aiResponse = await fetch(`${aiServiceUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          avg_marks: avgMarks,
          attendance_rate: attendanceRate,
          marks_trend: marksTrend,
          weak_subjects_count: weakSubjects.length,
          absent_streak: absentStreak,
        }),
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
      }
    } catch {
      // Gracefully fall back to local rules engine
      source = "rules_engine";
    }
  }

  // 7. Intelligent Heuristic Rules Engine (Fallback or primary when offline)
  if (source === "rules_engine" || recommendations.length === 0) {
    // Realistic risk baseline
    const baseline = 1.0 - (0.65 * (avgMarks / 100) + 0.35 * attendanceRate);
    riskScore = Math.max(0, Math.min(100, Math.round(baseline * 100)));

    if (weakSubjects.length > 0) {
      riskScore = Math.min(100, riskScore + weakSubjects.length * 8);
      recommendations.push(
        `Critical intervention needed in ${weakSubjects.join(", ")}. Schedule remedial tutoring sessions and review foundational concepts.`
      );
    }

    if (strongSubjects.length > 0) {
      recommendations.push(
        `High academic aptitude demonstrated in ${strongSubjects.join(", ")}. Candidate for peer mentorship and advanced project tracks.`
      );
    }

    if (avgMarks < 40) {
      riskScore = Math.max(riskScore, 70);
      recommendations.push(
        `Overall internal marks average (${Math.round(avgMarks)}%) is below passing threshold. Parent-teacher consultation urgently advised.`
      );
    } else if (avgMarks >= 80) {
      riskScore = Math.min(riskScore, 20);
      recommendations.push(
        `Excellent overall academic standing (${Math.round(avgMarks)}%). Encourage entry into competitive hackathons and honors programs.`
      );
    }

    if (attendanceRate < 0.65) {
      riskScore = Math.min(100, riskScore + 20);
      recommendations.push(
        `Attendance rate at ${Math.round(attendanceRate * 100)}% presents a serious risk of exam disqualification. Contact student counselor.`
      );
    }

    if (marksTrend < -7) {
      riskScore = Math.min(100, riskScore + 10);
      recommendations.push(
        `Downwards performance trajectory (-${Math.round(Math.abs(marksTrend))} points) observed across recent internal assessments.`
      );
    } else if (marksTrend > 7) {
      recommendations.push(
        `Commendable upwards marks trend (+${Math.round(marksTrend)} points) reflecting significant academic improvement.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        `Consistent internal performance maintained. Continue monitoring weekly homework submissions and class engagement.`
      );
    }

    riskScore = Math.min(100, Math.max(0, riskScore));
    riskFlag = riskScore >= 50 ? 1 : 0;
  }

  // 8. Upsert prediction into ai_predictions table
  await upsertPrediction({
    id: `pred_${generateId()}`,
    studentId,
    riskFlag,
    score: riskScore / 100,
    suggestions: JSON.stringify(recommendations),
  });

  return {
    studentId,
    riskScore,
    riskFlag,
    recommendations,
    weakSubjects,
    strongSubjects,
    avgMarks: Math.round(avgMarks * 10) / 10,
    attendanceRate: Math.round(attendanceRate * 100) / 100,
    source,
  };
}
