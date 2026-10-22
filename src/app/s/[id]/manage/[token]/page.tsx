import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getScheduleAsOrganizer } from "@/lib/supabase";
import { CopyLink } from "../../../copy-link";
import { ScheduleSummary } from "../../../summary";

export const metadata: Metadata = { title: "Organizer", robots: { index: false, follow: false } };

async function Content({ params }: { params: PageProps<"/s/[id]/manage/[token]">["params"] }) {
  const { id, token } = await params;
  const s = await getScheduleAsOrganizer(id, token);
  if (!s) notFound();

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em] text-balance">{s.title}</h1>
          <p className="mt-1 text-ink-soft">Schedule created. Send the share link to everyone.</p>
        </div>
        <span aria-hidden className="grid size-16 shrink-0 -rotate-12 place-items-center rounded-full border-[3px] border-seal text-xs font-bold tracking-[0.08em] text-seal">
          AVAIL
        </span>
      </div>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-bold">Share link</h2>
        <p className="mb-3 text-sm text-ink-soft">For members: they pick their name and mark when they&apos;re free.</p>
        <CopyLink path={`/s/${s.shareId}`} label="Share link" action="Copy share link" />
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-bold">Your organizer link</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Keep this private and save it: it&apos;s the only way back to this page until accounts arrive. Anyone with it can manage the schedule.
        </p>
        <CopyLink path={`/s/${s.shareId}/manage/${token}`} label="Organizer link" action="Copy organizer link" quiet />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">Details</h2>
        <ScheduleSummary s={s} />
      </section>
    </>
  );
}

export default function ManagePage({ params }: PageProps<"/s/[id]/manage/[token]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16">
      <Suspense fallback={<div className="dot-grid h-96 rounded-[10px] border border-rule" />}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
