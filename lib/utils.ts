import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import bcrypt from "bcryptjs";

/**
 * Merges Tailwind classes dynamically with clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a string date (ISO or YYYY-MM-DD) into a user-friendly format (e.g., MMM dd, yyyy).
 */
export function formatDate(date: string): string {
  if (!date) return "";
  try {
    const parsedDate = date.includes("T") ? parseISO(date) : new Date(date);
    // If invalid date, Date constructor returns NaN
    if (isNaN(parsedDate.getTime())) {
      return date;
    }
    return format(parsedDate, "MMM dd, yyyy");
  } catch {
    return date;
  }
}

/**
 * Returns initials from a name (e.g., "John Doe" -> "JD").
 */
export function getInitials(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns the tailwind color class based on the risk score (0-1 or 0-100).
 */
export function getRiskColor(score: number): string {
  const normalizedScore = score <= 1 ? score * 100 : score;
  if (normalizedScore >= 70) return "text-danger"; // rose
  if (normalizedScore >= 40) return "text-warning"; // amber
  return "text-success"; // emerald
}

/**
 * Generates a unique CUID-like ID or random UUID.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Hashes a plaintext password using bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verifies a plaintext password against a hash using bcryptjs.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
