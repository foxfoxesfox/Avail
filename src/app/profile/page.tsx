import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentUser } from "@/lib/supabase";
import { signOut } from "../sign-in/actions";

export const metadata: Metadata = { title: "Your profile", robots: { index: false, follow: false } };

// Signing out from here goes home; staying would only bounce to the sign-in page.
async function signOutHome() {
  "use server";
  await signOut();
  redirect("/");
}

async function Content() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/profile");
  return (
    <>
      <dl className="mt-6 border-t border-ink text-base">
        <div className="grid grid-cols-[7rem_1fr] gap-x-4 border-b border-rule py-2.5">
          <dt className="text-ink-soft">Signed in as</dt>
          <dd className="font-medium [overflow-wrap:anywhere]">{user.email}</dd>
        </div>
      </dl>
      <form action={signOutHome} className="mt-6">
        <button className="rounded-full bg-indigo-wash px-5 py-3 text-sm font-bold text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover">
          Sign out
        </button>
      </form>
    </>
  );
}

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16">
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em]">Your profile</h1>
      <Suspense fallback={<div className="dot-grid mt-6 h-24 rounded-[10px] border border-rule" />}>
        <Content />
      </Suspense>
    </main>
  );
}
