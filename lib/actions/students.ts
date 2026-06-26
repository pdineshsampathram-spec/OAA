"use server";

import { createStudent, updateStudent, deleteStudent, getStudentById, getStudentRank } from "@/lib/db/queries/students";
import { revalidatePath } from "next/cache";
import type { NewStudent } from "@/lib/db/schema";

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Add a new student.
 */
export async function addStudentAction(
  data: NewStudent
): Promise<ActionResult<unknown>> {
  try {
    const res = await createStudent(data);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/students");
    return { success: true, data: res };
  } catch (error: unknown) {
    console.error("addStudentAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to add student";
    return { success: false, error: message };
  }
}

/**
 * Update an existing student's details.
 */
export async function updateStudentAction(
  id: string,
  data: Partial<NewStudent>
): Promise<ActionResult<unknown>> {
  try {
    const res = await updateStudent(id, data);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/students");
    revalidatePath(`/dashboard/admin/students/${id}`);
    return { success: true, data: res };
  } catch (error: unknown) {
    console.error("updateStudentAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to update student";
    return { success: false, error: message };
  }
}

/**
 * Soft delete a student by updating their deletedAt field.
 */
export async function deleteStudentAction(
  id: string
): Promise<ActionResult<boolean>> {
  try {
    const res = await deleteStudent(id);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/students");
    return { success: true, data: res };
  } catch (error: unknown) {
    console.error("deleteStudentAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete student";
    return { success: false, error: message };
  }
}

/**
 * Fetch a student's full profile, marks, attendance, AI prediction, and calculate school rank.
 */
export async function getStudentWithAnalyticsAction(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    const student = await getStudentById(id);
    if (!student) {
      return { success: false, error: "Student not found" };
    }

    const rank = await getStudentRank(id, student.schoolId || "school_1");

    return {
      success: true,
      data: {
        ...student,
        rank,
      },
    };
  } catch (error: unknown) {
    console.error("getStudentWithAnalyticsAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to retrieve student analytics";
    return { success: false, error: message };
  }
}
