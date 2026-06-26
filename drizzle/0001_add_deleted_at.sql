-- 0001_add_deleted_at.sql
-- Migration to add deleted_at column to students table
ALTER TABLE `students` ADD `deleted_at` text;
