"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/lib/supabase";
import { safeNext } from "@/lib/auth";

export type SendState = { sentTo?: string; error?: string; email?: string };

// Where to return after signing in. Kept in a short-lived cookie, not the URL: organizer paths carry their secret,
// and the email or Google redirect would otherwise copy it into a third-party system.
async function rememberNext(form: FormData) {
  (await cookies()).set("avail_next", safeNext(String(form.get("next") ?? "")), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 3600, path: "/",
  });
}

const callback = async () => `${(await headers()).get("origin")}/auth/confirm`;

export async function sendLink(_prev: SendState, form: FormData): Promise<SendState> {
  const email = String(form.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: "Enter an email address like name@example.com.", email };
  await rememberNext(form);
  const { error } = await (await db()).auth.signInWithOtp({ email, options: { emailRedirectTo: await callback() } });
  if (error) {
    console.error("signInWithOtp failed", error.code, error.message);
    // Until custom email (Resend) is set up, Supabase only emails the project team.
    if (error.code === "email_address_not_authorized") {
      return { error: "Email sign-in isn't open to everyone yet. You can still use Avail without an account.", email };
    }
    return { error: error.status === 429 ? "Too many links sent. Wait a minute, then try again." : "Couldn't send the link. Try again.", email };
  }
  return { sentTo: email };
}

export async function googleSignIn(form: FormData) {
  await rememberNext(form);
  const { data, error } = await (await db()).auth.signInWithOAuth({ provider: "google", options: { redirectTo: await callback() } });
  if (error || !data.url) redirect("/sign-in?error=google");
  redirect(data.url);
}

export async function signOut() {
  await (await db()).auth.signOut();
  refresh();
}
