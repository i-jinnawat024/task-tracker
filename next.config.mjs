import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // มี pnpm-lock.yaml อีกไฟล์อยู่ที่ home directory ทำให้ Next.js เดา workspace root ผิด
  // ปักหมุดไว้ที่โฟลเดอร์นี้ ไม่งั้น build trace จะเก็บไฟล์ผิดที่ตอน deploy
  // (ใช้ fileURLToPath ไม่ใช่ import.meta.dirname เพราะตัวนั้นต้อง Node 20.11+)
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
};

export default nextConfig;
