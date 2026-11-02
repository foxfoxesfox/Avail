"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import type { BookingRow } from "@/lib/supabase";
import { formatDateRange, formatHours } from "@/lib/format";
import { Confirm } from "../../../confirm";
import { CalendarFeed } from "../../availability";
import { addToMySchedules, hostCancelBooking, hostFeedToken } from "./actions";

const quiet = "shrink-0 rounded-full bg-indigo-wash px-3.5 py-1.5 text-sm font-bold text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover";
const when = (b: BookingRow) => `${formatDateRange(b.day, b.day)} · ${formatHours(b.startMin, b.endMin)}`;

/** Booking emails go to organizers' accounts, so a host on the organizer link alone gets none: a setup step until they're in. */
export function BookingEmails({ shareId, token, signedIn }: { shareId: string; token: string; signedIn: boolean }) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const button = "mt-3 inline-block rounded-full bg-indigo px-5 py-3 text-sm font-bold text-white transition-colors duration-150 hover:bg-indigo-deep disabled:opacity-60";
  return (
    <section className="mt-8">
      <h2 className="mb-1 text-lg font-bold">Get an email for each booking</h2>
      <p className="text-sm text-ink-soft">
        {signedIn ? "Add this page to your account and Avail emails you when someone books or cancels."
          : "Sign in, then add this page to your account: Avail emails you when someone books or cancels."}
      </p>
      {signedIn ? (
        <button type="button" disabled={pending} className={button}
          onClick={() => start(() => addToMySchedules(shareId, token).then(() => setFailed(false), () => setFailed(true)))}>
          {pending ? "Adding…" : "Add to my schedules"}
        </button>
      ) : (
        <Link href={`/sign-in?next=${encodeURIComponent(`/s/${shareId}/manage/${token}`)}`} className={button}>Sign in</Link>
      )}
      {failed && <p role="alert" className="mt-1.5 text-sm font-medium text-vermilion">Couldn&apos;t add it. Try again.</p>}
    </section>
  );
}

/** Booking pages: who booked, upcoming first (with cancel), then past and cancelled ones folded away, and the host's calendar feed. */
export function Bookings({ shareId, token, upcoming, past, cancelled }: {
  shareId: string; token: string | null; upcoming: BookingRow[]; past: BookingRow[]; cancelled: BookingRow[];
}) {
  const [asking, setAsking] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);

  return (
    <section className="mt-10">
      <h2 ref={heading} tabIndex={-1} className="text-lg font-bold">
        Bookings <span className="font-normal text-ink-soft">· {upcoming.length} upcoming</span>
      </h2>
      {upcoming.length ? (
        <ul className="mt-3 border-t border-ink">
          {upcoming.map((b) => (
            <li key={b.id} className="border-b border-rule py-3">
              {asking === b.id ? (
                <Confirm busy={pending} yes="Yes, cancel booking" busyYes="Cancelling…"
                  question={<>Cancel <b>{b.name}</b>&apos;s booking on {when(b)}? The time opens again, and Avail emails them that it&apos;s cancelled.</>}
                  onKeep={() => { flushSync(() => setAsking(null)); document.getElementById(`cancel-${b.id}`)?.focus(); }}
                  onYes={() => start(async () => {
                    const ok = await hostCancelBooking(shareId, token, b.id).then(() => true, () => false);
                    setFailed(!ok);
                    if (ok) { setAsking(null); heading.current?.focus(); }
                  })} />
              ) : (
                <div className="flex items-start gap-4">
                  <Row b={b} />
                  <button type="button" id={`cancel-${b.id}`} onClick={() => { setFailed(false); setAsking(b.id); }} className={quiet}
                    aria-label={`Cancel ${b.name}'s booking, ${when(b)}`}>
                    Cancel
                  </button>
                </div>
              )}
              {asking === b.id && failed && <p role="alert" className="mt-1.5 text-sm font-medium text-vermilion">Couldn&apos;t cancel it. Try again.</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">No upcoming bookings. When someone books through the share link, they appear here.</p>
      )}
      <Folded label="Past" list={past} />
      <Folded label="Cancelled" list={cancelled} />
      <div className="mt-4">
        <CalendarFeed what="Bookings" fetchToken={(reset) => hostFeedToken(shareId, token, reset)} />
      </div>
    </section>
  );
}

function Row({ b }: { b: BookingRow }) {
  return (
    <div className="min-w-0 flex-1 text-sm">
      <p className={`text-base font-bold ${b.cancelled ? "text-ink-soft line-through" : ""}`}>{when(b)}</p>
      <p className="mt-0.5">{b.name} <span className="text-ink-soft [overflow-wrap:anywhere]">· {b.email}</span></p>
      {b.cancelled && <p className="mt-0.5 text-ink-soft">{b.cancelledBy === "host" ? "Cancelled by you" : b.cancelledBy === "visitor" ? "Cancelled by them" : "Cancelled"}</p>}
      {b.outside && !b.cancelled && !b.past && (
        <p className="mt-0.5 font-medium text-vermilion">Outside your free times now. It still stands; cancel it if you can&apos;t make it.</p>
      )}
    </div>
  );
}

function Folded({ label, list }: { label: string; list: BookingRow[] }) {
  if (!list.length) return null;
  return (
    <details className="group mt-3">
      {/* The plus turns to × when open, as on the Help page, so the state isn't left to the browser's marker. */}
      <summary className="-my-2 inline-flex cursor-pointer list-none items-center gap-2 py-2 text-sm font-medium text-ink-soft hover:text-ink">
        <span className="underline underline-offset-4">{label} · {list.length}</span>
        <svg aria-hidden width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
          className="transition-transform duration-150 group-open:rotate-45">
          <path d="M7 2v10M2 7h10" />
        </svg>
      </summary>
      <ul className="mt-2 border-t border-rule">
        {list.map((b) => <li key={b.id} className="border-b border-rule py-2.5"><Row b={b} /></li>)}
      </ul>
    </details>
  );
}
