import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { users, students, oaaScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateId } from "@/lib/utils";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          // Fetch user via Drizzle
          const userRes = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          const user = userRes[0];
          if (!user) {
            return null;
          }

          // Verify password with bcryptjs compareSync
          const passwordMatch = bcrypt.compareSync(password, user.passwordHash);
          if (!passwordMatch) {
            return null;
          }

          // Return user details for token/session
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            schoolId: user.schoolId || "",
            studentId: user.studentId || undefined,
          };
        } catch (error) {
          console.error("Auth authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        try {
          // Check if user exists in database
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);

          if (existingUser.length === 0) {
            // User does not exist, automatically onboard as student
            const userId = generateId();
            const studentId = `student_${generateId()}`;
            const dummyHash = bcrypt.hashSync("google-auth-placeholder-" + Math.random(), 10);
            const schoolId = "school_1"; // default school

            // 1. Insert into students table
            await db.insert(students).values({
              id: studentId,
              name: user.name || "Google User",
              class: "10",
              section: "A",
              gender: "Other",
              schoolId,
            });

            // 2. Insert into users table
            await db.insert(users).values({
              id: userId,
              name: user.name || "Google User",
              email: user.email,
              passwordHash: dummyHash,
              role: "student",
              schoolId,
              studentId,
            });

            // 3. Initialize default OAA score record
            await db.insert(oaaScores).values({
              id: `oaa_${generateId()}`,
              studentId,
              academicScore: 0,
              skillsScore: 0,
              projectScore: 0,
              behaviorScore: 10,
              totalOaaScore: 10,
              classPotentialContribution: 0,
              percentileRank: 0,
            });

            console.log(`Created new student user via Google login: ${user.email}`);
          }
          return true;
        } catch (error) {
          console.error("Error during Google sign-in user creation:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Query user info from database using email
        const dbUserRes = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email || token.email || ""))
          .limit(1);

        const dbUser = dbUserRes[0];
        if (dbUser) {
          token.role = dbUser.role;
          token.schoolId = dbUser.schoolId || "";
          token.studentId = dbUser.studentId || undefined;
          token.name = dbUser.name || "";
          token.email = dbUser.email;
        }
      }
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.email) token.email = session.email;
        if (session.role) token.role = session.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.schoolId = token.schoolId as string;
        session.user.studentId = token.studentId as string | undefined;
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
      }
      return session;
    },
  },
});

