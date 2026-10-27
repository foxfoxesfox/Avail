"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createSchedule, type CreateState } from "./actions";
import { listDates, parseMembers, SLOT_SIZES } from "@/lib/schedule-form";
import { formatDateRange, formatHour } from "@/lib/format";
import { Turnstile } from "../turnstile";

const DAYS = [
  { v: 1, short: "M", name: "Monday" },
  { v: 2, short: "T", name: "Tuesday" },
  { v: 3, short: "W", name: "Wednesday" },
  { v: 4, short: "T", name: "Thursday" },
  { v: 5, short: "F", name: "Friday" },
  { v: 6, short: "S", name: "Saturday" },
  { v: 0, short: "S", name: "Sunday" },
];

type Values = Record<string, string | string[]>;

const field = "w-full rounded-[10px] border border-rule bg-sheet px-3.5 py-3 text-base text-ink placeholder:text-ink-soft aria-[invalid=true]:border-vermilion";
const labelCls = "mb-1.5 block text-xs font-bold tracking-[0.06em] text-ink-soft uppercase";

const MAX_WEEKS_SHOWN = 6;

// The planner's week strip: Monday-first rows, guide words naming the range, Sat indigo / Sun vermilion.
function WeekStrip({ start, end, weekdays }: { start: string; end: string; weekdays: number[] }) {
  const all = listDates(start, end, [0, 1, 2, 3, 4, 5, 6]);
  if (!all.length) return null;
  const lead = (new Date(all[0] + "T00:00:00Z").getUTCDay() + 6) % 7; // blanks before a non-Monday start
  const cells: (string | null)[] = [...Array(lead).fill(null), ...all];
  const shown = cells.slice(0, MAX_WEEKS_SHOWN * 7);
  while (shown.length % 7) shown.push(null); // full rows, so each week's rule spans all seven columns
  const hiddenWeeks = Math.ceil(cells.length / 7) - MAX_WEEKS_SHOWN;

  return (
    <div>
      <p className="mb-2 flex items-baseline justify-between text-sm font-bold">
        <span>{formatDateRange(all[0], all[all.length - 1])}</span>
      </p>
      <div className="grid grid-cols-7 border-t border-ink text-center text-sm" aria-hidden>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className={`py-1 text-xs font-bold ${i === 5 ? "text-indigo" : i === 6 ? "text-vermilion" : "text-ink-soft"}`}>{d}</span>
        ))}
        {shown.map((iso, i) => {
          if (!iso) return <span key={i} className="border-t border-rule" />;
          const dow = new Date(iso + "T00:00:00Z").getUTCDay();
          const on = weekdays.includes(dow);
          const tone = dow === 6 ? "text-indigo" : dow === 0 ? "text-vermilion" : "text-ink";
          return (
            <span key={iso} className={`border-t border-rule py-1.5 ${on ? `font-bold ${tone}` : "text-ink-soft"}`}>
              {Number(iso.slice(8))}
            </span>
          );
        })}
      </div>
      {hiddenWeeks > 0 && <p className="mt-1 text-xs text-ink-soft">+{hiddenWeeks} more {hiddenWeeks === 1 ? "week" : "weeks"}</p>}
    </div>
  );
}

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-vermilion">{msg}</p> : null;
}

type FormState = CreateState & { saved?: number };

/** The schedule setup form. With `edit` it changes a live schedule: no member list (people are edited one by one)
 *  and the time zone is fixed, since answers are stored in it. */
