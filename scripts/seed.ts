import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";

loadEnvConfig(process.cwd());

async function main() {
  const { db } = await import("../lib/db");
  const {
    schools,
    users,
    students,
    marks,
    attendance,
    aiPredictions,
    oaaScores,
    skills,
    projects,
    redDots,
    peerMessages,
    chatRooms,
    moderationAlerts,
  } = await import("../lib/db/schema");
  const { calculateOAAScore, recalculateAllRanks } = await import("../lib/scoring/oaaEngine");

  console.log("Starting database seeding (including OAA Platform tables)...");

  // Pre-generate hashes
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const teacherPasswordHash = await bcrypt.hash("teacher123", 10);
  const principalPasswordHash = await bcrypt.hash("principal123", 10);
  const studentPasswordHash = await bcrypt.hash("student123", 10);

  // Entities counts
  let schoolsCreatedCount = 0;
  let usersCreatedCount = 0;
  let studentsCreatedCount = 0;
  let marksCreatedCount = 0;
  let attendanceCreatedCount = 0;
  let predictionsCreatedCount = 0;
  let skillsCreatedCount = 0;
  let projectsCreatedCount = 0;
  let redDotsCreatedCount = 0;
  let chatRoomsCreatedCount = 0;
  let peerMessagesCreatedCount = 0;
  let alertsCreatedCount = 0;

  try {
    // Clear existing data safely
    console.log("Cleaning up existing records...");
    await db.delete(moderationAlerts);
    await db.delete(peerMessages);
    await db.delete(chatRooms);
    await db.delete(redDots);
    await db.delete(projects);
    await db.delete(skills);
    await db.delete(oaaScores);
    await db.delete(aiPredictions);
    await db.delete(attendance);
    await db.delete(marks);
    await db.delete(students);
    await db.delete(users);
    await db.delete(schools);
    console.log("✓ Database cleaned");

    // 1. Create School
    await db.insert(schools).values({
      id: "school_1",
      name: "Demo High School",
    });
    schoolsCreatedCount++;
    console.log("✓ Created school");

    // 2. Create Users
    const usersData = [
      {
        id: "user_admin",
        name: "Admin User",
        email: "admin@demo.com",
        passwordHash: adminPasswordHash,
        role: "admin" as const,
        schoolId: "school_1",
      },
      {
        id: "user_teacher",
        name: "Mr. Ravi Kumar",
        email: "teacher@demo.com",
        passwordHash: teacherPasswordHash,
        role: "teacher" as const,
        schoolId: "school_1",
      },
      {
        id: "user_principal",
        name: "Mrs. Priya Sharma",
        email: "principal@demo.com",
        passwordHash: principalPasswordHash,
        role: "principal" as const,
        schoolId: "school_1",
      },
      // Student logins
      {
        id: "user_student_1",
        name: "Alice Smith",
        email: "student@demo.com",
        passwordHash: studentPasswordHash,
        role: "student" as const,
        schoolId: "school_1",
        studentId: "student_1",
      },
      {
        id: "user_student_3",
        name: "Charlie Brown",
        email: "charlie@demo.com",
        passwordHash: studentPasswordHash,
        role: "student" as const,
        schoolId: "school_1",
        studentId: "student_3",
      },
    ];

    await db.insert(users).values(usersData);
    usersCreatedCount += usersData.length;
    console.log("✓ Created 5 users (3 faculty + 2 students)");

    // 3. Create Students
    const studentsData = [
      // Section A
      { id: "student_1", name: "Alice Smith", class: "10", section: "A", gender: "Female", schoolId: "school_1" },
      { id: "student_2", name: "Bob Johnson", class: "10", section: "A", gender: "Male", schoolId: "school_1" },
      { id: "student_3", name: "Charlie Brown", class: "10", section: "A", gender: "Male", schoolId: "school_1" },
      { id: "student_4", name: "Diana Prince", class: "10", section: "A", gender: "Female", schoolId: "school_1" },
      { id: "student_5", name: "Evan Wright", class: "10", section: "A", gender: "Male", schoolId: "school_1" },
      // Section B
      { id: "student_6", name: "Fiona Gallagher", class: "10", section: "B", gender: "Female", schoolId: "school_1" },
      { id: "student_7", name: "George Costanza", class: "10", section: "B", gender: "Male", schoolId: "school_1" },
      { id: "student_8", name: "Hannah Baker", class: "10", section: "B", gender: "Female", schoolId: "school_1" },
      { id: "student_9", name: "Ian Malcolm", class: "10", section: "B", gender: "Male", schoolId: "school_1" },
      { id: "student_10", name: "Julia Roberts", class: "10", section: "B", gender: "Female", schoolId: "school_1" },
    ];

    await db.insert(students).values(studentsData);
    studentsCreatedCount += studentsData.length;
    console.log("✓ Created 10 students");

    // 4. Create Marks
    const subjects = ["Math", "Science", "English", "Telugu", "Computer"];
    const examTypes = ["unit_test", "midterm", "final"] as const;
    const marksData: typeof marks.$inferInsert[] = [];

    const getMarksForTier = (studentId: string, subject: string): number => {
      if (studentId === "student_4" || studentId === "student_10") {
        return Math.floor(Math.random() * 15) + 85;
      }
      if (studentId === "student_3" || studentId === "student_7") {
        if (subject === "Math" || subject === "Science") {
          return Math.floor(Math.random() * 15) + 20;
        }
        return Math.floor(Math.random() * 20) + 30;
      }
      return Math.floor(Math.random() * 30) + 55;
    };

    let markIdCounter = 1;
    for (const student of studentsData) {
      for (const subject of subjects) {
        for (const exam of examTypes) {
          const score = getMarksForTier(student.id, subject);
          marksData.push({
            id: `mark_${markIdCounter++}`,
            studentId: student.id,
            subject,
            examType: exam,
            marks: score,
            maxMarks: 100,
            recordedBy: "user_teacher",
          });
        }
      }
    }

    await db.insert(marks).values(marksData);
    marksCreatedCount += marksData.length;
    console.log(`✓ Created ${marksData.length} marks records`);

    // 5. Create Attendance
    const attendanceData: typeof attendance.$inferInsert[] = [];
    const dates: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    let attIdCounter = 1;
    for (const student of studentsData) {
      const isAtRisk = student.id === "student_3" || student.id === "student_7";

      for (const date of dates) {
        let status: "present" | "absent" | "late" = "present";

        if (isAtRisk) {
          const rand = Math.random();
          if (rand < 0.35) {
            status = "absent";
          } else if (rand < 0.5) {
            status = "late";
          }
        } else {
          const rand = Math.random();
          if (rand < 0.03) {
            status = "absent";
          } else if (rand < 0.08) {
            status = "late";
          }
        }

        attendanceData.push({
          id: `att_${attIdCounter++}`,
          studentId: student.id,
          date,
          status,
          recordedBy: "user_teacher",
        });
      }
    }

    await db.insert(attendance).values(attendanceData);
    attendanceCreatedCount += attendanceData.length;
    console.log(`✓ Created ${attendanceData.length} attendance records`);

    // 6. Create AI Predictions
    const predictionsData: typeof aiPredictions.$inferInsert[] = [];
    let predIdCounter = 1;

    for (const student of studentsData) {
      const studentMarks = marksData.filter((m) => m.studentId === student.id);
      const totalMarksSum = studentMarks.reduce((sum, m) => sum + m.marks, 0);
      const avgMark = studentMarks.length > 0 ? totalMarksSum / studentMarks.length : 0;

      const studentAttendance = attendanceData.filter((a) => a.studentId === student.id);
      const presentOrLate = studentAttendance.filter((a) => a.status === "present" || a.status === "late").length;
      const attendanceRate = studentAttendance.length > 0 ? presentOrLate / studentAttendance.length : 0;

      const riskFlag = (avgMark < 50 || attendanceRate < 0.75) ? 1 : 0;
      const score = Math.max(0, Math.min(1, 1 - (0.6 * (avgMark / 100) + 0.4 * attendanceRate)));

      const suggestionsList = riskFlag === 1
        ? [
            "Schedule one-on-one remedial sessions in weak subjects.",
            "Contact parents to discuss academic progress and check-ins.",
            "Monitor daily classroom attendance and verify reasons for absences.",
          ]
        : [
            "Encourage participation in school mentoring or advanced clubs.",
            "Maintain current outstanding academic performance and study habits.",
          ];

      predictionsData.push({
        id: `pred_${predIdCounter++}`,
        studentId: student.id,
        riskFlag,
        score: Number(score.toFixed(4)), // Normalized 0-1 scale
        suggestions: JSON.stringify(suggestionsList),
      });
    }

    await db.insert(aiPredictions).values(predictionsData);
    predictionsCreatedCount += predictionsData.length;
    console.log("✓ Created AI predictions");

    // ─── OAA PLATFORM DATA SEEDING ───

    // 7. Seed Skills
    const skillOptions = ["Python", "React", "Java", "SQL", "Machine Learning", "UI/UX Design", "Node.js", "Data Analysis"];
    const proficiencies = ["beginner", "intermediate", "advanced"] as const;
    const skillsData: typeof skills.$inferInsert[] = [];
    let skillIdCounter = 1;

    for (const student of studentsData) {
      const isTop = student.id === "student_4" || student.id === "student_10";
      const countToGenerate = Math.floor(Math.random() * 4) + 2; // 2 to 5 skills

      const shuffled = [...skillOptions].sort(() => 0.5 - Math.random());
      for (let i = 0; i < countToGenerate; i++) {
        skillsData.push({
          id: `skill_${skillIdCounter++}`,
          studentId: student.id,
          skillName: shuffled[i],
          proficiencyLevel: isTop ? "advanced" : proficiencies[Math.floor(Math.random() * proficiencies.length)],
          verified: isTop ? 1 : 0,
        });
      }
    }

    await db.insert(skills).values(skillsData);
    skillsCreatedCount += skillsData.length;
    console.log(`✓ Seeded ${skillsData.length} skills`);

    // 8. Seed Projects
    const projectOptions = [
      { title: "E-Commerce Platform", desc: "Full-stack web application with cart and stripe integration." },
      { title: "Student Attendance Tracker", desc: "Mobile app using QR codes to check student attendance." },
      { title: "ML Image Classifier", desc: "Convolutional neural network to identify plant species." },
      { title: "Portfolio Website", desc: "Responsive personal website showcasing work and hobbies." },
    ];
    const projectsData: typeof projects.$inferInsert[] = [];
    let projIdCounter = 1;

    for (const student of studentsData) {
      const isTop = student.id === "student_4" || student.id === "student_10";
      const isAtRisk = student.id === "student_3" || student.id === "student_7";

      const countToGenerate = Math.floor(Math.random() * 3) + 1; // 1 to 3 projects
      const shuffled = [...projectOptions].sort(() => 0.5 - Math.random());

      for (let i = 0; i < countToGenerate; i++) {
        let scoreVal = 12;
        if (isTop) scoreVal = Math.floor(Math.random() * 5) + 16; // 16-20
        else if (isAtRisk) scoreVal = Math.floor(Math.random() * 6) + 3; // 3-8
        else scoreVal = Math.floor(Math.random() * 7) + 8; // 8-14

        projectsData.push({
          id: `proj_${projIdCounter++}`,
          studentId: student.id,
          title: shuffled[i].title,
          description: shuffled[i].desc,
          techStack: "React, Node.js, SQLite",
          repoUrl: "https://github.com/demo/project",
          score: scoreVal,
        });
      }
    }

    await db.insert(projects).values(projectsData);
    projectsCreatedCount += projectsData.length;
    console.log(`✓ Seeded ${projectsData.length} projects`);

    // 9. Seed Red Dots (Disciplinary Flags)
    // 5 students with 1 dot (warning, flag_only)
    // 3 students with 2-3 dots (hearing, read_only)
    // 2 students with 5 dots (suspension_review, locked)
    const warningReasons = [
      "Submitted plagiarised assignment",
      "Repeated disruption during online session",
      "Shared exam content in chat room",
      "Inappropriate language used in discussion",
      "Persistent late submission of labs",
    ];

    const redDotsData: typeof redDots.$inferInsert[] = [];
    let redDotIdCounter = 1;

    const issueDots = async (studentId: string, countToIssue: number) => {
      for (let i = 1; i <= countToIssue; i++) {
        let action: "warning" | "hearing" | "suspension_review" = "warning";
        let restriction: "none" | "flag_only" | "read_only" | "locked" = "flag_only";

        if (i >= 5) {
          action = "suspension_review";
          restriction = "locked";
        } else if (i >= 3) {
          action = "hearing";
          restriction = "read_only";
        }

        redDotsData.push({
          id: `dot_${redDotIdCounter++}`,
          studentId,
          issuedBy: "user_teacher",
          reason: warningReasons[Math.floor(Math.random() * warningReasons.length)],
          dotCount: i,
          actionTaken: action,
          portalRestriction: restriction,
          createdAt: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    };

    // 5 students with 1 dot
    await issueDots("student_1", 1);
    await issueDots("student_5", 1);
    await issueDots("student_6", 1);
    await issueDots("student_8", 1);
    await issueDots("student_10", 1);

    // 3 students with 2-3 dots
    await issueDots("student_3", 2);
    await issueDots("student_7", 3);
    await issueDots("student_4", 2);

    // 2 students with 5 dots (locked)
    await issueDots("student_2", 5);
    await issueDots("student_9", 5);

    await db.insert(redDots).values(redDotsData);
    redDotsCreatedCount += redDotsData.length;
    console.log(`✓ Seeded ${redDotsData.length} red dots (including 2 locked accounts)`);

    // 10. Seed OAA Scores (calculate OAA score + ranks for each student)
    console.log("Calculating OAA scores and ranks...");
    for (const student of studentsData) {
      await calculateOAAScore(student.id);
    }
    await recalculateAllRanks("school_1");
    console.log("✓ OAA scores and percentile ranks calculated");

    // 11. Seed Chat Rooms
    const roomsData = [
      {
        id: "room_cse_general",
        name: "CSE General Discussion",
        type: "department" as const,
        createdBy: "user_admin",
        memberIds: JSON.stringify(studentsData.map((s) => s.id)),
      },
      {
        id: "room_team_alpha",
        name: "Team Alpha Projects",
        type: "team" as const,
        createdBy: "user_student_1",
        memberIds: JSON.stringify(["student_1", "student_4", "student_5"]),
      },
      {
        id: "room_class_10a",
        name: "Class 10-A Lounge",
        type: "section" as const,
        createdBy: "user_teacher",
        memberIds: JSON.stringify(studentsData.filter((s) => s.section === "A").map((s) => s.id)),
      },
    ];

    await db.insert(chatRooms).values(roomsData);
    chatRoomsCreatedCount += roomsData.length;
    console.log("✓ Seeded 3 chat rooms");

    // 12. Seed Peer Messages + Moderation Alerts
    const messagesData: typeof peerMessages.$inferInsert[] = [];
    const alertsData: typeof moderationAlerts.$inferInsert[] = [];
    let msgIdCounter = 1;
    let alertIdCounter = 1;

    // Room cse_general: 10 clean messages
    const generalMessages = [
      "Hi everyone, welcome to the OAA platform!",
      "Does anyone have the syllabus for next week's math test?",
      "Yeah, it covers trigonometry and geometry.",
      "Thanks, I need to start preparing soon.",
      "Computer Science lab is rescheduled to Wednesday.",
      "Great, that gives us more time to finish the project.",
      "Which tool are you guys using for database diagramming?",
      "Draw.io or dbdiagram.io are both excellent choices.",
      "Awesome, I'll check them out today.",
      "Good luck with the assignments, folks!",
    ];

    generalMessages.forEach((content, idx) => {
      const senderIdx = idx % studentsData.length;
      messagesData.push({
        id: `msg_${msgIdCounter++}`,
        senderId: studentsData[senderIdx].id,
        roomId: "room_cse_general",
        content,
        flagged: 0,
        flagReason: null,
        moderationStatus: "clean",
        sentAt: new Date(Date.now() - (10 - idx) * 3600 * 1000).toISOString(),
      });
    });

    // Room team_alpha: 7 clean messages
    const teamMessages = [
      "Hey team, let's coordinate our project roles.",
      "I can handle the database design and ORM setup.",
      "Awesome, I will work on the Next.js frontend panels.",
      "I can help with CSS and Framer Motion animations.",
      "Let's meet tomorrow after classes to review.",
      "Sounds good, see you in the library.",
      "Don't forget to push your code branches!",
    ];

    const teamMembers = ["student_1", "student_4", "student_5"];
    teamMessages.forEach((content, idx) => {
      const senderId = teamMembers[idx % teamMembers.length];
      messagesData.push({
        id: `msg_${msgIdCounter++}`,
        senderId,
        roomId: "room_team_alpha",
        content,
        flagged: 0,
        flagReason: null,
        moderationStatus: "clean",
        sentAt: new Date(Date.now() - (7 - idx) * 30 * 60 * 1000).toISOString(),
      });
    });

    // Room cse_general: 3 flagged messages (fake exam leakage/cheating triggers)
    const flaggedContent = [
      {
        content: "Hey, someone please send the math exam answer key before tomorrow morning!",
        reason: "Exam content detected: \"math exam answer key\"",
      },
      {
        content: "Here is the leaked question paper for Science midterm. Keep it secret!",
        reason: "Exam content detected: \"leaked question paper\"",
      },
      {
        content: "If you pay me 500 rupees I can send solutions for the computer lab exam.",
        reason: "Exam content detected: \"send solutions\"",
      },
    ];

    flaggedContent.forEach((item, idx) => {
      const msgId = `msg_flagged_${msgIdCounter++}`;
      messagesData.push({
        id: msgId,
        senderId: "student_3", // Charlie Brown (at-risk)
        roomId: "room_cse_general",
        content: item.content,
        flagged: 1,
        flagReason: item.reason,
        moderationStatus: "flagged",
        sentAt: new Date(Date.now() - (3 - idx) * 10 * 60 * 1000).toISOString(),
      });

      alertsData.push({
        id: `alert_${alertIdCounter++}`,
        messageId: msgId,
        roomId: "room_cse_general",
        reason: item.reason,
        createdAt: new Date().toISOString(),
      });
    });

    await db.insert(peerMessages).values(messagesData);
    peerMessagesCreatedCount += messagesData.length;

    await db.insert(moderationAlerts).values(alertsData);
    alertsCreatedCount += alertsData.length;

    console.log(`✓ Seeded ${messagesData.length} messages (${alertsData.length} flagged/alerts)`);

    console.log("\n🚀 All OAA Platform entities seeded successfully!\n");

    // Summary console log as requested
    console.log(
      `✅ Seeded: ${studentsCreatedCount} students | ${skillsCreatedCount} skills | ${projectsCreatedCount} projects | 10 OAA scores | ${redDotsCreatedCount} red dots | ${peerMessagesCreatedCount} messages`
    );

  } catch (error) {
    console.error("❌ Error occurred during seeding. Performing rollback...");
    console.error(error);

    try {
      console.log("Cleaning up seeded records...");
      await db.delete(moderationAlerts);
      await db.delete(peerMessages);
      await db.delete(chatRooms);
      await db.delete(redDots);
      await db.delete(projects);
      await db.delete(skills);
      await db.delete(oaaScores);
      await db.delete(aiPredictions);
      await db.delete(attendance);
      await db.delete(marks);
      await db.delete(students);
      await db.delete(users);
      await db.delete(schools);
      console.log("✓ Cleanup finished.");
    } catch (cleanupError) {
      console.error("❌ Failed to clean up database after seeding error:", cleanupError);
    }

    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error in seeding script:", err);
  process.exit(1);
});
