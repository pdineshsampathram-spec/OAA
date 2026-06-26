-- 0000_initial.sql
-- Drizzle schema migration for SQLite/libSQL

CREATE TABLE IF NOT EXISTS `schools` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `role` text NOT NULL CHECK (`role` IN ('admin', 'teacher', 'principal')),
  `school_id` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);

CREATE TABLE IF NOT EXISTS `students` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `class` text NOT NULL,
  `section` text NOT NULL,
  `gender` text NOT NULL,
  `school_id` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `marks` (
  `id` text PRIMARY KEY NOT NULL,
  `student_id` text NOT NULL,
  `subject` text NOT NULL,
  `exam_type` text NOT NULL CHECK (`exam_type` IN ('unit_test', 'midterm', 'final', 'assignment')),
  `marks` real NOT NULL,
  `max_marks` real DEFAULT 100.0 NOT NULL,
  `recorded_by` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `attendance` (
  `id` text PRIMARY KEY NOT NULL,
  `student_id` text NOT NULL,
  `date` text NOT NULL,
  `status` text NOT NULL CHECK (`status` IN ('present', 'absent', 'late')),
  `recorded_by` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  UNIQUE(`student_id`, `date`)
);

CREATE TABLE IF NOT EXISTS `ai_predictions` (
  `id` text PRIMARY KEY NOT NULL,
  `student_id` text NOT NULL,
  `risk_flag` integer NOT NULL CHECK (`risk_flag` IN (0, 1)),
  `score` real NOT NULL,
  `suggestions` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `expires_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

-- Indexes
CREATE INDEX IF NOT EXISTS `idx_students_school` ON `students` (`school_id`);
CREATE INDEX IF NOT EXISTS `idx_marks_student` ON `marks` (`student_id`);
CREATE INDEX IF NOT EXISTS `idx_attendance_student_date` ON `attendance` (`student_id`, `date`);
CREATE INDEX IF NOT EXISTS `idx_predictions_student` ON `ai_predictions` (`student_id`);
