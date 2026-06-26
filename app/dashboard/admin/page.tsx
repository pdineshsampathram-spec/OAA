import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  students,
  marks,
  attendance,
  oaaScores,
  redDots,
  skills,
  projects,
  moderationAlerts,
  users,
  peerMessages,
} from "@/lib/db/schema";
import { eq, desc, and, isNull, count, sql, avg } from "drizzle-orm";
import { getClassAnalytics, getSubjectAnalytics, getAttendanceTrend } from "@/lib/db/queries/analytics";
import { getTopPerformers } from "@/lib/db/queries/students";
import { getAtRiskStudents } from "@/lib/db/queries/predictions";
import { calculateClassPotential, getLeaderboard } from "@/lib/scoring/oaaEngine";
import DashboardHome from "@/components/dashboard/DashboardHome";
import type { ActivityItem } from "@/components/dashboard/RecentActivityFeed";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  // Students should not access admin portal
  if (session.user.role === "student") {
    redirect("/dashboard/student");
  }

  const { role, schoolId, name } = session.user;
  const activeSchoolId = schoolId || "school_1";

  let greeting = `Welcome back, ${name}`;
  if (role === "admin") {
    greeting = "Welcome, Administrator";
  } else if (role === "principal") {
    greeting = `Good Day, Principal ${name}`;
  } else if (role === "teacher") {
    greeting = `Welcome Back, ${name}`;
  }

  // Calculate first day of this month
  const firstDayOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();

  // Fetch unique sections for CP Index calculations
  const uniqueSections = await db
    .selectDistinct({ class: students.class, section: students.section })
    .from(students)
    .where(and(eq(students.schoolId, activeSchoolId), isNull(students.deletedAt)));

  const [
    analytics,
    subjectStats,
    attendanceTrends,
    topPerformers,
    atRiskStudents,
    recentMarks,
    recentAttendance,
    recentStudents,
    // --- OAA Platform Metrics ---
    avgOaaRes,
    redDotsThisMonthRes,
    studentsWithDots,
    studentsWithSkills,
    studentsWithProjects,
    leaderboardPreview,
    disciplineAlerts,
    unresolvedAlerts,
    cpResults,
  ] = await Promise.all([
    getClassAnalytics(activeSchoolId),
    getSubjectAnalytics(activeSchoolId),
    getAttendanceTrend(activeSchoolId, 7),
    getTopPerformers(activeSchoolId, 5),
    getAtRiskStudents(activeSchoolId, 5),
    db
      .select({
        id: marks.id,
        studentName: students.name,
        subject: marks.subject,
        marks: marks.marks,
        createdAt: marks.createdAt,
      })
      .from(marks)
      .innerJoin(students, eq(marks.studentId, students.id))
      .where(eq(students.schoolId, activeSchoolId))
      .orderBy(desc(marks.createdAt))
      .limit(3),
    db
      .select({
        id: attendance.id,
        studentName: students.name,
        status: attendance.status,
        date: attendance.date,
        createdAt: attendance.createdAt,
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(eq(students.schoolId, activeSchoolId))
      .orderBy(desc(attendance.createdAt))
      .limit(3),
    db
      .select({
        id: students.id,
        name: students.name,
        class: students.class,
        section: students.section,
        createdAt: students.createdAt,
      })
      .from(students)
      .where(eq(students.schoolId, activeSchoolId))
      .orderBy(desc(students.createdAt))
      .limit(3),
    // OAA metrics
    db
      .select({ avgOaa: avg(oaaScores.totalOaaScore) })
      .from(oaaScores)
      .innerJoin(students, eq(oaaScores.studentId, students.id))
      .where(and(eq(students.schoolId, activeSchoolId), isNull(students.deletedAt))),
    db
      .select({ count: count(redDots.id) })
      .from(redDots)
      .innerJoin(students, eq(redDots.studentId, students.id))
      .where(and(eq(students.schoolId, activeSchoolId), sql`${redDots.createdAt} >= ${firstDayOfMonth}`)),
    db
      .select({ studentId: redDots.studentId, count: count(redDots.id) })
      .from(redDots)
      .innerJoin(students, eq(redDots.studentId, students.id))
      .where(eq(students.schoolId, activeSchoolId))
      .groupBy(redDots.studentId),
    db
      .selectDistinct({ studentId: skills.studentId })
      .from(skills)
      .innerJoin(students, eq(skills.studentId, students.id))
      .where(eq(students.schoolId, activeSchoolId)),
    db
      .selectDistinct({ studentId: projects.studentId })
      .from(projects)
      .innerJoin(students, eq(projects.studentId, students.id))
      .where(eq(students.schoolId, activeSchoolId)),
    getLeaderboard({ limit: 5, schoolId: activeSchoolId }),
    db
      .select({
        id: redDots.id,
        studentName: students.name,
        dotCount: redDots.dotCount,
        reason: redDots.reason,
        createdAt: redDots.createdAt,
        issuerName: users.name,
      })
      .from(redDots)
      .innerJoin(students, eq(redDots.studentId, students.id))
      .innerJoin(users, eq(redDots.issuedBy, users.id))
      .where(eq(students.schoolId, activeSchoolId))
      .orderBy(desc(redDots.createdAt))
      .limit(5),
    db
      .select({
        alertId: moderationAlerts.id,
        messageId: moderationAlerts.messageId,
        content: peerMessages.content,
        senderName: students.name,
        reason: moderationAlerts.reason,
        createdAt: moderationAlerts.createdAt,
      })
      .from(moderationAlerts)
      .innerJoin(peerMessages, eq(moderationAlerts.messageId, peerMessages.id))
      .innerJoin(students, eq(peerMessages.senderId, students.id))
      .where(isNull(moderationAlerts.resolvedAt))
      .orderBy(desc(moderationAlerts.createdAt)),
    // Calculate CP for all unique sections in parallel
    Promise.all(
      uniqueSections.map((s) => calculateClassPotential(s.class, s.section, activeSchoolId))
    ),
  ]);

  // Calculations
  const institutionAvgOaa = Number(avgOaaRes[0]?.avgOaa) || 0;
  const redDotsThisMonth = Number(redDotsThisMonthRes[0]?.count) || 0;
  const lockedStudentsCount = studentsWithDots.filter((s) => s.count >= 5).length;

  const activeOaaStudentIds = new Set([
    ...studentsWithSkills.map((s) => s.studentId),
    ...studentsWithProjects.map((p) => p.studentId),
  ]);
  const studentsWithOaaActivityCount = activeOaaStudentIds.size;

  const cpAverage = cpResults.length > 0
    ? cpResults.reduce((acc, curr) => acc + curr.cp, 0) / cpResults.length
    : 0;

  const activities: ActivityItem[] = [];

  recentMarks.forEach((m) => {
    activities.push({
      id: m.id,
      type: "mark",
      text: `Recorded score of ${m.marks}% in ${m.subject} for ${m.studentName}`,
      timestamp: m.createdAt,
    });
  });

  recentAttendance.forEach((a) => {
    activities.push({
      id: a.id,
      type: "attendance",
      text: `Marked ${a.studentName} as ${a.status} for date ${a.date}`,
      timestamp: a.createdAt,
    });
  });

  recentStudents.forEach((s) => {
    activities.push({
      id: s.id,
      type: "student",
      text: `Enrolled new student ${s.name} in Class ${s.class}-${s.section}`,
      timestamp: s.createdAt,
    });
  });

  const sortedActivities = activities
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 6);

  return (
    <DashboardHome
      greeting={greeting}
      analytics={analytics}
      subjectStats={subjectStats}
      attendanceTrends={attendanceTrends}
      topPerformers={topPerformers}
      atRiskStudents={atRiskStudents}
      recentActivities={sortedActivities}
      // OAA Metrics props
      oaaMetrics={{
        institutionAvgOaa,
        cpAverage,
        redDotsThisMonth,
        lockedStudentsCount,
        studentsWithOaaActivityCount,
        leaderboardPreview,
        disciplineAlerts: disciplineAlerts.map((alert) => ({
          ...alert,
          issuerName: alert.issuerName || "Unknown",
        })),
        moderationAlerts: {
          count: unresolvedAlerts.length,
          lastThree: unresolvedAlerts.slice(0, 3),
        },
        cpResults,
      }}
    />
  );
}
