import Link from "next/link";
import { Suspense } from "react";
import { currentUser, getMySchedules } from "@/lib/supabase";
import { MySchedules } from "./my-schedules";
import { ScheduleList } from "./account/schedule-list";

// Signed in: the account's schedules, then any other organizer links on this device. Guests: just the device list.
async function Lists() {
  const user = await currentUser();
  if (!user) return <MySchedules />;
  const list = await getMySchedules();
  return (
    <>
      <section className="mt-12">
        <h2 className="text-lg font-bold">Your schedules</h2>
        <ScheduleList list={list} />
      </section>
      <MySchedules exclude={list.map((x) => x.shareId)} />
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-16">
      <h1 className="text-[2.5rem] leading-[1.05] font-bold tracking-[-0.03em] text-balance">When is everyone free?</h1>
      <p className="mt-3 max-w-md text-lg text-ink-soft">
        Share one link. Everyone marks their hours. See the best times at a glance.
      </p>
      <Link href="/new"
        className="mt-8 self-start rounded-full bg-indigo px-7 py-4 text-base font-bold text-white transition-colors duration-150 hover:bg-indigo-deep">
        Create a schedule
      </Link>
      <Suspense fallback={null}>
        <Lists />
      </Suspense>
    </main>
  );
}
