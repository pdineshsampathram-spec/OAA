import { auth } from "@/auth";
import type { Session } from "next-auth";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/**
 * Retrieves the current user session. Throws a 401 ApiError if not logged in.
 */
export async function getServerSession(): Promise<Session> {
  const session = await auth();
  if (!session || !session.user) {
    throw new ApiError("Unauthorized", 401);
  }
  return session;
}

/**
 * Asserts that the user role is one of the allowed roles. Throws a 403 ApiError otherwise.
 */
export function requireRole(session: Session, roles: string[]): void {
  const userRole = session.user?.role;
  if (!userRole || !roles.includes(userRole)) {
    throw new ApiError("Forbidden", 403);
  }
}
