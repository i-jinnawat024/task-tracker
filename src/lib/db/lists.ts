import type { ListMember, Task, TaskList } from "@/lib/types";
import { requireAccess, type Access, type AccessNeed, ForbiddenError } from "./access";
import { mapTask, parseDateOnly } from "./map";
import { prisma } from "./prisma";
import type { ValidatedTask } from "@/lib/tasks";

const TASK_SELECT = {
  id: true,
  listId: true,
  title: true,
  notes: true,
  status: true,
  priority: true,
  dueDate: true,
  tags: true,
  createdById: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** สูงสุด 2 คนต่อลิสต์ (ตามที่ออกแบบไว้ว่าใช้กัน 2 คน) */
export const MAX_MEMBERS = 2;

export async function getAccess(listId: string, userId: string): Promise<Access> {
  const member = await prisma.listMember.findUnique({
    where: { listId_userId: { listId, userId } },
    select: { role: true },
  });
  return member ? { role: member.role } : null;
}

/** เช็คสิทธิ์ทุกครั้งก่อนแตะข้อมูล — ทุก action ต้องผ่านฟังก์ชันนี้ */
export async function assertAccess(listId: string, userId: string, need: AccessNeed) {
  return requireAccess(await getAccess(listId, userId), need);
}

/** ลิสต์ทั้งหมดที่ user เห็น พร้อมสร้างลิสต์แรกให้ถ้ายังไม่มี
 *  (ผู้ใช้ไม่ควรเจอหน้าจอว่างที่ต้องกดสร้างอะไรก่อนใช้งาน) */
export async function getMyLists(userId: string): Promise<TaskList[]> {
  const rows = await prisma.list.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, ownerId: true, createdAt: true },
  });

  if (rows.length > 0) {
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      owner_id: r.ownerId,
      created_at: r.createdAt.toISOString(),
    }));
  }

  const created = await prisma.list.create({
    data: {
      name: "งานของเรา",
      ownerId: userId,
      // สร้างลิสต์กับสมาชิกในทรานแซกชันเดียว ไม่ต้องพึ่ง DB trigger
      members: { create: { userId, role: "owner" } },
    },
    select: { id: true, name: true, ownerId: true, createdAt: true },
  });

  return [
    {
      id: created.id,
      name: created.name,
      owner_id: created.ownerId,
      created_at: created.createdAt.toISOString(),
    },
  ];
}

export async function getTasks(listId: string, userId: string): Promise<Task[]> {
  await assertAccess(listId, userId, "read");
  const rows = await prisma.task.findMany({
    where: { listId },
    orderBy: { createdAt: "asc" },
    select: TASK_SELECT,
  });
  return rows.map(mapTask);
}

export async function getMembers(listId: string, userId: string): Promise<ListMember[]> {
  await assertAccess(listId, userId, "read");
  const rows = await prisma.listMember.findMany({
    where: { listId },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    select: {
      listId: true,
      userId: true,
      role: true,
      user: { select: { email: true, displayName: true } },
    },
  });

  return rows.map((r) => ({
    list_id: r.listId,
    user_id: r.userId,
    role: r.role,
    email: r.user.email,
    display_name: r.user.displayName,
  }));
}

export async function createList(name: string, userId: string): Promise<TaskList> {
  const created = await prisma.list.create({
    data: { name, ownerId: userId, members: { create: { userId, role: "owner" } } },
    select: { id: true, name: true, ownerId: true, createdAt: true },
  });
  return {
    id: created.id,
    name: created.name,
    owner_id: created.ownerId,
    created_at: created.createdAt.toISOString(),
  };
}

export async function renameList(listId: string, userId: string, name: string) {
  await assertAccess(listId, userId, "own");
  await prisma.list.update({ where: { id: listId }, data: { name } });
}

export async function createTask(
  listId: string,
  userId: string,
  input: ValidatedTask,
): Promise<Task> {
  await assertAccess(listId, userId, "write");
  const row = await prisma.task.create({
    data: {
      listId,
      createdById: userId,
      title: input.title,
      notes: input.notes,
      status: input.status,
      priority: input.priority,
      dueDate: parseDateOnly(input.due_date),
      tags: input.tags,
      completedAt: input.status === "done" ? new Date() : null,
    },
    select: TASK_SELECT,
  });
  return mapTask(row);
}

export async function updateTask(
  taskId: string,
  userId: string,
  input: ValidatedTask,
): Promise<Task> {
  const listId = await listIdOfTask(taskId);
  await assertAccess(listId, userId, "write");

  const current = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    select: { status: true, completedAt: true },
  });

  const row = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: input.title,
      notes: input.notes,
      status: input.status,
      priority: input.priority,
      dueDate: parseDateOnly(input.due_date),
      tags: input.tags,
      completedAt: completedAtFor(input.status, current.status, current.completedAt),
    },
    select: TASK_SELECT,
  });
  return mapTask(row);
}

