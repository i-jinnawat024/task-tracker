import ForgotForm from "@/components/ForgotForm";

export const metadata = { title: "ลืมรหัสผ่าน — Task Tracker" };

export default function ForgotPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">ลืมรหัสผ่าน</h1>
      </div>
      <ForgotForm />
    </main>
  );
}
