"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ActionState } from "@/app/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/credentials";

export default function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    null,
  );

  return (
    <form action={formAction} className="card space-y-3 p-5">
      {/* token อยู่ใน hidden field ไม่ใช่อ่านจาก URL ตอน submit
          เพราะหลัง redirect/แชร์หน้าจอ URL อาจไม่มี token ติดมาแล้ว */}
      <input type="hidden" name="token" value={token} />

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">รหัสผ่านใหม่</span>
        <input
          name="password"
          type="password"
          required
          autoFocus
          minLength={MIN_PASSWORD_LENGTH}
          className="field"
          autoComplete="new-password"
        />
        {state?.errors?.password && (
          <p className="mt-1 text-xs text-rose-600">{state.errors.password}</p>
        )}
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          ยืนยันรหัสผ่านใหม่
        </span>
        <input
          name="confirm"
          type="password"
          required
          className="field"
          autoComplete="new-password"
        />
        {state?.errors?.confirm && (
          <p className="mt-1 text-xs text-rose-600">{state.errors.confirm}</p>
        )}
      </label>

      {state?.message && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm leading-relaxed text-rose-700">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "กำลังตั้งรหัสใหม่…" : "ตั้งรหัสใหม่แล้วเข้าใช้งาน"}
      </button>

      <p className="pt-1 text-center text-xs text-slate-400">
        ตั้งรหัสใหม่แล้วอุปกรณ์อื่นที่ค้าง login อยู่จะถูกออกจากระบบทั้งหมด
      </p>
    </form>
  );
}
