import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

// next/font โหลดไฟล์ฟอนต์ตอน build แล้ว self-host ให้เอง
// = ไม่ต้องยิงไป fonts.googleapis.com ตอน runtime และไม่มีอาการตัวหนังสือกระพริบ
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-thai",
});

export const metadata: Metadata = {
  title: "Task Tracker",
  description: "ลิสต์งานที่แชร์กันได้สองคน",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4338ca",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `
    try {
      const saved = localStorage.getItem("task-tracker-theme");
      const dark = saved === "dark" || (!saved && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    } catch {}
  `;

  return (
    <html lang="th" className={notoSansThai.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="font-sans">
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
