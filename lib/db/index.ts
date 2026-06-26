import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  // During build time or CI, env vars might be undefined.
  // Fallback to a mock/in-memory or fail gracefully.
  console.warn("WARNING: TURSO_DATABASE_URL is not set. Database client might fail if queried.");
}

export const tursoClient = createClient({
  url: url || "libsql://dummy-url-for-build.db",
  authToken: authToken || "",
});

export const db = drizzle(tursoClient);
