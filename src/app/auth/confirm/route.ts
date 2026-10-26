import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase";
import { safeNext } from "@/lib/auth";

// Lands here from the email link (token_hash) or from Google (code); sets the session cookie and moves on.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const to = request.nextUrl.clone();
  to.search = "";
  to.pathname = safeNext(request.cookies.get("avail_next")?.value);

  const supabase = await db();
  const tokenHash = q.get("token_hash"), type = q.get("type") as EmailOtpType | null, code = q.get("code");
  const { error } = tokenHash && type ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    : code ? await supabase.auth.exchangeCodeForSession(code)
    : { error: new Error("missing token") };
  if (error) {
    to.pathname = "/sign-in";
    to.searchParams.set("error", "link");
  }
  const res = NextResponse.redirect(to);
  res.cookies.delete("avail_next");
  return res;
}
