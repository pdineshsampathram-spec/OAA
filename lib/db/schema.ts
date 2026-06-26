import { sqliteTable, text, integer, real, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// 1. schools table
export const schools = sqliteTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;

// 2. users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<"admin" | "teacher" | "principal" | "student">().notNull(),
  schoolId: text("school_id").references(() => schools.id),
  studentId: text("student_id"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// 3. students table
export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  class: text("class").notNull(),
  section: text("section").notNull(),
  gender: text("gender").notNull(),
  schoolId: text("school_id").references(() => schools.id),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  deletedAt: text("deleted_at"),
});

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

// 4. marks table
export const marks = sqliteTable("marks", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  examType: text("exam_type").$type<"unit_test" | "midterm" | "final" | "assignment">().notNull(),
  marks: real("marks").notNull(),
  maxMarks: real("max_marks").default(100).notNull(),
  recordedBy: text("recorded_by").references(() => users.id),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Mark = typeof marks.$inferSelect;
export type NewMark = typeof marks.$inferInsert;

// 5. attendance table
export const attendance = sqliteTable("attendance", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // Format YYYY-MM-DD
  status: text("status").$type<"present" | "absent" | "late">().notNull(),
  recordedBy: text("recorded_by").references(() => users.id),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  studentDateUnique: unique().on(table.studentId, table.date),
}));

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

// 6. aiPredictions table
export const aiPredictions = sqliteTable("ai_predictions", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  riskFlag: integer("risk_flag").$type<0 | 1>().notNull(), // 0: low risk, 1: high risk
  score: real("score").notNull(),
  suggestions: text("suggestions").notNull(), // Stored as JSON string
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type AiPrediction = typeof aiPredictions.$inferSelect;
export type NewAiPrediction = typeof aiPredictions.$inferInsert;

// 7. sessions table (for Auth.js)
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: text("expires_at").notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// ============================================================================
// OAA PLATFORM TABLES
// ============================================================================

// 8. oaa_scores table — Composite OAA score for each student (4 pillars)
export const oaaScores = sqliteTable("oaa_scores", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  academicScore: real("academic_score").default(0).notNull(), // 0–40 (weighted 40%)
  skillsScore: real("skills_score").default(0).notNull(), // 0–30 (weighted 30%)
  projectScore: real("project_score").default(0).notNull(), // 0–20 (weighted 20%)
  behaviorScore: real("behavior_score").default(10).notNull(), // 0–10 (weighted 10%, starts at 10)
  totalOaaScore: real("total_oaa_score").default(0).notNull(), // Sum of all four pillars
  percentileRank: real("percentile_rank").default(0).notNull(), // Percentile within department
  classPotentialContribution: real("class_potential_contribution").default(0).notNull(), // student marks / Mmax
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type OaaScore = typeof oaaScores.$inferSelect;
export type NewOaaScore = typeof oaaScores.$inferInsert;

// 9. red_dots table — Discipline system: tracks behavioral infractions
export const redDots = sqliteTable("red_dots", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  issuedBy: text("issued_by")
    .notNull()
    .references(() => users.id), // Must be faculty or principal
  reason: text("reason").notNull(),
  dotCount: integer("dot_count").notNull(), // Cumulative count at time of issuance
  actionTaken: text("action_taken")
    .$type<"warning" | "hearing" | "suspension_review">()
    .notNull(),
  portalRestriction: text("portal_restriction")
    .$type<"none" | "flag_only" | "read_only" | "locked">()
    .notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type RedDot = typeof redDots.$inferSelect;
export type NewRedDot = typeof redDots.$inferInsert;

// 10. skills table — Student skill records for OAA skills pillar
export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  skillName: text("skill_name").notNull(),
  proficiencyLevel: text("proficiency_level")
    .$type<"beginner" | "intermediate" | "advanced">()
    .notNull(),
  verified: integer("verified").default(0).notNull(), // 0 = false, 1 = true
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;

// 11. projects table — Student project submissions for OAA project pillar
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  techStack: text("tech_stack").notNull(), // Comma-separated
  repoUrl: text("repo_url"), // Nullable
  score: real("score").default(0).notNull(), // Faculty-assigned, out of 20
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

// 12. peer_messages table — Moderated peer collaboration chat messages
export const peerMessages = sqliteTable("peer_messages", {
  id: text("id").primaryKey(),
  senderId: text("sender_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  roomId: text("room_id").notNull(), // e.g., "dept_cse_2024", "team_xyz"
  content: text("content").notNull(),
  flagged: integer("flagged").default(0).notNull(), // 0 = false, 1 = true
  flagReason: text("flag_reason"), // Nullable
  moderationStatus: text("moderation_status")
    .$type<"pending" | "clean" | "flagged" | "blocked">()
    .default("pending")
    .notNull(),
  sentAt: text("sent_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type PeerMessage = typeof peerMessages.$inferSelect;
export type NewPeerMessage = typeof peerMessages.$inferInsert;

// 13. chat_rooms table — Chat room definitions for peer collaboration
export const chatRooms = sqliteTable("chat_rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").$type<"department" | "team" | "section">().notNull(),
  createdBy: text("created_by").references(() => users.id),
  memberIds: text("member_ids").notNull(), // JSON array of student IDs
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ChatRoom = typeof chatRooms.$inferSelect;
export type NewChatRoom = typeof chatRooms.$inferInsert;

// 14. moderation_alerts table — Alerts for faculty review of flagged messages
export const moderationAlerts = sqliteTable("moderation_alerts", {
  id: text("id").primaryKey(),
  messageId: text("message_id")
    .notNull()
    .references(() => peerMessages.id, { onDelete: "cascade" }),
  roomId: text("room_id").notNull(),
  reason: text("reason").notNull(),
  reviewedBy: text("reviewed_by").references(() => users.id),
  resolvedAt: text("resolved_at"), // Nullable — null means unresolved
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ModerationAlert = typeof moderationAlerts.$inferSelect;
export type NewModerationAlert = typeof moderationAlerts.$inferInsert;
