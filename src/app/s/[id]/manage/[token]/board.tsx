"use client";

import { useState, useTransition } from "react";
import type { Schedule } from "@/lib/supabase";
import { formatDateRange, formatHour, formatHours } from "@/lib/format";
import { slotKey, slotMinutes } from "@/lib/grid";
import { listDates } from "@/lib/schedule-form";
import { rankSessions, type SlotNames } from "@/lib/suggest";
import { GroupGrid, useTotals } from "../../group";
import { SessionList } from "../../../sessions";
import { cancelSession, confirmSession, setKeyMember } from "./actions";

const lengthLabel = (min: number) => (min < 60 ? `${min} min` : `${min / 60} hr`);
const field = "w-full rounded-[10px] border border-rule bg-sheet px-3.5 py-3 text-base text-ink placeholder:text-ink-soft";
const labelCls = "mb-1.5 block text-xs font-bold tracking-[0.06em] text-ink-soft uppercase";

type Pick = { day: string; startMin: number; endMin: number; manual?: boolean };

/** Organizer workspace: key members, ranked times, confirm, and everyone's grid. One shared poll. */
export function Board({ s, token }: { s: Schedule; token: string }) {
  const { data, failed } = useTotals(s.shareId, token);
  const [pending, start] = useTransition();
  const days = listDates(s.startDate, s.endDate, s.weekdays);
  const minutes = slotMinutes(s.dayStartMin, s.dayEndMin, s.slotMinutes);
  const lengths = minutes.map((_, i) => (i + 1) * s.slotMinutes).filter((m) => m <= 240);
  const [length, setLength] = useState(lengths.includes(60) ? 60 : lengths[0]);
  const [picking, setPicking] = useState<Pick | null>(null);

  const pendingNames = new Set(data?.pending ?? []);
  const people = s.participants.map((p) => ({ name: p.name, isKey: p.isKey, replied: !pendingNames.has(p.name) }));
  const slots = new Map<string, SlotNames>((data?.slots ?? []).map(([d, m, , , fn, inn]) => [slotKey(d, m), { free: fn ?? [], ifNeeded: inn ?? [] }]));
  // Skip times that overlap a session already confirmed.
  const ranked = (data ? rankSessions(days, minutes, s.slotMinutes, length / s.slotMinutes, slots, people, 50) : [])
    .filter((r) => r.free.length > 0 && !s.sessions.some((x) => x.day === r.day && x.startMin < r.endMin && r.startMin < x.endMin))
    .slice(0, 5);
  const keys = s.participants.filter((p) => p.isKey);

  return (
    <>
      <SessionList s={s} onCancel={(id) => cancelSession(s.shareId, token, id)} />

      <section className="mt-8">
        <h2 className="text-lg font-bold">Decide</h2>

        <fieldset className="mt-3">
          <legend className={labelCls}>Key members · must attend</legend>
          <div className="flex flex-wrap gap-1.5">
            {s.participants.map((p) => (
              <button key={p.id} type="button" aria-pressed={p.isKey} disabled={pending}
                onClick={() => start(() => setKeyMember(s.shareId, token, p.id, !p.isKey))}
                className={`rounded-full border px-3.5 py-2 text-sm font-bold transition-colors duration-150 disabled:opacity-70 ${p.isKey ? "border-indigo bg-indigo text-white" : "border-rule bg-sheet text-ink hover:border-indigo"}`}>
                {p.name}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <label htmlFor="length" className={labelCls}>Session length</label>
            <select id="length" value={length} onChange={(e) => setLength(Number(e.target.value))} className={`${field} w-auto pr-8`}>
              {lengths.map((m) => <option key={m} value={m}>{lengthLabel(m)}</option>)}
            </select>
          </div>
          <button type="button" aria-expanded={!!picking?.manual}
            onClick={() => setPicking(picking?.manual ? null : { day: days[0], startMin: minutes[0], endMin: Math.min(minutes[0] + length, s.dayEndMin), manual: true })}
            className="rounded-full bg-indigo-wash px-4 py-2.5 text-sm font-bold text-indigo hover:bg-indigo-wash-hover">
            Pick a time yourself
          </button>
        </div>

        {picking?.manual && (
          <div className="mt-4 border-t border-ink pt-3">
            <h3 className="text-sm font-bold">Pick a time yourself</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="pickDay" className={labelCls}>Day</label>
                <select id="pickDay" autoFocus value={picking.day} onChange={(e) => setPicking({ ...picking, day: e.target.value })} className={field}>
                  {days.map((d) => <option key={d} value={d}>{formatDateRange(d, d)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pickStart" className={labelCls}>Start</label>
                <select id="pickStart" value={picking.startMin}
                  onChange={(e) => { const st = Number(e.target.value); setPicking({ ...picking, startMin: st, endMin: Math.min(st + (picking.endMin - picking.startMin), s.dayEndMin) }); }}
                  className={field}>
                  {minutes.map((m) => <option key={m} value={m}>{formatHour(m)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pickEnd" className={labelCls}>End</label>
                <select id="pickEnd" value={picking.endMin} onChange={(e) => setPicking({ ...picking, endMin: Number(e.target.value) })} className={field}>
                  {minutes.map((m) => m + s.slotMinutes).filter((m) => m > picking.startMin).map((m) => (
                    <option key={m} value={m}>{m === 1440 ? "midnight" : formatHour(m)}</option>
                  ))}
                </select>
              </div>
            </div>
            <ConfirmForm s={s} token={token} pick={picking} onDone={() => setPicking(null)} />
          </div>
        )}
        <h3 className="mt-6 text-sm font-bold">Best times</h3>
        {!data ? (
          <p className="mt-2 text-sm text-ink-soft">{failed ? "Couldn't load replies. Check your connection." : "Loading replies…"}</p>
        ) : ranked.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No times yet. Suggestions appear once people mark when they&apos;re free.</p>
        ) : (
          <ol className="mt-2 border-t border-ink">
            {ranked.map((r, i) => {
              const key = `${r.day}@${r.startMin}`;
              const open = !!picking && !picking.manual && picking.day === r.day && picking.startMin === r.startMin && picking.endMin === r.endMin;
              return (
                <li key={key} className="border-b border-rule py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 text-sm">
                      <p className="text-base font-bold">
                        <span className="mr-2 text-ink-soft tabular-nums">{i + 1}.</span>
                        {formatDateRange(r.day, r.day)} · {formatHours(r.startMin, r.endMin)}
                      </p>
                      <p className="mt-0.5">
                        <b>{r.free.length}</b> of {people.length} free{r.ifNeeded.length > 0 && <> · <b>{r.ifNeeded.length}</b> if needed</>}
                      </p>
                      <Missing label="If needed" names={r.ifNeeded} />
                      <Missing label="Busy" names={r.busy} />
                      <Missing label="No reply" names={r.noReply} />
                      {keys.length > 0 && (
                        r.keyMissing.length
                          ? <p className="mt-1 font-medium text-ink">Key member missing: <b>{r.keyMissing.join(", ")}</b></p>
                          : <p className="mt-1 text-ink-soft">All key members can make it.</p>
                      )}
                    </div>
                    <button type="button" aria-expanded={open} aria-label={`Confirm ${formatDateRange(r.day, r.day)}, ${formatHours(r.startMin, r.endMin)}`}
                      onClick={() => setPicking(open ? null : r)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${i === 0 ? "bg-indigo text-white hover:bg-indigo-deep" : "bg-indigo-wash text-indigo hover:bg-indigo-wash-hover"}`}>
                      {open ? "Close" : "Confirm"}
                    </button>
                  </div>
                  {open && picking && <ConfirmForm s={s} token={token} pick={picking} onDone={() => setPicking(null)} />}
                </li>
              );
            })}
          </ol>
        )}

      </section>

      <GroupGrid s={s} data={data} failed={failed} />
    </>
  );
}

function Missing({ label, names }: { label: string; names: string[] }) {
  return names.length ? <p className="mt-0.5 text-ink-soft">{label}: {names.join(", ")}</p> : null;
}

function ConfirmForm({ s, token, pick, onDone }: { s: Schedule; token: string; pick: Pick; onDone: () => void }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form className="mt-3 grid gap-3 border-t border-rule pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await confirmSession(s.shareId, token, {
            ...pick, location: String(f.get("location")), link: String(f.get("link")), notes: String(f.get("notes")),
          });
          if (r.error) setError(r.error);
          else onDone();
        });
      }}>
      <p className="text-sm font-bold">Confirm {formatDateRange(pick.day, pick.day)} · {formatHours(pick.startMin, pick.endMin)}</p>
      <div>
        <label htmlFor="location" className={labelCls}>Location (optional)</label>
        <input id="location" name="location" maxLength={200} placeholder="Library room 3" className={field} />
      </div>
      <div>
        <label htmlFor="link" className={labelCls}>Video link (optional)</label>
        <input id="link" name="link" type="url" maxLength={500} placeholder="https://" className={field} />
      </div>
      <div>
        <label htmlFor="notes" className={labelCls}>Notes (optional)</label>
        <textarea id="notes" name="notes" rows={2} maxLength={1000} className={field} />
      </div>
      {error && <p role="alert" className="text-sm font-medium text-vermilion">{error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="rounded-full bg-indigo px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-deep disabled:opacity-70">
          {pending ? "Confirming…" : "Confirm session"}
        </button>
        <button type="button" onClick={onDone} className="rounded-full bg-indigo-wash px-5 py-2.5 text-sm font-bold text-indigo hover:bg-indigo-wash-hover">
          Cancel
        </button>
      </div>
    </form>
  );
}
