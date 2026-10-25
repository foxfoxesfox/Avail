"use client";

import { useEffect, useRef, useState } from "react";
import type { Schedule } from "@/lib/supabase";
import { formatDateRange, formatHour } from "@/lib/format";
import { groupWeeks, slotKey, slotMinutes, weekColumns } from "@/lib/grid";
import { listDates } from "@/lib/schedule-form";
import { getTotals, type Totals } from "./actions";
import { DAY_NAMES, WeekButton, dayOf } from "./availability";

// shortcut: polls every 10 s instead of Supabase Realtime (tables are locked to anon); move to Realtime broadcast if traffic grows.
const POLL_MS = 10_000;

type Slot = { free: number; ifn: number; fn: string[] | null; inn: string[] | null };

// Share of people free (if-needed counts half) → one of four flat heat steps.
const STEPS = [
  { cls: "heat-1", label: "A few" },
  { cls: "heat-2", label: "About half" },
  { cls: "heat-3", label: "Most" },
  { cls: "heat-4", label: "Nearly everyone" },
];
const step = (share: number) => (share <= 0 ? -1 : share <= 0.25 ? 0 : share <= 0.5 ? 1 : share < 0.75 ? 2 : 3);

/** Everyone's availability as a heat grid: darker indigo = more people free. Tap a slot to see who. */
export function GroupGrid({ s, token = null }: { s: Schedule; token?: string | null }) {
  const [data, setData] = useState<Totals | null>(null);
  const [failed, setFailed] = useState(false);
  const [week, setWeek] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const detail = useRef<HTMLDivElement>(null);

  // On a phone the answer sits below the grid: bring it into view so a tap visibly does something.
  useEffect(() => {
    if (!sel) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    detail.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [sel]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      getTotals(s.shareId, token).then((d) => alive && (setData(d), setFailed(false)), () => alive && setFailed(true));
    };
    load();
    const t = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => { alive = false; clearInterval(t); document.removeEventListener("visibilitychange", load); };
  }, [s.shareId, token]);

  if (!data) {
    return failed
      ? <p role="alert" className="mt-6 text-sm font-medium text-vermilion">Couldn&apos;t load everyone&apos;s times. Check your connection.</p>
      : <div className="dot-grid mt-6 h-80 rounded-[10px] border border-rule" aria-busy="true" />;
  }

  const slots = new Map<string, Slot>(data.slots.map(([d, m, free, ifn, fn, inn]) => [slotKey(d, m), { free, ifn, fn, inn }]));
  const weeks = groupWeeks(listDates(s.startDate, s.endDate, s.weekdays));
  const cols = weeks[week] ? weekColumns(weeks[week], s.weekdays, s.startDate, s.endDate) : [];
  const days = cols.filter((c) => c.active).map((c) => c.date);
  const minutes = slotMinutes(s.dayStartMin, s.dayEndMin, s.slotMinutes);
  const rowH = s.slotMinutes === 60 ? "h-[42px]" : "h-7";
  const showLabel = (m: number) => s.slotMinutes === 60 || m % 60 === 0;
  const people = Math.max(data.people, 1);
  const label = (d: string, m: number) => `${DAY_NAMES[dayOf(d).getUTCDay()]} ${dayOf(d).getUTCDate()}, ${formatHour(m)}`;
  const picked = sel ? { key: sel, ...(slots.get(sel) ?? { free: 0, ifn: 0, fn: [], inn: [] }) } : null;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-bold">Everyone&apos;s times</h2>
        <p className="text-sm text-ink-soft" aria-live="polite">
          <b className="text-ink">{data.replied}</b> of <b className="text-ink">{data.people}</b> replied
          {data.pending && data.pending.length > 0 && <> · waiting on {data.pending.join(", ")}</>}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <WeekButton dir="prev" disabled={week === 0} onClick={() => { setWeek(week - 1); setSel(null); }} />
        <div className="text-center">
          <p className="text-sm font-bold">{days.length ? formatDateRange(days[0], days[days.length - 1]) : ""}</p>
          {weeks.length > 1 && <p className="text-xs text-ink-soft">week {week + 1} of {weeks.length}</p>}
        </div>
        <WeekButton dir="next" disabled={week >= weeks.length - 1} onClick={() => { setWeek(week + 1); setSel(null); }} />
      </div>

      <table className="mt-3 w-full table-fixed border-collapse">
        <thead>
          <tr className="border-b border-ink">
            <th className="w-14" />
            {cols.map(({ date, active }) => {
              const dow = dayOf(date).getUTCDay();
              const tone = !active ? "text-ink-soft font-normal" : dow === 6 ? "text-indigo" : dow === 0 ? "text-vermilion" : "text-ink";
              return (
                <th key={date} scope="col" className={`pb-2 text-center text-xs font-bold ${tone}`}>
                  <span className="block">{DAY_NAMES[dow]}</span>
                  <span className="block text-base">{dayOf(date).getUTCDate()}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {minutes.map((m) => (
            <tr key={m} className="border-b border-rule">
              <th scope="row" className="w-14 pr-2 text-right align-top text-xs font-medium text-ink-soft">{showLabel(m) ? formatHour(m) : ""}</th>
              {cols.map(({ date, active }) => {
                const k = slotKey(date, m);
                if (!active) return <td key={k} className={`border-l border-rule bg-paper ${rowH}`} />;
                const c = slots.get(k);
                const free = c?.free ?? 0, ifn = c?.ifn ?? 0;
                const st = step((free + ifn / 2) / people);
                return (
                  <td key={k} className="border-l border-rule p-0">
                    <button type="button" onClick={() => setSel(sel === k ? null : k)} aria-pressed={sel === k}
                      aria-label={`${label(date, m)}: ${free} free${ifn ? `, ${ifn} if needed` : ""}`}
                      className={`block w-full ${rowH} text-xs font-bold tabular-nums ${st < 0 ? "dot-grid" : STEPS[st].cls} ${sel === k ? "outline-2 -outline-offset-2 outline-ink" : ""}`}>
                      {free ? free : null}{ifn ? <span className="font-normal">+{ifn}</span> : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {data.replied === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">No replies yet. The grid fills in as people mark their times.</p>
      ) : (
        <div className="mt-3 text-xs text-ink-soft">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Key">
            {STEPS.map((x) => (
              <li key={x.cls} className="flex items-center gap-1.5">
                <span aria-hidden className={`size-3.5 rounded-sm border border-rule ${x.cls}`} />{x.label}
              </li>
            ))}
            <li className="flex items-center gap-1.5"><b className="text-ink">3</b> people free</li>
            <li className="flex items-center gap-1.5"><span className="text-ink">+1</span> if needed</li>
          </ul>
          <p className="mt-1.5">Tap a slot to see who. Updates every few seconds.</p>
        </div>
      )}

      {picked && (() => {
        const [d, m] = picked.key.split("@");
        return (
          <div ref={detail} className="mt-4 scroll-mb-4 border-t border-ink pt-3 text-sm" aria-live="polite">
            <p className="font-bold">{label(d, Number(m))}</p>
            {picked.fn === null ? (
              <p className="mt-1 text-ink-soft"><b className="text-ink">{picked.free}</b> free · <b className="text-ink">{picked.ifn}</b> if needed. The organizer chose to hide names.</p>
            ) : (
              <dl className="mt-1 grid grid-cols-[6rem_1fr] gap-y-1">
                <dt className="text-ink-soft">Free</dt><dd>{picked.fn?.length ? picked.fn.join(", ") : "Nobody yet"}</dd>
                <dt className="text-ink-soft">If needed</dt><dd>{picked.inn?.length ? picked.inn.join(", ") : "Nobody"}</dd>
              </dl>
            )}
          </div>
        );
      })()}
    </section>
  );
}
