import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  // Route to the correct portal based on role
  if (session.user.role === "student") {
    redirect("/dashboard/student");
  } else {
    redirect("/dashboard/admin");
  }
}
