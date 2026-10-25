import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

let rawUrl = process.env.TURSO_DATABASE_URL || "file:dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

// Convert libsql:// to https:// for standard TLS/HTTP transport to prevent firewall/WebSocket timeouts
if (rawUrl.startsWith("libsql://")) {
  rawUrl = rawUrl.replace("libsql://", "https://");
}

export const tursoClient = createClient({
  url: rawUrl,
  authToken: authToken || "",
});

export const db = drizzle(tursoClient);

