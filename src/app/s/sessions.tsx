"use client";

import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import type { Session } from "@/lib/supabase";
import { formatDateRange, formatHours } from "@/lib/format";
import { googleLink, outlookLink } from "@/lib/calendar";

/** The one hanko on a screen: stamped beside "Confirmed" (or "created" on the organizer page). */
export function Hanko() {
  return (
    <span aria-hidden className="grid size-16 shrink-0 -rotate-12 place-items-center rounded-full border-[3px] border-seal text-xs font-bold tracking-[0.08em] text-seal">
      AVAIL
    </span>
  );
}

/** Confirmed sessions as a ruled list under a single hanko, each with add-to-calendar links. Organizers get Cancel;
 *  members get a pointer to their calendar feed (`#calendar-feed`, opened by the feed panel). */
export function SessionList({ s, onCancel, feedHint = false }: {
  s: { shareId: string; title: string; timeZone: string; sessions: Session[] };
  onCancel?: (id: string) => Promise<void>;
  feedHint?: boolean;
}) {
  const { sessions } = s;
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  if (!sessions.length) return null;
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <h2 ref={heading} tabIndex={-1} className="text-lg font-bold">Confirmed</h2>
        <Hanko />
      </div>
      <ul className="mt-3 border-t border-ink">
        {sessions.map((x) => (
          <li key={x.id} className="flex items-start gap-4 border-b border-rule py-3">
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-base font-bold">{formatDateRange(x.day, x.day)} · {formatHours(x.startMin, x.endMin)}</p>
              {x.location && <p className="mt-0.5">{x.location}</p>}
              {x.link && (
                <a href={x.link} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-indigo underline underline-offset-4">
                  {x.link}
                </a>
              )}
              {x.notes && <p className="mt-1 whitespace-pre-line text-ink-soft">{x.notes}</p>}
              <AddToCalendar s={s} x={x} />
            </div>
            {onCancel && (asking === x.id ? (
              // Keep first and full size, matching the shared two-step confirm.
              <div className="flex shrink-0 flex-wrap justify-end gap-3">
                <button type="button" autoFocus
                  onClick={() => { flushSync(() => setAsking(null)); document.getElementById(`cancel-${x.id}`)?.focus(); }}
                  className="rounded-full bg-indigo-wash px-5 py-3 text-sm font-bold text-indigo hover:bg-indigo-wash-hover">
                  Keep
                </button>
                <button type="button" disabled={pending} onClick={() => start(async () => { await onCancel(x.id); heading.current?.focus(); })}
                  className="rounded-full bg-indigo px-5 py-3 text-sm font-bold text-white hover:bg-indigo-deep disabled:opacity-60">
                  {pending ? "Cancelling…" : "Yes, cancel"}
                </button>
              </div>
            ) : (
              <button type="button" id={`cancel-${x.id}`} onClick={() => setAsking(x.id)}
                aria-label={`Cancel ${formatDateRange(x.day, x.day)}, ${formatHours(x.startMin, x.endMin)}`}
                className="shrink-0 rounded-full bg-indigo-wash px-3.5 py-1.5 text-sm font-bold text-indigo hover:bg-indigo-wash-hover">
                Cancel
              </button>
            ))}
          </li>
        ))}
      </ul>
      {feedHint && (
        <p className="mt-3 text-sm text-ink-soft">
          To get future sessions automatically,{" "}
          <a href="#calendar-feed" className={calLink}
            // Same-hash clicks fire no hashchange; send one so the panel still opens.
            onClick={() => { if (location.hash === "#calendar-feed") window.dispatchEvent(new HashChangeEvent("hashchange")); }}>
            use your calendar feed
          </a>.
        </p>
      )}
    </section>
  );
}

const calLink = "font-medium text-indigo underline underline-offset-4 hover:text-indigo-deep";

// Links stay text-weight, with padding that lifts each tap area to 32px; screen readers hear which session and new tabs.
function AddToCalendar({ s, x }: { s: { shareId: string; title: string; timeZone: string }; x: Session }) {
  const e = { title: s.title, timeZone: s.timeZone, session: x };
  const when = <span className="sr-only"> for {formatDateRange(x.day, x.day)}, {formatHours(x.startMin, x.endMin)}</span>;
  const newTab = <span className="sr-only"> (opens in a new tab)</span>;
  const link = `${calLink} -my-1.5 inline-block py-1.5`;
  return (
    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      <span className="basis-full text-ink-soft sm:basis-auto">Add to calendar:</span>
      <a href={googleLink(e)} target="_blank" rel="noopener noreferrer" className={link}>Google{when}{newTab}</a>
      <a href={outlookLink(e)} target="_blank" rel="noopener noreferrer" className={link}>Outlook.com{when}{newTab}</a>
      <a href={`/s/${s.shareId}/event/${x.id}`} className={link}>Apple / other (.ics){when}</a>
    </p>
  );
}

/** True when a slot falls inside a confirmed session (for marking it in the grids). */
export const inSession = (sessions: Session[], day: string, minute: number) =>
  sessions.some((x) => x.day === day && minute >= x.startMin && minute < x.endMin);

/** Seal outline drawn once around a session's run of cells: sides on every cell, top on the first, bottom on the last. */
export function sessionOutline(sessions: Session[], day: string, minute: number, step: number) {
  const x = sessions.find((v) => v.day === day && minute >= v.startMin && minute < v.endMin);
  if (!x) return undefined;
  const c = "var(--color-seal)";
  return [`inset 2px 0 0 ${c}`, `inset -2px 0 0 ${c}`, minute === x.startMin && `inset 0 2px 0 ${c}`, minute + step >= x.endMin && `inset 0 -2px 0 ${c}`]
    .filter(Boolean).join(", ");
}
