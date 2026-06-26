import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

/**
 * Role-based access control middleware for the OAA platform.
 *
 * Route protection rules:
 * - /dashboard/admin/*    → only "admin" and "principal"
 * - /dashboard/teacher/*  → only "teacher", "admin", "principal"
 * - /dashboard/student/*  → only "student"
 * - /api/admin/*          → only "admin" and "principal" (returns 403 JSON)
 * - /api/teacher/*        → only "teacher", "admin", "principal" (returns 403 JSON)
 * - /api/ai/*             → only "teacher", "admin", "principal" (students blocked)
 * - /api/discipline/*     → only "teacher", "admin", "principal"
 * - /api/oaa/*            → authenticated users (role checks in individual routes)
 * - /api/chat/*           → authenticated users (role checks in individual routes)
 * - Unauthenticated on /dashboard/* or /api/* → redirect to /login
 */
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const userRole = req.auth?.user?.role as string | undefined;

  /** Helper: check if user has one of the allowed roles */
  const hasRole = (allowedRoles: string[]): boolean => {
    return !!userRole && allowedRoles.includes(userRole);
  };

  // ─── Unauthenticated users ────────────────────────────────────────────
  // Redirect to /login for any protected route
  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/api/");

  if (isProtectedRoute && !isLoggedIn) {
    // For API routes: return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", code: 401 },
        { status: 401 }
      );
    }
    // For page routes: redirect to login
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // ─── Redirect logged-in users away from /login ──────────────────────
  if (pathname === "/login" && isLoggedIn) {
    // Redirect to role-appropriate dashboard
    const dashboardUrl = getDashboardUrl(userRole);
    return NextResponse.redirect(new URL(dashboardUrl, nextUrl));
  }

  // ─── API Route Protection (return 403 JSON if unauthorized) ─────────
  if (pathname.startsWith("/api/")) {
    /** Admin-only API routes */
    if (pathname.startsWith("/api/admin")) {
      if (!hasRole(["admin", "principal"])) {
        return NextResponse.json(
          { error: "Forbidden", code: 403 },
          { status: 403 }
        );
      }
    }

    /** Teacher API routes */
    if (pathname.startsWith("/api/teacher")) {
      if (!hasRole(["teacher", "admin", "principal"])) {
        return NextResponse.json(
          { error: "Forbidden", code: 403 },
          { status: 403 }
        );
      }
    }

    /** AI prediction routes — students blocked */
    if (pathname.startsWith("/api/ai")) {
      if (!hasRole(["teacher", "admin", "principal"])) {
        return NextResponse.json(
          { error: "Forbidden", code: 403 },
          { status: 403 }
        );
      }
    }

    /** Discipline routes — faculty only */
    if (pathname.startsWith("/api/discipline")) {
      // GET check endpoint is accessible to all authenticated users
      if (!pathname.includes("/check") && req.method !== "GET") {
        if (!hasRole(["teacher", "admin", "principal"])) {
          return NextResponse.json(
            { error: "Forbidden", code: 403 },
            { status: 403 }
          );
        }
      }
    }
  }

  // ─── Dashboard Page Route Protection (redirect to /unauthorized) ────
  if (pathname.startsWith("/dashboard")) {
    /** Admin dashboard pages — only admin and principal */
    if (pathname.startsWith("/dashboard/admin")) {
      if (!hasRole(["admin", "principal"])) {
        return NextResponse.redirect(new URL("/unauthorized", nextUrl));
      }
    }

    /** Teacher dashboard pages */
    if (pathname.startsWith("/dashboard/teacher")) {
      if (!hasRole(["teacher", "admin", "principal"])) {
        return NextResponse.redirect(new URL("/unauthorized", nextUrl));
      }
    }

    /** Student dashboard pages — students only */
    if (pathname.startsWith("/dashboard/student")) {
      if (!hasRole(["student"])) {
        return NextResponse.redirect(new URL("/unauthorized", nextUrl));
      }
    }
  }

  return NextResponse.next();
});

/**
 * Returns the default dashboard URL for a given user role.
 */
function getDashboardUrl(role?: string): string {
  switch (role) {
    case "admin":
    case "principal":
      return "/dashboard/admin";
    case "teacher":
      return "/dashboard/admin"; // Teachers share admin dashboard
    case "student":
      return "/dashboard/student";
    default:
      return "/dashboard";
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/api/admin/:path*",
    "/api/teacher/:path*",
    "/api/ai/:path*",
    "/api/discipline/:path*",
    "/api/oaa/:path*",
    "/api/chat/:path*",
  ],
};
