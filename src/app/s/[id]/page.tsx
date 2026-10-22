import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSchedule } from "@/lib/supabase";
import { ScheduleSummary } from "../summary";

export const metadata: Metadata = { title: "Schedule", robots: { index: false, follow: false } };

async function Content({ params }: { params: PageProps<"/s/[id]">["params"] }) {
  const s = await getSchedule((await params).id);
  if (!s) notFound();
  return (
    <>
      <title>{`${s.title} · Avail`}</title>
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em] text-balance">{s.title}</h1>
      <p className="mt-1 mb-7 text-ink-soft">Marking your free times opens here soon. For now, this is the plan.</p>
      <ScheduleSummary s={s} showPeople={s.showNames} />
    </>
  );
}

// Members land here. Marking availability arrives in slice 3.
export default function SharePage({ params }: PageProps<"/s/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16">
      <Suspense fallback={<div className="dot-grid h-64 rounded-[10px] border border-rule" />}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
