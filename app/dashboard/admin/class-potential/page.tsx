import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateClassPotential } from "@/lib/scoring/oaaEngine";
import ClassPotentialDashboard from "@/components/analytics/ClassPotentialDashboard";

export const metadata = {
  title: "Class Potential | EduTrack",
  description: "Class Potential Index analysis across all sections",
};

export default async function ClassPotentialPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const schoolId = session.user.schoolId || "school_1";

  // Get unique class+section combinations
  const allStudents = await db
    .select({ class: students.class, section: students.section })
    .from(students)
    .where(eq(students.schoolId, schoolId));

  const sectionSet = new Set<string>();
  const sections: { classId: string; section: string }[] = [];
  for (const s of allStudents) {
    const key = `${s.class}_${s.section}`;
    if (!sectionSet.has(key)) {
      sectionSet.add(key);
      sections.push({ classId: s.class, section: s.section });
    }
  }

  // Calculate CP for each section
  const cpData = await Promise.all(
    sections.map((s) => calculateClassPotential(s.classId, s.section, schoolId))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          📊 Class Potential Index
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Analyze academic potential across all class sections
        </p>
      </div>

      <ClassPotentialDashboard
        initialData={cpData}
      />
    </div>
  );
}
