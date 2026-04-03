import { execSync } from "node:child_process"

const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

/**
 * Delete a test user via direct SQL on the local Supabase database.
 * Foreign key cascades clean up all user-owned data (todos, categories, tags).
 */
export function deleteTestUser(email: string): void {
  try {
    execSync(
      `psql "${DB_URL}" -c "DELETE FROM auth.users WHERE email = '${email.replace(/'/g, "''")}';"`,
      { stdio: "ignore" },
    )
  } catch {
    // Cleanup failure is non-fatal — don't break the test
  }
}
