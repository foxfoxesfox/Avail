import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the sign-in session on each request (Server Components can't write cookies).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  // Nothing between creating the client and this call: it is what refreshes an expired session.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Skip static files and the calendar feeds/downloads, which calendar apps fetch without a session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|cal/|s/[^/]+/event/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
