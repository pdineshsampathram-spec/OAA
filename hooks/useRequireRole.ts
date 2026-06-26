"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "./useCurrentUser";

export function useRequireRole(allowedRoles: string[]) {
  const router = useRouter();
  const { role, isLoading, isAuthenticated } = useCurrentUser();

  const authorized = !isLoading && isAuthenticated && role !== null && allowedRoles.includes(role);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || role === null || !allowedRoles.includes(role)) {
        router.push("/unauthorized");
      }
    }
  }, [isLoading, isAuthenticated, role, allowedRoles, router]);

  return { authorized };
}
