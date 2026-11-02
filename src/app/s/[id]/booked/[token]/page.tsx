import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getBooking } from "@/lib/supabase";
import { formatDateRange, formatHours, formatZone } from "@/lib/format";
import { onClock } from "@/lib/calendar";
import { AddToCalendar, Hanko } from "../../../sessions";
import { CopyLink } from "../../../copy-link";
import { CancelBooking } from "./cancel";
import { Where } from "../../../summary";

export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

async function Content({ params }: { params: PageProps<"/s/[id]/booked/[token]">["params"] }) {
  const { id, token } = await params;
  const b = await getBooking(token);
  if (!b || b.shareId !== id) notFound();
  const theirs = b.visitorZone && onClock(b.day, b.startMin, b.endMin, b.timeZone, b.visitorZone);
  const session = { id: b.id, day: b.day, startMin: b.startMin, endMin: b.endMin, location: b.location, link: null, notes: null };
  return (
    <>
      <title>{`${b.title} · Your booking · Avail`}</title>
      <div className="flex items-end justify-between gap-4">
        <h1 id="booking-title" tabIndex={-1} className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em] text-balance">
          {b.cancelled ? "Booking cancelled" : "You're booked"}
        </h1>
        {!b.cancelled && <Hanko />}
      </div>
      <div className="mt-6 border-t border-ink pt-4">
        <p className="text-lg font-bold">{b.title}</p>
        <p className={`mt-0.5 font-bold tabular-nums ${b.cancelled ? "text-ink-soft line-through" : ""}`}>
          {formatDateRange(b.day, b.day)} · {formatHours(b.startMin, b.endMin)}
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {formatZone(b.timeZone)} time{b.hostName ? ` · with ${b.hostName}` : ""}
          {theirs && <>. That&apos;s <b className="font-bold text-ink">{theirs}</b></>}
        </p>
        {b.location && <p className="mt-1 text-sm">Where: <Where location={b.location} /></p>}
        {!b.cancelled && <AddToCalendar s={{ shareId: id, title: b.title, timeZone: b.timeZone }} x={session} ics={`/s/${id}/booked/${token}/event`} />}
      </div>
      {!b.cancelled && (
        <p className="mt-4 text-sm text-ink-soft">
          Booked for {b.name}. A confirmation was sent to <span className="font-medium text-ink [overflow-wrap:anywhere]">{b.email}</span>.
        </p>
      )}
      {b.cancelled ? (
        <p className="mt-6">
          {b.cancelledBy === "host" ? "The host cancelled this booking." : b.cancelledBy === "visitor" ? "You cancelled this booking, so the time is open for others again." : "This booking is cancelled."}{" "}
          <Link href={`/s/${id}`} className="font-medium text-indigo underline underline-offset-4 hover:text-indigo-deep">Book another time</Link>
        </p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-bold">Keep this page&apos;s link</h2>
            <p className="mt-1 mb-3 text-sm text-ink-soft">It&apos;s how you get back to this booking to add it to your calendar or cancel. Anyone with it can cancel, so keep it to yourself.</p>
            <CopyLink path={`/s/${id}/booked/${token}`} label="Your booking link" action="Copy booking link" quiet />
          </section>
          <section className="mt-8 border-t border-rule pt-4">
            <h2 className="text-lg font-bold">Can&apos;t make it?</h2>
            <p className="mt-1 mb-3 text-sm text-ink-soft">Cancel so someone else can take the time.</p>
            <CancelBooking token={token} />
          </section>
        </>
      )}
    </>
  );
}

// Where a visitor lands after booking, and what their private booking link opens.
export default function BookedPage({ params }: PageProps<"/s/[id]/booked/[token]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16">
      <Suspense fallback={<div className="dot-grid h-64 rounded-[10px] border border-rule" />}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
