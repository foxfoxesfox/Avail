"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Schedule } from "@/lib/supabase";
import { formatDateRange, formatHour, formatHours, formatLength, formatZone } from "@/lib/format";
import { onClock } from "@/lib/calendar";
import { groupWeeks, slotKey, slotMinutes, weekColumns } from "@/lib/grid";
import { listDates } from "@/lib/schedule-form";
import { DAY_NAMES, WeekButton, dayOf } from "./availability";
import { bookTime, loadStarts, type BookState } from "./book-actions";
import { Turnstile } from "../../turnstile";
import { Where } from "../summary";

const field = "w-full rounded-[10px] border border-rule bg-sheet px-3.5 py-3 text-base text-ink placeholder:text-ink-soft aria-[invalid=true]:border-vermilion";
const labelCls = "mb-1.5 block text-xs font-bold tracking-[0.06em] text-ink-soft uppercase";

/** Visitors on a booking page: the host's open start times on the week grid; tapping one fills the whole meeting, then name and email book it. */
export function BookingView({ s }: { s: Schedule }) {
  const meeting = s.meetingMinutes ?? s.slotMinutes;
  const group = (s.capacity ?? 1) > 1;
  const [state, action, pending] = useActionState<BookState, FormData>(bookTime, {});
  const [starts, setStarts] = useState<Map<string, number> | null>(null);
  const [failed, setFailed] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [week, setWeek] = useState<number | null>(null);
  const [rover, setRover] = useState<string | null>(null); // the one start in the Tab order; arrows move it
  const form = useRef<HTMLFormElement>(null);
  const formHeading = useRef<HTMLHeadingElement>(null);

  // Load again after "that time was just taken", so the grid shows what's really left.
  useEffect(() => {
    loadStarts(s.shareId).then((rows) => setStarts(new Map(rows.map(([d, m, p]) => [slotKey(d, m), p]))), () => setFailed(true));
  }, [s.shareId, state.taken]);
  const [seenTaken, setSeenTaken] = useState(state.taken);
  if (seenTaken !== state.taken) {
    setSeenTaken(state.taken);
    setPick(null);
  }
  // After picking, the form is where to go next: focus its heading and bring the whole form into view.
  useEffect(() => {
    if (!pick) return;
    formHeading.current?.focus({ preventScroll: true });
    form.current?.scrollIntoView({ block: "nearest" });
  }, [pick]);

  if (s.closed) return <Note>Bookings are closed. Ask the host if you still need a time.</Note>;
  if (failed) return <Note>Couldn&apos;t load the open times. Reload the page to try again.</Note>;
  if (!starts) return <div className="dot-grid mt-8 h-80 rounded-[10px] border border-rule" aria-busy="true"><span className="sr-only">Loading open times</span></div>;
  if (!starts.size && !state.taken) return <Note>No times are open right now. Check back later, or ask the host for another way to book.</Note>;

  const weeks = groupWeeks(listDates(s.startDate, s.endDate, s.weekdays));
  const keys = [...starts.keys()];
  const shown = week ?? Math.max(0, weeks.findIndex((w) => w.some((d) => keys.some((k) => k.startsWith(d + "@")))));
  const cols = weeks[shown] ? weekColumns(weeks[shown], s.weekdays, s.startDate, s.endDate) : [];
  const days = cols.filter((c) => c.active).map((c) => c.date);
  // Rows run from the earliest open start to the latest meeting end over all weeks (whole hours, so the axis stays put
  // between weeks): visitors shouldn't scroll past hours nobody can book.
  const starting = keys.map((k) => Number(k.split("@")[1]));
  const lo = starting.length ? Math.max(s.dayStartMin, Math.floor(Math.min(...starting) / 60) * 60) : s.dayStartMin;
  const hi = starting.length ? Math.min(s.dayEndMin, Math.ceil((Math.max(...starting) + meeting) / 60) * 60) : s.dayEndMin;
  const minutes = slotMinutes(s.dayStartMin, s.dayEndMin, s.slotMinutes).filter((m) => m >= lo && m < hi);
  const zone = `${formatZone(s.timeZone)} time`;
  const rowH = s.slotMinutes === 60 ? "h-[42px]" : "h-7";
  const [rowPx, rowLine] = s.slotMinutes === 60 ? [42, "leading-[42px]"] : [28, "leading-7"];
  // Group pages run fixed sessions: each is drawn at its full length as one block (one cell spanning its rows).
  const span = group ? meeting / s.slotMinutes : 1;
  const sessionStart = (m: number) => s.dayStartMin + Math.floor((m - s.dayStartMin) / meeting) * meeting;
  // Group cells print places left instead of the time, so every row carries its time on the axis.
  const showLabel = (m: number) => group || s.slotMinutes === 60 || m % 60 === 0;
  const openByDay = days.map((d) => minutes.filter((m) => starts.has(slotKey(d, m))));
  const open = openByDay.reduce((n, ms) => n + ms.length, 0);
  const [pickDay, pickMin] = pick ? [pick.split("@")[0], Number(pick.split("@")[1])] : ["", -1];
  const inPick = (d: string, m: number) => d === pickDay && m >= pickMin && m < pickMin + meeting;
  const firstOpen = days.flatMap((d, i) => openByDay[i].map((m) => slotKey(d, m)))[0];
  const tabStop = [rover, pick].find((k) => k && starts.has(k) && days.includes(k.split("@")[0])) ?? firstOpen;

  // Arrow keys move between open starts: up/down within a day, left/right to the nearest start on the next day that has one.
  function move(k: string, key: string) {
    const [d, m] = [k.split("@")[0], Number(k.split("@")[1])];
    const di = days.indexOf(d);
    let to: string | undefined;
    if (key === "ArrowDown" || key === "ArrowUp") {
      const ms = openByDay[di];
      const j = ms.indexOf(m) + (key === "ArrowDown" ? 1 : -1);
      if (ms[j] !== undefined) to = slotKey(d, ms[j]);
    } else {
      const step = key === "ArrowRight" ? 1 : -1;
      for (let i = di + step; i >= 0 && i < days.length; i += step) {
        if (!openByDay[i].length) continue;
        const near = openByDay[i].reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));
        to = slotKey(days[i], near);
        break;
      }
    }
    if (!to) return;
    setRover(to);
    document.querySelector<HTMLElement>(`[data-start="${to}"]`)?.focus();
  }
  const e = state.errors ?? {};
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const yours = pick ? onClock(pickDay, pickMin, pickMin + meeting, s.timeZone, here) : null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">Pick a time</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {/* Group pages run fixed sessions people join; one-person pages let the visitor start anywhere that fits. */}
        Each {group ? "session" : "meeting"} is {formatLength(meeting)}{s.hostName ? ` with ${s.hostName}` : ""}{group ? `, for up to ${s.capacity} people` : ""}. Times are {zone}.{" "}
        {group ? "Pick a session to join." : "Pick a shaded time to start your meeting there."}
      </p>
      {s.location ? <p className="mt-1 text-sm">Where: <Where location={s.location} /></p>
        : s.online && <p className="mt-1 text-sm">Where: a link you get once you book</p>}

      <div className="mt-5 flex items-center justify-between gap-3">
        <WeekButton dir="prev" disabled={shown === 0} onClick={() => setWeek(shown - 1)} />
        <div className="text-center" aria-live="polite">
          <p className="text-sm font-bold">{days.length ? formatDateRange(days[0], days[days.length - 1]) : ""}</p>
          <p className="text-xs text-ink-soft">
            <b className="text-ink">{open}</b> {open === 1 ? "start" : "starts"} open{weeks.length > 1 && <> · week {shown + 1} of {weeks.length}</>}
          </p>
        </div>
        <WeekButton dir="next" disabled={shown >= weeks.length - 1} onClick={() => setWeek(shown + 1)} />
      </div>

      <table className="mt-3 w-full table-fixed border-collapse select-none">
        <caption className="sr-only">Open start times, {zone}</caption>
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
                // Covered by the session block that starts above it.
                if (span > 1 && sessionStart(m) !== m && starts.has(slotKey(date, sessionStart(m)))) return null;
                const places = starts.get(k);
                const chosen = inPick(date, m);
                const fill = chosen ? "bg-indigo text-white" : places ? "bg-indigo-wash text-indigo hover:bg-indigo-wash-hover" : "dot-grid";
                // The chosen meeting reads as one block: indigo rules between its cells instead of grey.
                const cell = `border-l border-rule p-0 ${chosen && span === 1 && m + s.slotMinutes < pickMin + meeting ? "border-b border-b-indigo" : ""}`;
                const tall = places && span > 1;
                return (
                  <td key={k} className={cell} rowSpan={tall ? span : undefined}>
                    {places ? (
                      <button type="button" data-start={k} tabIndex={k === tabStop ? 0 : -1} aria-pressed={pick === k}
                        onClick={() => setPick(pick === k ? null : k)} onFocus={() => setRover(k)}
                        onKeyDown={(ev) => { if (ev.key.startsWith("Arrow")) { ev.preventDefault(); move(k, ev.key); } }}
                        aria-label={`${formatDateRange(date, date)}, ${formatHours(m, m + meeting)}${group ? `, ${places} of ${s.capacity} places left` : ""}`}
                        // A session block is its rows plus the rules between them; its label sits in the first row.
                        style={tall ? { height: span * rowPx + span - 1 } : undefined}
                        className={`flex w-full flex-col items-center px-1 text-xs leading-none font-bold tabular-nums ${tall ? "" : rowH} ${fill} transition-colors duration-150`}>
                        {(!chosen || pick === k) && (
                          <span aria-hidden className={`block w-full shrink-0 truncate ${rowLine}`}>{group ? `${places} left` : formatHour(m)}</span>
                        )}
                      </button>
                    ) : <div aria-hidden className={`${rowH} ${fill}`} />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-ink-soft">
        {group ? "Shaded sessions show places left. " : "Shaded times are when your meeting can start. "}
        <span className="pointer-coarse:hidden">Arrow keys move between them.</span>
      </p>

      {state.message && !pick && <p role="alert" className="mt-4 text-sm font-medium text-vermilion">{state.message}</p>}

      {pick && (
        <form ref={form} action={action} className="mt-8 grid gap-4 border-t border-ink pt-4">
          <input type="hidden" name="shareId" value={s.shareId} />
          <input type="hidden" name="day" value={pickDay} />
          <input type="hidden" name="start" value={pickMin} />
          <input type="hidden" name="zone" value={here} />
          <div>
            <h2 ref={formHeading} tabIndex={-1} className="text-lg font-bold">
              Book {formatDateRange(pickDay, pickDay)} · {formatHours(pickMin, pickMin + meeting)}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {zone}{yours && <>. That&apos;s <b className="font-bold text-ink">{yours}</b></>}
              {group && <> · {starts.get(pick)} of {s.capacity} places left</>}
            </p>
          </div>
          <div>
            <label htmlFor="book-name" className={labelCls}>Your name</label>
            <input id="book-name" name="name" defaultValue={state.values?.name} maxLength={60} autoComplete="name" required
              aria-invalid={!!e.name} aria-describedby="book-name-err" className={field} />
            {e.name && <p id="book-name-err" role="alert" className="mt-1.5 text-sm font-medium text-vermilion">{e.name}</p>}
          </div>
          <div>
            <label htmlFor="book-email" className={labelCls}>Email</label>
            <input id="book-email" name="email" type="email" defaultValue={state.values?.email} maxLength={254} autoComplete="email" required
              aria-invalid={!!e.email} aria-describedby="book-email-hint book-email-err" className={field} />
            <p id="book-email-hint" className="mt-1.5 text-sm text-ink-soft">For your confirmation. Only the host sees it.</p>
            {e.email && <p id="book-email-err" role="alert" className="mt-1.5 text-sm font-medium text-vermilion">{e.email}</p>}
          </div>
          <Turnstile resetKey={state} />
          {state.message && <p role="alert" className="text-sm font-medium text-vermilion">{state.message}</p>}
          <button aria-disabled={pending} onClick={(ev) => { if (pending) ev.preventDefault(); }}
            className="w-full rounded-full bg-indigo px-6 py-3.5 sm:w-auto sm:justify-self-start text-base font-bold text-white transition-colors duration-150 hover:bg-indigo-deep aria-disabled:opacity-60">
            {pending ? "Booking…" : "Book this time"}
          </button>
        </form>
      )}
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-8 border-t border-ink pt-4 text-ink-soft">{children}</p>;
}
