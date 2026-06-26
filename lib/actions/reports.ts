"use server";

import { db } from "@/lib/db";
import { students, marks, attendance, aiPredictions, schools, oaaScores, redDots } from "@/lib/db/schema";
import { eq, and, isNull, like, sql, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { getStudentRank } from "@/lib/db/queries/students";
import type { ClassReport } from "@/lib/export/generateClassPDF";
import type { StudentReport } from "@/lib/export/generateStudentPDF";
import type { AttendanceReport } from "@/lib/export/generateAttendanceExcel";


function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 40) return "D";
  return "F";
}

export async function getClassReportAction(className: string): Promise<{ success: boolean; data?: ClassReport; error?: string }> {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.schoolId) {
      return { success: false, error: "Unauthorized" };
    }
    const schoolId = session.user.schoolId;

    // Fetch school name
    const schoolRes = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, schoolId)).limit(1);
    const schoolName = schoolRes[0]?.name || "EduTrack School";

    // Query all students in this class
    const classStudents = await db
      .select({
        id: students.id,
        name: students.name,
        class: students.class,
        section: students.section,
      })
      .from(students)
      .where(and(
        eq(students.schoolId, schoolId),
        eq(students.class, className),
        isNull(students.deletedAt)
      ));

    if (classStudents.length === 0) {
      return { success: false, error: `No students found in class ${className}` };
    }

    const studentIds = classStudents.map(s => s.id);

    // Fetch OAA scores for these students
    const classOaaScores = await db
      .select()
      .from(oaaScores)
      .where(sql`${oaaScores.studentId} IN (${sql.join(studentIds.map(id => sql`${id}`), sql`, `)})`);
    const oaaMap = new Map(classOaaScores.map(o => [o.studentId, o]));

    // Fetch red dots for these students
    const redDotCounts = await db
      .select({ studentId: redDots.studentId, count: sql<number>`count(${redDots.id})` })
      .from(redDots)
      .where(sql`${redDots.studentId} IN (${sql.join(studentIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(redDots.studentId);
    const redDotMap = new Map(redDotCounts.map(r => [r.studentId, Number(r.count)]));

    // Fetch all marks for these students
    const classMarks = await db
      .select()
      .from(marks)
      .where(sql`${marks.studentId} IN (${sql.join(studentIds.map(id => sql`${id}`), sql`, `)})`);

    // Fetch all attendance for these students
    const classAttendance = await db
      .select()
      .from(attendance)
      .where(sql`${attendance.studentId} IN (${sql.join(studentIds.map(id => sql`${id}`), sql`, `)})`);

    // Fetch latest predictions for these students
    const classPredictions = await db
      .select()
      .from(aiPredictions)
      .where(sql`${aiPredictions.studentId} IN (${sql.join(studentIds.map(id => sql`${id}`), sql`, `)})`);

    // Group predictions by studentId
    const predictionMap = new Map(classPredictions.map(p => [p.studentId, p]));

    // Calculate per student averages and attendance rates
    const studentAverages = classStudents.map(student => {
      const studentMarks = classMarks.filter(m => m.studentId === student.id);
      const studentAttendance = classAttendance.filter(a => a.studentId === student.id);
      
      const avg = studentMarks.length > 0
        ? studentMarks.reduce((sum, m) => sum + (m.marks / m.maxMarks * 100), 0) / studentMarks.length
        : 0;

      const presentCount = studentAttendance.filter(a => a.status === "present" || a.status === "late").length;
      const attRate = studentAttendance.length > 0 ? (presentCount / studentAttendance.length) : 1.0;

      const pred = predictionMap.get(student.id);

      // Fetch OAA score and red dots
      const oaaInfo = oaaMap.get(student.id);
      const redDotCount = redDotMap.get(student.id) || 0;

      return {
        id: student.id,
        name: student.name,
        avgMarks: avg,
        attendanceRate: attRate,
        riskScore: pred ? pred.score : (avg < 40 || attRate < 0.75 ? 0.75 : 0.15),
        riskFlag: pred ? pred.riskFlag === 1 : (avg < 40 || attRate < 0.75),
        oaaScore: oaaInfo ? oaaInfo.totalOaaScore : 0,
        redDotCount,
      };
    });

    // Calculate Summary Stats
    const totalStudents = classStudents.length;
    const avgMarks = studentAverages.reduce((sum, s) => sum + s.avgMarks, 0) / totalStudents;
    
    const totalMarks = classMarks.length;
    const passedMarks = classMarks.filter(m => m.marks >= m.maxMarks * 0.4).length;
    const passPercentage = totalMarks > 0 ? (passedMarks / totalMarks) * 100 : 100;

    const classAttSum = classAttendance.length > 0
      ? (classAttendance.filter(a => a.status === "present" || a.status === "late").length / classAttendance.length) * 100
      : 100;

    // Calculate class potential (CP) and average OAA score
    const avgOaaScore = studentAverages.reduce((sum, s) => sum + s.oaaScore, 0) / totalStudents;
    const classPotential = avgMarks; // CP = average marks normalized out of 100

    // Calculate Subject-wise Performance
    const subjectMap = new Map<string, number[]>();
    const subjectMax = new Map<string, number>();
    const subjectMin = new Map<string, number>();
    const subjectPass = new Map<string, { total: number; passed: number }>();

    classMarks.forEach((m) => {
      const pct = m.marks / m.maxMarks * 100;
      if (!subjectMap.has(m.subject)) {
        subjectMap.set(m.subject, []);
        subjectMax.set(m.subject, pct);
        subjectMin.set(m.subject, pct);
        subjectPass.set(m.subject, { total: 0, passed: 0 });
      }
      subjectMap.get(m.subject)!.push(pct);
      if (pct > subjectMax.get(m.subject)!) subjectMax.set(m.subject, pct);
      if (pct < subjectMin.get(m.subject)!) subjectMin.set(m.subject, pct);

      const passStats = subjectPass.get(m.subject)!;
      passStats.total += 1;
      if (m.marks >= m.maxMarks * 0.40) passStats.passed += 1;
    });

    const subjects = Array.from(subjectMap.keys()).map((sub) => {
      const pcts = subjectMap.get(sub)!;
      const passRate = (subjectPass.get(sub)!.passed / subjectPass.get(sub)!.total) * 100;
      return {
        subject: sub,
        avg: pcts.reduce((sum, v) => sum + v, 0) / pcts.length,
        highest: subjectMax.get(sub)!,
        lowest: subjectMin.get(sub)!,
        passPercentage: passRate,
      };
    });

    // Top performers sorted by OAA Score descending
    const sortedPerformers = [...studentAverages]
      .sort((a, b) => b.oaaScore - a.oaaScore)
      .slice(0, 10)
      .map((s, index) => ({
        rank: index + 1,
        name: s.name,
        avgMarks: s.avgMarks,
        grade: getGrade(s.avgMarks),
        oaaScore: s.oaaScore,
      }));

    // At-Risk
    const atRiskStudents = studentAverages
      .filter((s) => s.riskFlag || s.attendanceRate < 0.75 || s.redDotCount >= 2)
      .map((s) => ({
        name: s.name,
        avgMarks: s.avgMarks,
        attendance: s.attendanceRate * 100,
        riskScore: s.riskScore,
        redDotCount: s.redDotCount,
      }));

    return {
      success: true,
      data: {
        schoolName,
        className,
        dateGenerated: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        summary: {
          totalStudents,
          avgMarks,
          passPercentage,
          attendanceRate: classAttSum,
          avgOaaScore,
          classPotential,
        },
        subjects,
        topPerformers: sortedPerformers,
        atRiskStudents,
      },
    };
  } catch (error: unknown) {
    console.error("getClassReportAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch class report data";
    return { success: false, error: message };
  }
}

export async function getStudentReportAction(studentId: string): Promise<{ success: boolean; data?: StudentReport; error?: string }> {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.schoolId) {
      return { success: false, error: "Unauthorized" };
    }
    const schoolId = session.user.schoolId;

    // Fetch school name
    const schoolRes = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, schoolId)).limit(1);
    const schoolName = schoolRes[0]?.name || "EduTrack School";

    // Fetch student profile
    const student = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (student.length === 0 || student[0].deletedAt) {
      return { success: false, error: "Student not found" };
    }
    const sProfile = student[0];

    // Fetch marks
    const studentMarks = await db
      .select()
      .from(marks)
      .where(eq(marks.studentId, studentId))
      .orderBy(marks.createdAt);

    // Fetch attendance
    const studentAttendance = await db
      .select()
      .from(attendance)
      .where(eq(attendance.studentId, studentId))
      .orderBy(attendance.date);

    // Fetch prediction
    const predRes = await db
      .select()
      .from(aiPredictions)
      .where(eq(aiPredictions.studentId, studentId))
      .orderBy(desc(aiPredictions.createdAt))
      .limit(1);
    const prediction = predRes[0] || null;

    // Calculate rank
    const rank = await getStudentRank(studentId, schoolId);

    // Fetch OAA score
    const oaaRes = await db
      .select()
      .from(oaaScores)
      .where(eq(oaaScores.studentId, studentId))
      .limit(1);
    const oaaInfo = oaaRes[0] || null;

    // Subject breakdown
    const subjectMarksMap = new Map<string, { exam1: number | null; exam2: number | null; final: number | null; scores: number[] }>();
    studentMarks.forEach((m) => {
      if (!subjectMarksMap.has(m.subject)) {
        subjectMarksMap.set(m.subject, { exam1: null, exam2: null, final: null, scores: [] });
      }
      const item = subjectMarksMap.get(m.subject)!;
      const pct = m.marks / m.maxMarks * 100;
      item.scores.push(pct);
      
      if (m.examType === "unit_test" || m.examType === "assignment") {
        item.exam1 = pct;
      } else if (m.examType === "midterm") {
        item.exam2 = pct;
      } else if (m.examType === "final") {
        item.final = pct;
      }
    });

    const subjects = Array.from(subjectMarksMap.keys()).map((sub) => {
      const details = subjectMarksMap.get(sub)!;
      const avg = details.scores.reduce((sum, v) => sum + v, 0) / details.scores.length;
      return {
        subject: sub,
        exam1: details.exam1,
        exam2: details.exam2,
        final: details.final,
        avg,
        grade: getGrade(avg),
      };
    });

    // Overall summary marks avg
    const overallAvg = studentMarks.length > 0
      ? studentMarks.reduce((sum, m) => sum + (m.marks / m.maxMarks * 100), 0) / studentMarks.length
      : 0;

    // Attendance stats
    const totalDays = studentAttendance.length;
    const present = studentAttendance.filter(a => a.status === "present").length;
    const late = studentAttendance.filter(a => a.status === "late").length;
    const absent = studentAttendance.filter(a => a.status === "absent").length;
    const attPercentage = totalDays > 0 ? ((present + late) / totalDays) : 1.0;

    // Calculate absent streak
    let currentStreak = 0;
    let maxStreak = 0;
    studentAttendance.forEach((a) => {
      if (a.status === "absent") {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    // AI prediction mapping
    let aiInsights = null;
    if (prediction) {
      const score = prediction.score;
      let riskLevel: "High" | "Medium" | "Low" = "Low";
      if (score >= 0.70) riskLevel = "High";
      else if (score >= 0.35) riskLevel = "Medium";

      let suggestions: string[] = [];
      try {
        suggestions = JSON.parse(prediction.suggestions);
      } catch {
        suggestions = [prediction.suggestions];
      }

      aiInsights = {
        riskLevel,
        riskScore: score,
        suggestions,
      };
    }

    return {
      success: true,
      data: {
        studentName: sProfile.name,
        className: sProfile.class,
        sectionName: sProfile.section,
        schoolName,
        gender: sProfile.gender,
        summary: {
          avgMarks: overallAvg,
          attendanceRate: attPercentage,
          rank,
          grade: getGrade(overallAvg),
          oaaScore: oaaInfo ? oaaInfo.totalOaaScore : null,
          percentileRank: oaaInfo ? oaaInfo.percentileRank : null,
          academicScore: oaaInfo ? oaaInfo.academicScore : null,
          skillsScore: oaaInfo ? oaaInfo.skillsScore : null,
          projectScore: oaaInfo ? oaaInfo.projectScore : null,
          behaviorScore: oaaInfo ? oaaInfo.behaviorScore : null,
        },
        subjects,
        attendance: {
          present,
          absent,
          late,
          percentage: attPercentage,
          streak: maxStreak,
        },
        aiInsights,
      },
    };
  } catch (error: unknown) {
    console.error("getStudentReportAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch student report data";
    return { success: false, error: message };
  }
}

export async function getAttendanceReportAction(className: string, monthStr: string): Promise<{ success: boolean; data?: AttendanceReport; error?: string }> {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.schoolId) {
      return { success: false, error: "Unauthorized" };
    }
    const schoolId = session.user.schoolId;

    // Fetch class students
    const classStudents = await db
      .select({
        id: students.id,
        name: students.name,
      })
      .from(students)
      .where(and(
        eq(students.schoolId, schoolId),
        eq(students.class, className),
        isNull(students.deletedAt)
      ));

    if (classStudents.length === 0) {
      return { success: false, error: `No students found in class ${className}` };
    }

    const studentIds = classStudents.map(s => s.id);
    const pattern = `${monthStr}-%`;

    // Query attendance records for these students in this month
    const monthlyAttendance = await db
      .select()
      .from(attendance)
      .where(and(
        sql`${attendance.studentId} IN (${sql.join(studentIds.map(id => sql`${id}`), sql`, `)})`,
        like(attendance.date, pattern)
      ))
      .orderBy(attendance.date);

    // Get sorted list of all unique dates present in records
    const dateSet = new Set<string>();
    monthlyAttendance.forEach((a) => dateSet.add(a.date));
    const allDates = Array.from(dateSet).sort();

    // Map by student
    const studentsSummary = classStudents.map((s) => {
      const studentAtt = monthlyAttendance.filter((a) => a.studentId === s.id);
      
      const totalDays = studentAtt.length;
      const present = studentAtt.filter((a) => a.status === "present").length;
      const late = studentAtt.filter((a) => a.status === "late").length;
      const absent = studentAtt.filter((a) => a.status === "absent").length;
      const percentage = totalDays > 0 ? (present + late) / totalDays : 1.0;

      const daily = studentAtt.map((a) => ({
        date: a.date,
        status: a.status,
      }));

      return {
        name: s.name,
        totalDays,
        present,
        absent,
        late,
        percentage,
        daily,
      };
    });

    // Month display string e.g. "June 2026"
    const [year, month] = monthStr.split("-");
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthDisplayName = dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return {
      success: true,
      data: {
        className,
        month: monthDisplayName,
        students: studentsSummary,
        allDates,
      },
    };
  } catch (error: unknown) {
    console.error("getAttendanceReportAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch attendance report data";
    return { success: false, error: message };
  }
}
