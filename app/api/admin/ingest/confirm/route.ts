import { NextResponse } from "next/server";
import { getServerSession, ApiError, requireRole } from "@/lib/api/auth-helper";
import { db } from "@/lib/db";
import { students, users, marks, skills, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import bcrypt from "bcryptjs";
import { calculateOAAScore, recalculateAllRanks } from "@/lib/scoring/oaaEngine";

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

    for (const record of records) {
      if (!record.name) continue;

      const baseEmail = record.email || `${record.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@demo.com`;
      
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, baseEmail))
        .limit(1);

      let studentId: string;
      let userId: string;

      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        studentId = existingUser[0].studentId || `student_${generateId()}`;
        
        // Update user
        await db
          .update(users)
          .set({ name: record.name, studentId })
          .where(eq(users.id, userId));
          
        // Update student
        await db
          .update(students)
          .set({
            name: record.name,
            class: record.class || "10",
            section: record.section || "A",
            gender: record.gender || "Other",
          })
          .where(eq(students.id, studentId));
      } else {
        userId = generateId();
        studentId = record.studentId || `student_${generateId()}`;
        const dummyHash = bcrypt.hashSync("google-auth-placeholder-" + Math.random(), 10);

        // 1. Create student
        await db.insert(students).values({
          id: studentId,
          name: record.name,
          class: record.class || "10",
          section: record.section || "A",
          gender: record.gender || "Other",
          schoolId,
        });

        // 2. Create user
        await db.insert(users).values({
          id: userId,
          name: record.name,
          email: baseEmail,
          passwordHash: dummyHash,
          role: "student",
          schoolId,
          studentId,
        });
      }

      // Clear existing marks to avoid duplication
      await db.delete(marks).where(eq(marks.studentId, studentId));

      // 3. Insert academic marks
      if (Array.isArray(record.marks)) {
        for (const m of record.marks) {
          if (!m.subject || m.marks === undefined) continue;
          await db.insert(marks).values({
            id: `mark_${generateId()}`,
            studentId,
            subject: m.subject,
            examType: "final",
            marks: Number(m.marks),
            maxMarks: Number(m.maxMarks || 100.0),
            recordedBy: session.user.id,
          });
        }
      } else if (Array.isArray(record.academicMarks)) {
        // PDF transcript returns keys as academicMarks
        for (const m of record.academicMarks) {
          if (!m.subject || m.marks === undefined) continue;
          await db.insert(marks).values({
            id: `mark_${generateId()}`,
            studentId,
            subject: m.subject,
            examType: "final",
            marks: Number(m.marks),
            maxMarks: Number(m.max_marks || 100.0),
            recordedBy: session.user.id,
          });
        }
      }

      // 4. Insert skills
      const targetSkills = record.skills || [];
      if (Array.isArray(targetSkills)) {
        await db.delete(skills).where(eq(skills.studentId, studentId));
        for (const s of targetSkills) {
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

      // 5. Insert projects
      const targetProjects = record.projects || [];
      if (Array.isArray(targetProjects)) {
        await db.delete(projects).where(eq(projects.studentId, studentId));
        for (const p of targetProjects) {
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

      // 6. Recalculate OAA score for student
      await calculateOAAScore(studentId);
      importedCount++;
    }

    // 7. Recalculate ranks across the whole school
    await recalculateAllRanks(schoolId);

    return NextResponse.json({ success: true, count: importedCount, error: null });
  } catch (error: unknown) {
    console.error("Ingestion confirm API error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}
