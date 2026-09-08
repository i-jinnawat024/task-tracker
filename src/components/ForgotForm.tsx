"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestResetAction, type ActionState } from "@/app/actions";

export default function ForgotForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    requestResetAction,
    null,
  );

  // ส่งแล้วไม่ต้องโชว์ฟอร์มซ้ำ — กันการกดรัวจนโดน rate limit ของตัวเอง
  if (state?.ok) {
    return (
      <div className="card p-5">
        <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-800">
          {state.message}
        </p>
        <Link href="/login" className="btn-ghost mt-4 w-full">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-3 p-5">
      <p className="text-sm leading-relaxed text-slate-600">
        ใส่อีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสใหม่ไปให้ (ลิงก์ใช้ได้ 60 นาที)
      </p>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">อีเมล</span>
        <input
          name="email"
          type="email"
          required
          autoFocus
          className="field"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </label>

      {state?.message && !state.ok && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "กำลังส่ง…" : "ส่งลิงก์ตั้งรหัสใหม่"}
      </button>

      <Link
        href="/login"
        className="block pt-1 text-center text-xs text-slate-400 hover:text-slate-600"
      >
        กลับไปหน้าเข้าสู่ระบบ
      </Link>
    </form>
  );
}
