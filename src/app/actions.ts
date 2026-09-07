"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  destroyCurrentSession,
  loginUser,
  registerUser,
  requireUser,
} from "@/lib/auth";
import { ForbiddenError } from "@/lib/db/access";
import {
  createList,
  createTask,
  deleteTask,
  inviteMember,
  removeMember,
  renameList,
  setTaskStatus,
  toggleTask,
  updateTask,
} from "@/lib/db/lists";
import { validateTaskInput } from "@/lib/tasks";
import type { Priority, Status } from "@/lib/types";

export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
} | null;

const BOARD = "/board";

/** แปลง error เป็นข้อความที่ผู้ใช้อ่านรู้เรื่อง
 *  ForbiddenError เท่านั้นที่โชว์ข้อความจริง ที่เหลือกลืนไว้ไม่ให้หลุด internal detail */
function toState(error: unknown): ActionState {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error("[action]", error);
  return { ok: false, message: "เกิดข้อผิดพลาด ลองอีกครั้งนะ" };
}

// ───────────────────────────── auth ─────────────────────────────

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let result;
  try {
    result = await loginUser({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  } catch (error) {
    return toState(error);
  }

  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  // redirect() ทำงานด้วยการ throw — ต้องอยู่นอก try ไม่ให้ catch กลืนไป
  revalidatePath(BOARD);
  redirect(BOARD);
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let result;
  try {
    result = await registerUser({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      displayName: String(formData.get("display_name") ?? ""),
    });
  } catch (error) {
    return toState(error);
  }

  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  revalidatePath(BOARD);
  redirect(BOARD);
}

export async function signOut(): Promise<void> {
  await destroyCurrentSession();
  revalidatePath("/", "layout");
  redirect("/login");
}

// ────────────────────────────── tasks ──────────────────────────────

export async function addTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const listId = String(formData.get("list_id") ?? "");

    const validated = validateTaskInput({
      title: String(formData.get("title") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      priority: String(formData.get("priority") ?? "medium") as Priority,
      due_date: String(formData.get("due_date") ?? ""),
      tags: String(formData.get("tags") ?? ""),
    });

    if (!validated.ok) return { ok: false, errors: validated.errors };

    await createTask(listId, user.id, validated.value);
    revalidatePath(BOARD);
    return { ok: true };
  } catch (error) {
    return toState(error);
  }
}

export async function editTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const taskId = String(formData.get("task_id") ?? "");

    const validated = validateTaskInput({
      title: String(formData.get("title") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      status: String(formData.get("status") ?? "todo") as Status,
      priority: String(formData.get("priority") ?? "medium") as Priority,
      due_date: String(formData.get("due_date") ?? ""),
      tags: String(formData.get("tags") ?? ""),
    });

    if (!validated.ok) return { ok: false, errors: validated.errors };

    await updateTask(taskId, user.id, validated.value);
    revalidatePath(BOARD);
    return { ok: true };
  } catch (error) {
    return toState(error);
  }
}

export async function toggleTaskAction(taskId: string): Promise<ActionState> {
  try {
    const user = await requireUser();
    await toggleTask(taskId, user.id);
    revalidatePath(BOARD);
    return { ok: true };
  } catch (error) {
    return toState(error);
  }
}

export async function setStatusAction(taskId: string, status: Status): Promise<ActionState> {
  try {
    const user = await requireUser();
    await setTaskStatus(taskId, user.id, status);
    revalidatePath(BOARD);
    return { ok: true };
  } catch (error) {
    return toState(error);
  }
}

export async function deleteTaskAction(taskId: string): Promise<ActionState> {
  try {
    const user = await requireUser();
    await deleteTask(taskId, user.id);
    revalidatePath(BOARD);
    return { ok: true };
  } catch (error) {
    return toState(error);
  }
}

// ────────────────────────────── list / sharing ──────────────────────────────

export async function inviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const listId = String(formData.get("list_id") ?? "");
    const email = String(formData.get("email") ?? "").trim();

    if (!email) return { ok: false, message: "ใส่อีเมลของคนที่จะแชร์ด้วยนะ" };

    await inviteMember(listId, user.id, email);
    revalidatePath(BOARD);
    return { ok: true, message: `แชร์ลิสต์ให้ ${email} แล้ว` };
  } catch (error) {
    return toState(error);
  }
}

export async function removeMemberAction(
  listId: string,
  targetUserId: string,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await removeMember(listId, user.id, targetUserId);
    revalidatePath(BOARD);
    return { ok: true };
  } catch (error) {
    return toState(error);
  }
}

export async function renameListAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const listId = String(formData.get("list_id") ?? "");
    const name = String(formData.get("name") ?? "").trim();

    if (!name || name.length > 80)
      return { ok: false, message: "ชื่อลิสต์ต้องมี 1–80 ตัวอักษร" };

    await renameList(listId, user.id, name);
    revalidatePath(BOARD);
    return { ok: true };
  } catch (error) {
    return toState(error);
  }
}

export async function createListAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const name = String(formData.get("name") ?? "").trim();
    if (!name || name.length > 80)
      return { ok: false, message: "ชื่อลิสต์ต้องมี 1–80 ตัวอักษร" };

    await createList(name, user.id);
    revalidatePath(BOARD);
    return { ok: true };
  } catch (error) {
    return toState(error);
  }
}