export function CreateForm({ defaults, zones, edit }: {
  defaults: Values; zones: string[];
  edit?: { action: (prev: FormState, form: FormData) => Promise<FormState>; people: number; onDone: () => void; onDirty: () => void };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(edit?.action ?? createSchedule, {});
  const values: Values = state.values ?? defaults;
  const e = state.errors ?? {};
  const v = (k: string) => String(values[k] ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const [snap, setSnap] = useState<Values>(values);

  const read = (f: HTMLFormElement) => {
    const fd = new FormData(f);
    setSnap({ ...Object.fromEntries(fd), weekdays: fd.getAll("weekdays").map(String) } as Values);
  };

  // The server only knows UTC: switch the defaults to the visitor's own zone and local today.
  useEffect(() => {
    const f = formRef.current;
    if (edit || state.values || !f) return;
    const set = (name: string, value: string) => ((f.elements.namedItem(name) as HTMLInputElement).value = value);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zones.includes(tz)) set("timeZone", tz);
    const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    const now = new Date();
    set("startDate", local(now));
    set("endDate", local(new Date(now.getTime() + 13 * 86_400_000)));
    read(f);
  }, [zones, state.values, edit]);

  const onDone = edit?.onDone;
  useEffect(() => { if (state.saved) onDone?.(); }, [state.saved, onDone]);
  // A failed submit: put the keyboard on the first field that needs fixing (its message is announced).
  useEffect(() => {
    if (state.errors) formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [state.errors]);

  // After a submit the form resets to the echoed values; keep the summary in step.
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    setSnap(values);
  }

  const weekdays = (snap.weekdays as string[] | undefined)?.map(Number) ?? [];
  const dates = listDates(String(snap.startDate), String(snap.endDate), weekdays);
  const slots = Math.max(0, ((Number(snap.endHour) - Number(snap.startHour)) * 60) / Number(snap.slotMinutes || 60));
  const people = edit ? edit.people : parseMembers(String(snap.members ?? "")).length;
  const chosen = (d: number) => ((values.weekdays as string[] | undefined) ?? []).includes(String(d));

  return (
    <form ref={formRef} action={action} onChange={(ev) => { read(ev.currentTarget); edit?.onDirty(); }} noValidate
      onSubmit={(ev) => { if (pending) ev.preventDefault(); }}
      className="grid gap-x-10 gap-y-6 md:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="grid content-start gap-5">
        <div>
          <label htmlFor="title" className={labelCls}>Name</label>
          <input id="title" name="title" defaultValue={v("title")} maxLength={100} autoComplete="off"
            placeholder="Project meetings" aria-invalid={!!e.title} aria-describedby="title-err" className={field} />
          <Err id="title-err" msg={e.title} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="startDate" className={labelCls}>From</label>
            <input id="startDate" type="date" name="startDate" defaultValue={v("startDate")}
              aria-invalid={!!e.startDate} aria-describedby="startDate-err" className={field} />
            <Err id="startDate-err" msg={e.startDate} />
          </div>
          <div>
            <label htmlFor="endDate" className={labelCls}>To</label>
            <input id="endDate" type="date" name="endDate" defaultValue={v("endDate")}
              aria-invalid={!!e.endDate} aria-describedby="endDate-err" className={field} />
            <Err id="endDate-err" msg={e.endDate} />
          </div>
        </div>

        <fieldset aria-describedby="weekdays-err">
          <legend className={labelCls}>Days</legend>
          <div className="flex gap-1.5">
            {DAYS.map((d) => (
              <label key={d.v} className="flex-1">
                <input type="checkbox" name="weekdays" value={d.v} defaultChecked={chosen(d.v)} className="peer sr-only" />
                <span aria-hidden className={`block cursor-pointer select-none rounded-full border border-rule bg-sheet py-2.5 text-center text-sm font-bold transition-colors duration-150 peer-checked:border-indigo peer-checked:bg-indigo peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo ${d.v === 0 ? "text-vermilion" : d.v === 6 ? "text-indigo" : "text-ink"}`}>
                  {d.short}
                </span>
                <span className="sr-only">{d.name}</span>
              </label>
            ))}
          </div>
          <Err id="weekdays-err" msg={e.weekdays} />
        </fieldset>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="startHour" className={labelCls}>Start</label>
            <select id="startHour" name="startHour" defaultValue={v("startHour")} className={field}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{formatHour(h * 60)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="endHour" className={labelCls}>End</label>
            <select id="endHour" name="endHour" defaultValue={v("endHour")} aria-invalid={!!e.dayEndMin} aria-describedby="hours-err" className={field}>
              {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h === 24 ? "midnight" : formatHour(h * 60)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="slotMinutes" className={labelCls}>Slot</label>
            <select id="slotMinutes" name="slotMinutes" defaultValue={v("slotMinutes")} aria-invalid={!!e.slotMinutes} aria-describedby="slot-err" className={field}>
              {SLOT_SIZES.map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
        </div>
        <Err id="hours-err" msg={e.dayEndMin} />
        <Err id="slot-err" msg={e.slotMinutes} />

        {edit ? (
          <div>
            <p className={labelCls}>Time zone</p>
            <input type="hidden" name="timeZone" value={v("timeZone")} />
            <p className="text-base">{v("timeZone").replaceAll("_", " ")} <span className="text-sm text-ink-soft">· fixed, since answers are saved in it</span></p>
          </div>
        ) : (
          <div>
            <label htmlFor="timeZone" className={labelCls}>Time zone</label>
            <select id="timeZone" name="timeZone" defaultValue={v("timeZone")} aria-invalid={!!e.timeZone} aria-describedby="timeZone-err" className={field}>
              {zones.map((z) => <option key={z} value={z}>{z.replaceAll("_", " ")}</option>)}
            </select>
            <Err id="timeZone-err" msg={e.timeZone} />
          </div>
        )}

        {!edit && (
          <div>
            <label htmlFor="members" className={labelCls}>People · one per line</label>
            <textarea id="members" name="members" rows={6} defaultValue={v("members")} placeholder={"Alex\nSam\nPriya"}
              aria-invalid={!!e.members} aria-describedby="members-err"
              className={`${field} dot-lines resize-y leading-[1.75rem]`} />
            <Err id="members-err" msg={e.members} />
          </div>
        )}

        <details className="group rounded-[10px] border border-rule bg-sheet px-3.5 open:pb-4">
          <summary className="cursor-pointer list-none py-3 text-sm font-bold text-ink-soft marker:hidden group-open:text-ink">
            More options <span className="font-normal">· deadline, privacy</span>
          </summary>
          <div className="grid gap-5">
            <div>
              <label htmlFor="deadline" className={labelCls}>Respond by (optional)</label>
              <input id="deadline" type="datetime-local" name="deadline" defaultValue={v("deadline")}
                aria-invalid={!!e.deadlineLocal} aria-describedby="deadline-err" className={field} />
              <Err id="deadline-err" msg={e.deadlineLocal} />
            </div>
            <fieldset>
              <legend className={labelCls}>Members see</legend>
              {[["names", "Who is free"], ["counts", "Only how many are free"]].map(([val, text]) => (
                <label key={val} className="flex items-center gap-2.5 py-1.5 text-base">
                  <input type="radio" name="visibility" value={val} defaultChecked={v("visibility") === val} className="size-4" />
                  {text}
                </label>
              ))}
              {edit && defaults.visibility === "counts" && snap.visibility === "names" && (
                <p className="mt-1 text-sm font-medium">Members will see who is free at each time, including people who answered when only counts were shown.</p>
              )}
            </fieldset>
          </div>
        </details>
      </div>

      <aside className="md:sticky md:top-6 md:self-start" aria-live="polite">
        <WeekStrip start={String(snap.startDate)} end={String(snap.endDate)} weekdays={weekdays} />
        <p className="mt-3 border-t border-rule pt-3 text-sm text-ink-soft">
          {dates.length ? (
            <><b className="text-ink">{dates.length}</b> days · <b className="text-ink">{slots > 0 ? slots : "–"}</b> slots a day · <b className="text-ink">{people}</b> {people === 1 ? "person" : "people"}</>
          ) : "Pick dates and days to see the schedule."}
        </p>
        {!edit && <div className="mt-4"><Turnstile resetKey={state} /></div>}
        {state.message && <p role="alert" className="mt-4 text-sm font-medium text-vermilion">{state.message}</p>}
        {/* aria-disabled keeps focus on the button while saving; onSubmit above blocks a second submit. */}
        <button type="submit" aria-disabled={pending}
          className="mt-4 w-full rounded-full bg-indigo px-6 py-4 text-base font-bold text-white transition-colors duration-150 hover:bg-indigo-deep aria-disabled:cursor-wait aria-disabled:opacity-70">
          {edit ? (pending ? "Saving…" : "Save changes") : pending ? "Creating…" : "Create schedule"}
        </button>
      </aside>
    </form>
  );
}
