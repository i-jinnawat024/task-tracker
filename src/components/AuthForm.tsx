"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type ActionState } from "@/app/actions";

export default function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  return (
    <div className="card p-5">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        {(
          [
            ["signin", "เข้าสู่ระบบ"],
            ["signup", "สมัครสมาชิก"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-md py-2 text-sm font-medium transition ${
              mode === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* key={mode} บังคับให้ React ล้าง state ของ useActionState ตอนสลับโหมด
          ไม่ให้ข้อความ error ของ login ค้างอยู่บนฟอร์มสมัคร */}
      <form key={mode} action={formAction} className="space-y-3">
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">ชื่อที่ให้คนอื่นเห็น</span>
            <input
              name="display_name"
              maxLength={50}
              className="field"
              placeholder="เช่น มะปราง"
              autoComplete="nickname"
            />
            {state?.errors?.displayName && (
              <p className="mt-1 text-xs text-rose-600">{state.errors.displayName}</p>
            )}
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">อีเมล</span>
          <input
            name="email"
            type="email"
            required
            className="field"
            placeholder="you@example.com"
            autoComplete="email"
          />
          {state?.errors?.email && (
            <p className="mt-1 text-xs text-rose-600">{state.errors.email}</p>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">รหัสผ่าน</span>
          <input
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            className="field"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {state?.errors?.password && (
            <p className="mt-1 text-xs text-rose-600">{state.errors.password}</p>
          )}
        </label>

        {state?.message && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              state.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {state.message}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "กำลังดำเนินการ…" : mode === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        </button>
      </form>
    </div>
  );
}
