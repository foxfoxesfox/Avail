import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentUser, getMySchedules } from "@/lib/supabase";
import { MySchedules } from "../my-schedules";
import { ScheduleList } from "./schedule-list";
import { signOut } from "../sign-in/actions";

export const metadata: Metadata = { title: "Your schedules", robots: { index: false, follow: false } };

async function Content() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/account");
  const list = await getMySchedules();
  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-ink-soft">Signed in as <span className="font-medium text-ink [overflow-wrap:anywhere]">{user.email}</span></p>
        <form action={signOut}>
          <button className="rounded-full bg-indigo-wash px-4 py-2 text-sm font-bold text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover">
            Sign out
          </button>
        </form>
      </div>
      <ScheduleList list={list} />
      <MySchedules exclude={list.map((x) => x.shareId)} />
    </>
  );
}

export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16">
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em]">Your schedules</h1>
      <Suspense fallback={<div className="dot-grid mt-6 h-40 rounded-[10px] border border-rule" />}>
        <Content />
      </Suspense>
    </main>
  );
}
