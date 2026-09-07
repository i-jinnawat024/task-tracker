import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // middleware ตรวจแค่ว่ามี cookie ไหม — ตรงนี้คือที่ที่รู้ว่า session ใช้ได้จริงหรือไม่
  if (await getCurrentUser()) redirect("/board");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Task Tracker</h1>
        <p className="mt-1.5 text-sm text-slate-500">ลิสต์งานที่แชร์กันได้สองคน</p>
      </div>
      <AuthForm />
      <p className="mt-6 text-center text-xs text-slate-400">
        สมัครครั้งแรกใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร
      </p>
    </main>
  );
}
