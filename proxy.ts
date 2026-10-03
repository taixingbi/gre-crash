import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "gre_session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPath = ["/today", "/practice", "/dashboard", "/onboarding", "/pay"].some((path) => pathname.startsWith(path));
  if (protectedPath && !request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|api/stripe/webhook).*)"],
};
