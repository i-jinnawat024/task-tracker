import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie";

/** ด่านหน้าแบบถูกๆ: ไม่มี cookie เลยก็ไม่ต้องเสียเวลาไปถึงเพจ
 *
 *  ที่นี่ตรวจแค่ "มี cookie ไหม" ไม่ได้ตรวจว่า session ใช้ได้จริง เพราะ middleware
 *  รันบน Edge runtime ที่ต่อ Prisma ไม่ได้ — การตรวจของจริงอยู่ที่ requireUser()
 *  ฝั่ง server component/action ซึ่งเป็นที่ที่ตัดสินสิทธิ์จริง
 *
 *  และไม่ทำ redirect /login → /board ที่นี่ เพราะถ้า cookie ค้างแต่ session ตายแล้ว
 *  จะเด้งไป-กลับไม่จบ (/login → /board → requireUser → /login → ...)
 *  หน้า /login เช็คเองด้วย getCurrentUser() ซึ่งเข้าถึง DB ได้ */
export function middleware(request: NextRequest) {
  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasCookie && request.nextUrl.pathname.startsWith("/board")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/board/:path*", "/board"],
};
