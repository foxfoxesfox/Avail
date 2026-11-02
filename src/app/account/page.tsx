import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentUser, getMySchedules } from "@/lib/supabase";
import { MySchedules } from "../my-schedules";
import { ScheduleList } from "./schedule-list";

export const metadata: Metadata = { title: "Your schedules", robots: { index: false, follow: false } };

async function Content() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/account");
  const list = await getMySchedules();
  return (
    <>
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