/** สลับ done ↔ todo แบบปุ่มติ๊กเดียว */
export async function toggleTask(taskId: string, userId: string): Promise<Task> {
  const listId = await listIdOfTask(taskId);
  await assertAccess(listId, userId, "write");

  const current = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    select: { status: true },
  });
  const next = current.status === "done" ? "todo" : "done";

  const row = await prisma.task.update({
    where: { id: taskId },
    data: { status: next, completedAt: next === "done" ? new Date() : null },
    select: TASK_SELECT,
  });
  return mapTask(row);
}

export async function setTaskStatus(
  taskId: string,
  userId: string,
  status: "todo" | "doing" | "done",
): Promise<Task> {
  const listId = await listIdOfTask(taskId);
  await assertAccess(listId, userId, "write");

  const row = await prisma.task.update({
    where: { id: taskId },
    data: { status, completedAt: status === "done" ? new Date() : null },
    select: TASK_SELECT,
  });
  return mapTask(row);
}

export async function deleteTask(taskId: string, userId: string): Promise<void> {
  const listId = await listIdOfTask(taskId);
  await assertAccess(listId, userId, "write");
  await prisma.task.delete({ where: { id: taskId } });
}

/** เชิญคนเข้าลิสต์ด้วยอีเมล
 *  ต้องให้เขาสมัครก่อน เพราะเราไม่มีสิทธิ์สร้าง auth user แทนคนอื่น
 *  และไม่ยิงอีเมลเชิญเองเพื่อกันการใช้แอปนี้เป็นเครื่องมือ spam */
export async function inviteMember(listId: string, userId: string, email: string) {
  await assertAccess(listId, userId, "own");

  const invitee = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true },
  });

  if (!invitee)
    throw new ForbiddenError(
      "ยังไม่มีบัญชีอีเมลนี้ในระบบ — ให้เขาสมัครสมาชิกก่อน แล้วเชิญอีกครั้ง",
    );

  if (invitee.id === userId) throw new ForbiddenError("คุณอยู่ในลิสต์นี้อยู่แล้ว");

  const count = await prisma.listMember.count({ where: { listId } });
  const already = await prisma.listMember.findUnique({
    where: { listId_userId: { listId, userId: invitee.id } },
    select: { userId: true },
  });

  if (!already && count >= MAX_MEMBERS)
    throw new ForbiddenError(`ลิสต์นี้แชร์ได้สูงสุด ${MAX_MEMBERS} คน`);
  if (already) return;

  await prisma.listMember.create({
    data: { listId, userId: invitee.id, role: "editor" },
  });
}

export async function removeMember(
  listId: string,
  userId: string,
  targetUserId: string,
): Promise<void> {
  // ออกเองได้ / เจ้าของเตะคนอื่นออกได้ แต่เตะเจ้าของออกไม่ได้ (ลิสต์จะไร้เจ้าของ)
  if (targetUserId !== userId) await assertAccess(listId, userId, "own");
  else await assertAccess(listId, userId, "read");

  const target = await prisma.listMember.findUnique({
    where: { listId_userId: { listId, userId: targetUserId } },
    select: { role: true },
  });
  if (!target) return;
  if (target.role === "owner")
    throw new ForbiddenError("เอาเจ้าของลิสต์ออกไม่ได้ — ถ้าจะเลิกใช้ให้ลบลิสต์ทิ้ง");

  await prisma.listMember.delete({
    where: { listId_userId: { listId, userId: targetUserId } },
  });
}

function completedAtFor(
  nextStatus: string,
  currentStatus: string,
  currentCompletedAt: Date | null,
): Date | null {
  if (nextStatus !== "done") return null;
  // เสร็จอยู่แล้วก็เก็บเวลาเดิมไว้ ไม่รีเซ็ตทุกครั้งที่แก้ชื่องาน
  return currentStatus === "done" ? currentCompletedAt : new Date();
}

async function listIdOfTask(taskId: string): Promise<string> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { listId: true },
  });
  // ไม่บอกว่า "ไม่พบ" vs "ไม่มีสิทธิ์" ต่างกัน เพื่อไม่ให้เดาได้ว่ามี id นี้อยู่จริงไหม
  if (!task) throw new ForbiddenError("ไม่พบงานนี้ หรือไม่มีสิทธิ์เข้าถึง");
  return task.listId;
}
