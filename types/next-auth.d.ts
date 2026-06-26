import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    schoolId: string;
    studentId?: string;
  }

  interface Session {
    user: {
      role: string;
      schoolId: string;
      studentId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    schoolId: string;
    studentId?: string;
  }
}
