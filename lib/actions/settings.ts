"use server";

import { db } from "@/lib/db";
import { users, schools } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional().or(z.literal("")),
});

const schoolSchema = z.object({
  schoolName: z.string().min(2, "School name must be at least 2 characters"),
});

export async function updateProfileAction(
  prevState: unknown,
  formData: z.infer<typeof profileSchema>
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    // Validate inputs
    const validated = profileSchema.parse(formData);

    const updateData: { name: string; email: string; passwordHash?: string } = {
      name: validated.name,
      email: validated.email,
    };

    // If password is provided, hash it
    if (validated.password) {
      if (validated.password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters" };
      }
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(validated.password, salt);
    }

    // Update in database
    await db.update(users).set(updateData).where(eq(users.id, userId));

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");

    return { success: true, message: "Profile updated successfully." };
  } catch (error: unknown) {
    console.error("updateProfileAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to update profile.";
    return { success: false, error: message };
  }
}

export async function updateSchoolAction(
  prevState: unknown,
  formData: z.infer<typeof schoolSchema>
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.schoolId) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.user.role !== "admin") {
      return { success: false, error: "Forbidden: Only administrators can update school name" };
    }

    const schoolId = session.user.schoolId;

    // Validate
    const validated = schoolSchema.parse(formData);

    // Update database
    await db.update(schools).set({ name: validated.schoolName }).where(eq(schools.id, schoolId));

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");

    return { success: true, message: "School settings updated successfully." };
  } catch (error: unknown) {
    console.error("updateSchoolAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to update school.";
    return { success: false, error: message };
  }
}

export async function updateNotificationPreferencesAction(emailAlerts: boolean) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Persist preference in cookies
    cookies().set("email-alerts-enabled", emailAlerts ? "true" : "false", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return { success: true, message: "Notification preferences updated successfully." };
  } catch (error: unknown) {
    console.error("updateNotificationPreferencesAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to update notification preferences.";
    return { success: false, error: message };
  }
}
