"use server";

import { createMark, createMarksBulk, updateMark, deleteMark } from "@/lib/db/queries/marks";
import { revalidatePath } from "next/cache";
import type { NewMark } from "@/lib/db/schema";

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Add a single mark record.
 */
export async function addMarkAction(data: NewMark): Promise<ActionResult<unknown>> {
  try {
    const res = await createMark(data);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/marks");
    return { success: true, data: res };
  } catch (error: unknown) {
    console.error("addMarkAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to add mark record";
    return { success: false, error: message };
  }
}

/**
 * Update the marks value of an existing record.
 */
export async function updateMarkAction(id: string, marksValue: number): Promise<ActionResult<unknown>> {
  try {
    const res = await updateMark(id, marksValue);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/marks");
    return { success: true, data: res };
  } catch (error: unknown) {
    console.error("updateMarkAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to update mark record";
    return { success: false, error: message };
  }
}

/**
 * Delete a mark record.
 */
export async function deleteMarkAction(id: string): Promise<ActionResult<boolean>> {
  try {
    const res = await deleteMark(id);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/marks");
    return { success: true, data: res };
  } catch (error: unknown) {
    console.error("deleteMarkAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete mark record";
    return { success: false, error: message };
  }
}

/**
 * Batch insert multiple mark records.
 */
export async function bulkAddMarksAction(records: NewMark[]): Promise<ActionResult<unknown[]>> {
  try {
    const res = await createMarksBulk(records);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/marks");
    return { success: true, data: res };
  } catch (error: unknown) {
    console.error("bulkAddMarksAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to bulk add mark records";
    return { success: false, error: message };
  }
}
