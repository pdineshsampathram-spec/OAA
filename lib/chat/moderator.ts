import { db } from "@/lib/db";
import { peerMessages, moderationAlerts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

// Profanity word list (basic filter)
const BLOCKED_WORDS = [
  "damn", "hell", "shit", "fuck", "ass", "bitch", "bastard",
  "crap", "piss", "dick", "cock", "pussy", "slut", "whore",
];

// Exam content detection patterns
const EXAM_PATTERNS = [
  /exam\s*answer/i,
  /question\s*paper/i,
  /leaked/i,
  /share\s*marks/i,
  /send\s*solutions?/i,
  /answer\s*key/i,
  /cheat\s*sheet/i,
  /copy\s*assignment/i,
  /plagiari/i,
];

// Personal info patterns
const PHONE_PATTERN = /\b\d{10}\b/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export interface ModerationResult {
  clean: boolean;
  reason?: string;
  action: "allowed" | "flagged" | "blocked";
}

/**
 * Moderates a chat message through a series of content checks.
 * If any check fails, the message is flagged and an alert is created.
 */
export async function moderateMessage(
  messageId: string,
  content: string,
  roomId: string
): Promise<ModerationResult> {
  const lowerContent = content.toLowerCase();

  // 1. Profanity filter
  for (const word of BLOCKED_WORDS) {
    if (lowerContent.includes(word)) {
      await flagMessage(messageId, roomId, `Profanity detected: "${word}"`);
      return { clean: false, reason: `Profanity detected`, action: "flagged" };
    }
  }

  // 2. Exam content detection
  for (const pattern of EXAM_PATTERNS) {
    if (pattern.test(content)) {
      await flagMessage(messageId, roomId, `Exam content detected: "${content.substring(0, 50)}"`);
      return { clean: false, reason: "Exam content sharing detected", action: "flagged" };
    }
  }

  // 3. Personal info sharing
  if (PHONE_PATTERN.test(content)) {
    await flagMessage(messageId, roomId, "Phone number detected in message");
    return { clean: false, reason: "Personal information (phone number) shared", action: "flagged" };
  }

  if (EMAIL_PATTERN.test(content)) {
    await flagMessage(messageId, roomId, "Email address detected in message");
    return { clean: false, reason: "Personal information (email) shared", action: "flagged" };
  }

  // 4. Clean — update moderation status
  await db
    .update(peerMessages)
    .set({ moderationStatus: "clean" })
    .where(eq(peerMessages.id, messageId));

  return { clean: true, action: "allowed" };
}

/**
 * Flags a message and creates a moderation alert for faculty review.
 */
async function flagMessage(messageId: string, roomId: string, reason: string): Promise<void> {
  // Update message status
  await db
    .update(peerMessages)
    .set({
      flagged: 1,
      flagReason: reason,
      moderationStatus: "flagged",
    })
    .where(eq(peerMessages.id, messageId));

  // Create moderation alert
  await db.insert(moderationAlerts).values({
    id: `alert_${generateId()}`,
    messageId,
    roomId,
    reason,
  });
}
