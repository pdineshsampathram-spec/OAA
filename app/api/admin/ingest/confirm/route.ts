import { NextResponse } from "next/server";
import { getServerSession, ApiError, requireRole } from "@/lib/api/auth-helper";
import { db } from "@/lib/db";
import { students, users, marks, skills, projects } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import bcrypt from "bcryptjs";
import { calculateOAAScore, recalculateAllRanks } from "@/lib/scoring/oaaEngine";
import { generateStudentInsights } from "@/lib/ai/generateInsights";
import { normalizeSubjectName } from "@/lib/ingest/pdfParser";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    requireRole(session, ["teacher", "admin", "principal"]);

    const body = await request.json().catch(() => ({}));
    const records = body.records;

    if (!Array.isArray(records)) {
      return NextResponse.json(
        { error: "Invalid request payload. Expected 'records' list.", status: 400 },
        { status: 400 }
      );
    }

    const schoolId = session.user.schoolId || "school_1";
    let importedCount = 0;
    let newStudentsCount = 0;
    let existingStudentsCount = 0;
    let marksUpdatedCount = 0;
    let marksInsertedCount = 0;
    const allProcessedSubjects = new Set<string>();

    // Pre-fetch all active students in this school for fast in-memory matching
    const existingSchoolStudents = await db
      .select({
        id: students.id,
        name: students.name,
        class: students.class,
        section: students.section,
      })
      .from(students)
      .where(and(eq(students.schoolId, schoolId), isNull(students.deletedAt)));

    const processedStudentIds: string[] = [];

    for (const record of records) {
      if (!record.name && !record.studentId) continue;

      const rawName = (record.name || `Student ${record.studentId}`).trim();
      const cleanName = rawName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const baseEmail =
        record.email?.trim() || `${cleanName || "student" + generateId()}@demo.com`;

      // 1. INTELLIGENT STUDENT MATCHING
      // Check 1: Match by studentId / Roll number
      let matchedStudent = record.studentId
        ? existingSchoolStudents.find(
            (s) => s.id.toLowerCase() === String(record.studentId).toLowerCase().trim()
          )
        : undefined;

      // Check 2: Match by exact or normalized Name in school
      if (!matchedStudent) {
        matchedStudent = existingSchoolStudents.find(
          (s) => s.name.trim().toLowerCase() === rawName.toLowerCase()
        );
      }

      // Check 3: Match by user email in users table
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, baseEmail))
        .limit(1);

      let studentId: string;
      let userId: string;

      if (matchedStudent) {
        // MATCHED EXISTING STUDENT
        studentId = matchedStudent.id;
        existingStudentsCount++;

        // Update class/section if specified
        if (record.class || record.section) {
          await db
            .update(students)
            .set({
              class: record.class || matchedStudent.class,
              section: record.section || matchedStudent.section,
            })
            .where(eq(students.id, studentId));
        }

        // Link with user record if exists or create one
        if (existingUser.length > 0) {
          userId = existingUser[0].id;
        } else {
          userId = generateId();
          const dummyHash = bcrypt.hashSync("google-auth-placeholder-" + Math.random(), 10);
          await db.insert(users).values({
            id: userId,
            name: rawName,
            email: baseEmail,
            passwordHash: dummyHash,
            role: "student",
            schoolId,
            studentId,
          });
        }
      } else if (existingUser.length > 0) {
        // User exists by email
        userId = existingUser[0].id;
        studentId = existingUser[0].studentId || `student_${generateId()}`;
        existingStudentsCount++;

        await db
          .update(students)
          .set({
            name: rawName,
            class: record.class || "10",
            section: record.section || "A",
            gender: record.gender || "Other",
          })
          .where(eq(students.id, studentId));
      } else {
        // COMPLETELY NEW REAL STUDENT (e.g. real students from uploaded PDF)
        newStudentsCount++;
        userId = generateId();
        studentId = record.studentId
          ? String(record.studentId).trim()
          : `student_${generateId()}`;

        const dummyHash = bcrypt.hashSync("google-auth-placeholder-" + Math.random(), 10);

        // Insert student
        await db.insert(students).values({
          id: studentId,
          name: rawName,
          class: record.class || "10",
          section: record.section || "A",
          gender: record.gender || "Other",
          schoolId,
        });

        // Insert user
        await db.insert(users).values({
          id: userId,
          name: rawName,
          email: baseEmail,
          passwordHash: dummyHash,
          role: "student",
          schoolId,
          studentId,
        });

        // Add to in-memory list for subsequent records in the same batch
        existingSchoolStudents.push({
          id: studentId,
          name: rawName,
          class: record.class || "10",
          section: record.section || "A",
        });
      }

      processedStudentIds.push(studentId);

      // 2. INTELLIGENT SUBJECT IDENTIFICATION & MARKS UPDATE VS INSERT
      // Fetch this student's currently entered marks to detect if subject already exists
      const currentMarks = await db
        .select()
        .from(marks)
        .where(eq(marks.studentId, studentId));

      const incomingMarks = Array.isArray(record.marks)
        ? record.marks
        : Array.isArray(record.academicMarks)
        ? record.academicMarks
        : [];

      for (const m of incomingMarks) {
        if (!m.subject || m.marks === undefined || m.marks === null) continue;

        const normalizedSubject = normalizeSubjectName(String(m.subject));
        allProcessedSubjects.add(normalizedSubject);

        const score = Number(m.marks);
        const maxMarks = Number(m.maxMarks || m.max_marks || 100.0);
        const examType = m.examType || "midterm";

        // Check if subject data was already entered for this student
        const existingMark = currentMarks.find(
          (cm) => cm.subject.trim().toLowerCase() === normalizedSubject.toLowerCase()
        );

        if (existingMark) {
          // Subject was ALREADY ENTERED: UPDATE with real-time internal data
          await db
            .update(marks)
            .set({
              marks: score,
              maxMarks,
              examType,
              recordedBy: session.user.id,
              createdAt: new Date().toISOString(),
            })
            .where(eq(marks.id, existingMark.id));
          marksUpdatedCount++;
        } else {
          // NEW SUBJECT: INSERT real-time data
          await db.insert(marks).values({
            id: `mark_${generateId()}`,
            studentId,
            subject: normalizedSubject,
            examType,
            marks: score,
            maxMarks,
            recordedBy: session.user.id,
          });
          marksInsertedCount++;
        }
      }

      // 3. SKILLS & PROJECTS (if present in transcript)
      if (Array.isArray(record.skills) && record.skills.length > 0) {
        await db.delete(skills).where(eq(skills.studentId, studentId));
        for (const s of record.skills) {
          if (!s.skillName) continue;
          await db.insert(skills).values({
            id: `skill_${generateId()}`,
            studentId,
            skillName: s.skillName,
            proficiencyLevel: s.proficiencyLevel || "beginner",
            verified: 1,
          });
        }
      }

      if (Array.isArray(record.projects) && record.projects.length > 0) {
        await db.delete(projects).where(eq(projects.studentId, studentId));
        for (const p of record.projects) {
          if (!p.title) continue;
          await db.insert(projects).values({
            id: `proj_${generateId()}`,
            studentId,
            title: p.title,
            description: p.description || "Ingested project",
            techStack: p.techStack || "",
            repoUrl: p.repoUrl || "",
            score: Number(p.score || 10.0),
          });
        }
      }

      // 4. RECALCULATE OAA SCORE FOR STUDENT
      await calculateOAAScore(studentId);

      // 5. AUTOMATICALLY GENERATE & UPDATE AI INSIGHTS
      try {
        await generateStudentInsights(studentId);
      } catch (aiErr) {
        console.warn(`Failed to generate AI insights for ${studentId}:`, aiErr);
      }

      importedCount++;
    }

    // 6. RECALCULATE ALL RANKS ACROSS THE WHOLE SCHOOL / DEPARTMENT
    await recalculateAllRanks(schoolId);

    return NextResponse.json({
      success: true,
      count: importedCount,
      newStudentsCount,
      existingStudentsCount,
      marksUpdatedCount,
      marksInsertedCount,
      subjectsIdentified: Array.from(allProcessedSubjects),
      error: null,
    });
  } catch (error: unknown) {
    console.error("Ingestion confirm API error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}

