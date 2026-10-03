import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase";

const SESSION_COOKIE = "gre_session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPath = ["/today", "/practice", "/dashboard", "/onboarding", "/pay"].some((path) => pathname.startsWith(path));
  const config = supabaseConfig();
  if (!config) {
    if (protectedPath && !request.cookies.get(SESSION_COOKIE)?.value) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishable, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (protectedPath && !data.user) return NextResponse.redirect(new URL("/login", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|api/stripe/webhook).*)"],
};
