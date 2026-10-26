"use client";

import { useState, useTransition } from "react";
import type { Session } from "@/lib/supabase";
import { formatDateRange, formatHours } from "@/lib/format";

/** The one hanko on a screen: stamped beside "Confirmed" (or "created" on the organizer page). */
export function Hanko() {
  return (
    <span aria-hidden className="grid size-16 shrink-0 -rotate-12 place-items-center rounded-full border-[3px] border-seal text-xs font-bold tracking-[0.08em] text-seal">
      AVAIL
    </span>
  );
}

/** Confirmed sessions as a ruled list under a single hanko. Organizers get Cancel. */
export function SessionList({ sessions, onCancel }: { sessions: Session[]; onCancel?: (id: string) => Promise<void> }) {
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState<string | null>(null);
  if (!sessions.length) return null;
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-lg font-bold">Confirmed</h2>
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
            </div>
            {onCancel && (asking === x.id ? (
              <div className="flex shrink-0 gap-1.5">
                <button type="button" disabled={pending} onClick={() => start(() => onCancel(x.id))}
                  className="rounded-full bg-indigo px-3.5 py-1.5 text-sm font-bold text-white hover:bg-indigo-deep disabled:opacity-60">
                  {pending ? "Cancelling…" : "Yes, cancel"}
                </button>
                <button type="button" onClick={() => setAsking(null)}
                  className="rounded-full bg-indigo-wash px-3.5 py-1.5 text-sm font-bold text-indigo hover:bg-indigo-wash-hover">
                  Keep
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setAsking(x.id)}
                aria-label={`Cancel ${formatDateRange(x.day, x.day)}, ${formatHours(x.startMin, x.endMin)}`}
                className="shrink-0 rounded-full bg-indigo-wash px-3.5 py-1.5 text-sm font-bold text-indigo hover:bg-indigo-wash-hover">
                Cancel
              </button>
            ))}
          </li>
        ))}
      </ul>
    </section>
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
