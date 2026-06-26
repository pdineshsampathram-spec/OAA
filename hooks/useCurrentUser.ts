"use client";

import { useSession } from "next-auth/react";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "principal" | "";
  schoolId: string;
}

export function useCurrentUser() {
  const { data: session, status } = useSession();

  const user: CurrentUser | null = session?.user
    ? {
        id: (session.user as any).id || "",
        name: session.user.name || "",
        email: session.user.email || "",
        role: ((session.user as any).role as any) || "",
        schoolId: ((session.user as any).schoolId as any) || "",
      }
    : null;

  return {
    user,
    role: user?.role || null,
    schoolId: user?.schoolId || null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}
