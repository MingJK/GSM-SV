import { NextRequest, NextResponse } from "next/server";

/**
 * 서버사이드 라우트 보호 미들웨어
 * - 인증 쿠키가 없으면 로그인 페이지로 리다이렉트
 * - 공개 경로(로그인, 회원가입 등)는 제외
 */

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/verify",
  "/reset-password",
  "/auth/callback",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적 파일, API 프록시, 공개 경로는 통과
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/uploads") ||
    pathname === "/favicon.ico" ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // access_token 쿠키 확인
  const token = request.cookies.get("access_token");
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
