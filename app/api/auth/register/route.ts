import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, schools } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateId } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "teacher", "principal"]),
  schoolName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data. Please check fields." },
        { status: 400 }
      );
    }

    const { name, email, password, role, schoolName } = parsed.data;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 409 }
      );
    }

    // Determine schoolId
    let schoolId = "school_1"; // fallback default

    if (schoolName && schoolName.trim().length > 0) {
      const newSchoolId = generateId();
      await db.insert(schools).values({
        id: newSchoolId,
        name: schoolName.trim(),
      });
      schoolId = newSchoolId;
    }

    // Hash password with bcryptjs
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = generateId();
    await db.insert(users).values({
      id: userId,
      name,
      email,
      passwordHash,
      role,
      schoolId,
    });

    return NextResponse.json(
      { success: true, message: "Account created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
