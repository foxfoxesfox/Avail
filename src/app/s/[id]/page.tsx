import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { currentUser, getMyParticipant, getSchedule } from "@/lib/supabase";
import { ScheduleSummary } from "../summary";
import { Views } from "./views";
import { SessionList } from "../sessions";

export const metadata: Metadata = { title: "Schedule", robots: { index: false, follow: false } };

async function Content({ params }: { params: PageProps<"/s/[id]">["params"] }) {
  const id = (await params).id;
  const [s, user] = await Promise.all([getSchedule(id), currentUser()]);
  if (!s) notFound();
  const mine = user ? await getMyParticipant(id) : null;
  return (
    <>
      <title>{`${s.title} · Avail`}</title>
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em] text-balance">{s.title}</h1>
      <details className="group mt-3">
        <summary className="cursor-pointer list-none text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-ink">
          Schedule details
        </summary>
        <div className="mt-3"><ScheduleSummary s={s} showPeople={s.showNames} /></div>
      </details>
      <SessionList s={s} feedHint />
      <Views s={s} account={{ signedIn: !!user, mine }} />
    </>
  );
}

// Members land here: paint their own times, or see everyone's.
export default function SharePage({ params }: PageProps<"/s/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16">
      <Suspense fallback={<div className="dot-grid h-64 rounded-[10px] border border-rule" />}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
