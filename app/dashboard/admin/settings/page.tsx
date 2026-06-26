import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, schools } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import SettingsPage from "@/components/settings/SettingsPage";

export const revalidate = 0;

export default async function DashboardSettingsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = session.user.id;
  const schoolId = session.user.schoolId;

  if (!userId || !schoolId) {
    redirect("/login");
  }

  // Fetch fresh user details
  const userRes = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = userRes[0];

  // Fetch school details
  const schoolRes = await db
    .select({ name: schools.name })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  const schoolName = schoolRes[0]?.name || "EduTrack School";

  // Read email alerts preference from cookie
  const cookieStore = cookies();
  const emailAlertsEnabled = cookieStore.get("email-alerts-enabled")?.value !== "false"; // Default to true

  return (
    <SettingsPage
      initialUser={{
        name: user?.name || "",
        email: user?.email || "",
        role: user?.role || "teacher",
      }}
      initialSchoolName={schoolName}
      initialEmailAlerts={emailAlertsEnabled}
    />
  );
}
