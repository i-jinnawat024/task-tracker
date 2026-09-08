import Link from "next/link";
import ResetForm from "@/components/ResetForm";
import { checkResetToken, RESET_STATUS_MESSAGE } from "@/lib/auth/reset-service";

export const metadata = { title: "ตั้งรหัสผ่านใหม่ — Task Tracker" };
export const dynamic = "force-dynamic";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  // เช็คลิงก์ก่อนโชว์ฟอร์ม เพื่อบอกทันทีว่าหมดอายุ/ใช้แล้ว
  // ไม่ใช่ให้กรอกรหัสใหม่เสร็จแล้วค่อยเด้ง error
  const status = await checkResetToken(token);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">ตั้งรหัสผ่านใหม่</h1>
      </div>

      {status === "valid" ? (
        <ResetForm token={token} />
      ) : (
        <div className="card p-5">
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-800">
            {RESET_STATUS_MESSAGE[status]}
          </p>
          <Link href="/forgot" className="btn-primary mt-4 w-full">
            ขอลิงก์ใหม่
          </Link>
          <Link
            href="/login"
            className="mt-2 block text-center text-xs text-slate-400 hover:text-slate-600"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      )}
    </main>
  );
}
