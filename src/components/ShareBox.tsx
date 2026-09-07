"use client";

import { useActionState, useState, useTransition } from "react";
import { inviteAction, removeMemberAction, type ActionState } from "@/app/actions";
import type { ListMember } from "@/lib/types";

export default function ShareBox({
  listId,
  members,
  currentUserId,
  isOwner,
}: {
  listId: string;
  members: ListMember[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    inviteAction,
    null,
  );
  const [removing, startRemoving] = useTransition();

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-slate-400 hover:text-slate-600"
      >
        {open ? "▾" : "▸"} คนที่ใช้ลิสต์นี้ ({members.length})
      </button>

      {open && (
        <div className="card mt-2 p-4">
          <ul className="mb-3 space-y-1.5">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-slate-600">
                  {m.display_name ?? m.email}
                  {m.role === "owner" && (
                    <span className="ml-1.5 text-slate-400">(เจ้าของ)</span>
                  )}
                  {m.user_id === currentUserId && (
                    <span className="ml-1.5 text-indigo-500">— คุณ</span>
                  )}
                </span>
                {m.role !== "owner" && (isOwner || m.user_id === currentUserId) && (
                  <button
                    type="button"
                    disabled={removing}
                    onClick={() =>
                      startRemoving(() => void removeMemberAction(listId, m.user_id))
                    }
                    className="shrink-0 text-rose-500 hover:underline"
                  >
                    {m.user_id === currentUserId ? "ออกจากลิสต์" : "เอาออก"}
                  </button>
                )}
              </li>
            ))}
          </ul>

          {isOwner && members.length < 2 && (
            <form action={formAction} className="border-t border-slate-100 pt-3">
              <input type="hidden" name="list_id" value={listId} />
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                แชร์ลิสต์นี้ให้อีกคน
              </span>
              <div className="flex gap-2">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="อีเมลที่เขาใช้สมัคร"
                  className="field flex-1 py-1.5 text-xs"
                />
                <button type="submit" disabled={pending} className="btn-primary py-1.5 text-xs">
                  {pending ? "…" : "แชร์"}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                เขาต้องสมัครสมาชิกในแอปนี้ก่อน แล้วค่อยใส่อีเมลเดียวกันที่นี่
              </p>
              {state?.message && (
                <p
                  className={`mt-1.5 text-xs ${
                    state.ok ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {state.message}
                </p>
              )}
            </form>
          )}

          {isOwner && members.length >= 2 && (
            <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
              ลิสต์นี้แชร์ครบ 2 คนแล้ว
            </p>
          )}
        </div>
      )}
    </section>
  );
}
