import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.warn("⚠️ TURSO_DATABASE_URL is not set. Skipping migrations.");
    return;
  }
  const { tursoClient } = await import("../lib/db");
  console.log("Starting database migrations...");
  const migrationsFolder = join(process.cwd(), "drizzle");

  let files: string[] = [];
  try {
    files = readdirSync(migrationsFolder)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch (err) {
    console.error("❌ Failed to read migrations directory:", err);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }

  for (const file of files) {
    process.stdout.write(`Running ${file}... `);
    const filePath = join(migrationsFolder, file);
    const sqlContent = readFileSync(filePath, "utf-8");

    try {
      // executeMultiple runs all semicolon-separated commands in one go.
      await tursoClient.executeMultiple(sqlContent);
      console.log("✓");
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.includes("duplicate column name") ||
        msg.includes("already exists") ||
        msg.includes("duplicate column")
      ) {
        console.log("✓ (already applied)");
      } else {
        console.log("❌");
        console.error(`Error applying migration ${file}:`);
        console.error(err);
        process.exit(1);
      }
    }
  }

  console.log("✓ All migrations applied successfully!");
}

main().catch((err) => {
  console.error("Unhandled error during migration execution:", err);
  process.exit(1);
});
