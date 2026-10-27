"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import type { Schedule } from "@/lib/supabase";
import { formatDateRange, formatDeadline, formatHour } from "@/lib/format";
import { FREE, IF_NEEDED, fromRows, groupWeeks, slotKey, slotMinutes, toRows, weekColumns, type State } from "@/lib/grid";
import { listDates } from "@/lib/schedule-form";
import { claimName, feedToken, loadMine, saveMine, setPin, unclaimName } from "./actions";
import { inSession, sessionOutline } from "../sessions";
import { CopyLink } from "../copy-link";
import { Confirm } from "../confirm";

type Me = { pid: string; pin: string | null };
/** Who is signed in, as far as this schedule cares: whether anyone is, and the name they locked here. */
export type Account = { signedIn: boolean; mine: string | null };

// The chosen name (and PIN) is remembered on this device only.
// shortcut: PIN sits in localStorage on the member's own device; move to accounts in slice 7.
const storeKey = (shareId: string) => `avail:${shareId}`;
const listen = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
function remember(shareId: string, me: Me | null) {
  if (me) localStorage.setItem(storeKey(shareId), JSON.stringify(me));
  else localStorage.removeItem(storeKey(shareId));
  window.dispatchEvent(new StorageEvent("storage"));
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const dayOf = (iso: string) => new Date(iso + "T00:00:00Z");

const MODES: { state: State; label: string }[] = [
  { state: FREE, label: "Free" },
  { state: IF_NEEDED, label: "If needed" },
  { state: 0, label: "Clear" },
];
const STATE_WORD = ["not marked", "if needed", "free"];

export function Availability({ s, account }: { s: Schedule; account: Account }) {
  const raw = useSyncExternalStore(listen, () => localStorage.getItem(storeKey(s.shareId)), () => null);
  const [left, setLeft] = useState(false);
  // A name locked to this account opens on any device; "Switch person" still lets them pick another.
  const me: Me | null = raw ? JSON.parse(raw) : account.mine && !left ? { pid: account.mine, pin: null } : null;
  const person = me && s.participants.find((p) => p.id === me.pid);
  const leave = () => { setLeft(true); remember(s.shareId, null); };

  if (!me || !person) return <NamePicker s={s} account={account} onPick={(m) => remember(s.shareId, m)} />;
  return <Grid key={me.pid} s={s} me={me} name={person.name} hadPin={person.hasPin} account={account}
    linked={person.claimed && account.mine === person.id} onLeave={leave} />;
}

const signInHref = (shareId: string) => `/sign-in?next=${encodeURIComponent(`/s/${shareId}`)}`;

function NamePicker({ s, account, onPick }: { s: Schedule; account: Account; onPick: (me: Me) => void }) {
  const [asking, setAsking] = useState<{ id: string; name: string } | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function choose(id: string, pin: string | null) {
    const p = s.participants.find((x) => x.id === id);
    setLocked(p?.claimed && account.mine !== id ? p.name : null);
    if (p?.claimed && account.mine !== id) return;
    setBusy(true);
    setError("");
    const rows = await loadMine(s.shareId, id, pin).catch(() => undefined);
    setBusy(false);
    if (rows === undefined) setError("Couldn't reach the server. Check your connection and try again.");
    else if (rows === "locked") setError("Too many wrong PINs for this name. Try again in 15 minutes.");
    // No rows without a PIN means this name has one (the page may predate it being set): ask for it.
    else if (rows === null && !pin) setAsking(s.participants.find((p) => p.id === id) ?? null);
    else if (rows === null) setError("That PIN doesn't match.");
    else onPick({ pid: id, pin });
  }

  if (asking) {
    return (
      <form className="mt-6 max-w-sm" onSubmit={(e) => { e.preventDefault(); choose(asking.id, String(new FormData(e.currentTarget).get("pin"))); }}>
        <h2 className="text-lg font-bold">Enter your PIN, {asking.name}</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">You set a PIN so only you can change your times.</p>
        <label htmlFor="pin" className="mb-1.5 block text-xs font-bold tracking-[0.06em] text-ink-soft uppercase">PIN</label>
        <input id="pin" name="pin" inputMode="numeric" pattern="\d{4,8}" autoComplete="off" required autoFocus maxLength={8}
          aria-invalid={!!error} aria-describedby="pin-err"
          className="w-full rounded-[10px] border border-rule bg-sheet px-3.5 py-3 text-base tracking-[0.3em] aria-[invalid=true]:border-vermilion" />
        {error && <p id="pin-err" className="mt-1.5 text-sm font-medium text-vermilion">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button disabled={busy} className="rounded-full bg-indigo px-6 py-3 text-sm font-bold text-white hover:bg-indigo-deep disabled:opacity-70">
            {busy ? "Checking…" : "Continue"}
          </button>
          <button type="button" onClick={() => { setAsking(null); setError(""); }} className="rounded-full bg-indigo-wash px-6 py-3 text-sm font-bold text-indigo hover:bg-indigo-wash-hover">
            Back
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold">Who are you?</h2>
      <p className="mt-1 mb-4 text-sm text-ink-soft">Pick your name to mark when you&apos;re free.</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {s.participants.map((p) => (
          <li key={p.id}>
            <button type="button" disabled={busy} onClick={() => (p.hasPin && !p.claimed ? setAsking(p) : choose(p.id, null))}
              className="w-full rounded-full border border-rule bg-sheet px-4 py-3 text-left text-base font-medium hover:border-indigo hover:text-indigo disabled:opacity-70">
              {p.name}
              {p.claimed && p.id !== account.mine && <span className="font-normal text-ink-soft"> · linked</span>}
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-vermilion">{error}</p>}
      {locked && (
        <p role="alert" className="mt-3 text-sm font-medium">
          {locked} is linked to an account, so only they can change it. If that&apos;s you,{" "}
          <a href={signInHref(s.shareId)} className="text-indigo underline underline-offset-4">
            {account.signedIn ? "sign in with that account" : "sign in"}
          </a>.
        </p>
      )}
      <p className="mt-4 text-sm text-ink-soft">Not listed? Ask the organizer to add you.</p>
    </section>
  );
}

type SaveState = "idle" | "saving" | "saved" | "error";

function Grid({ s, me, name, hadPin, account, linked, onLeave }: {
  s: Schedule; me: Me; name: string; hadPin: boolean; account: Account; linked: boolean; onLeave: () => void;
}) {
  const weeks = groupWeeks(listDates(s.startDate, s.endDate, s.weekdays));
  const minutes = slotMinutes(s.dayStartMin, s.dayEndMin, s.slotMinutes);
  const [answers, setAnswers] = useState<Map<string, State> | null>(null);
  const [week, setWeek] = useState(0);
  const [mode, setMode] = useState<State>(FREE);
  const [save, setSave] = useState<SaveState>("idle");
  const [hasPin, setHasPin] = useState(hadPin);
  const paint = useRef<State | null>(null);
  const last = useRef<string | null>(null); // where the current drag started
  const dirty = useRef(false);

  useEffect(() => {
    loadMine(s.shareId, me.pid, me.pin).then(
      // Wrong or locked PIN: back to the name list, which explains which.
      (rows) => (Array.isArray(rows) ? setAnswers(fromRows(rows)) : onLeave()),
      () => setSave("error"));
  }, [s.shareId, me.pid, me.pin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave shortly after the last change.
  useEffect(() => {
    if (!answers || !dirty.current) return;
    const t = setTimeout(async () => {
      setSave("saving");
      const r = await saveMine(s.shareId, me.pid, me.pin, toRows(answers)).catch(() => ({ ok: false }));
      setSave(r.ok ? "saved" : "error");
    }, 700);
    return () => clearTimeout(t);
  }, [answers, s.shareId, me.pid, me.pin]);

  function set(key: string, state: State) {
    if (s.closed) return; // answers closed: the grid is read-only
    setAnswers((prev) => {
      if (!prev || (prev.get(key) ?? 0) === state) return prev;
      dirty.current = true;
      const next = new Map(prev);
      next.set(key, state);
      return next;
    });
  }

  const keyAt = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-slot]")?.dataset.slot;

  if (!answers) return <div className="dot-grid mt-6 h-80 rounded-[10px] border border-rule" aria-busy="true" />;

  const cols = weeks[week] ? weekColumns(weeks[week], s.weekdays, s.startDate, s.endDate) : [];
  const days = cols.filter((c) => c.active).map((c) => c.date);
  // Row heights are multiples of the 14px dot pitch, so the dots register to the ruling (and stay ≥ 24px to tap).
  const rowH = s.slotMinutes === 60 ? "h-[42px]" : "h-7";
  const showLabel = (m: number) => s.slotMinutes === 60 || m % 60 === 0;
  const tally = (st: State) => days.reduce((n, d) => n + minutes.filter((m) => answers.get(slotKey(d, m)) === st).length, 0);

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-lg font-bold">Your times, {name}</h2>
        <button type="button" onClick={onLeave} aria-label={`Not ${name}? Switch person`}
          className="rounded-full bg-indigo-wash px-3.5 py-1.5 text-sm font-bold text-indigo hover:bg-indigo-wash-hover">
          Switch person
        </button>
      </div>

      {s.closed ? (
        <p className="mt-4 border-t border-ink pt-3 text-sm font-medium">
          Answers are closed{s.deadline ? ` since ${formatDeadline(s.deadline, s.timeZone)}` : ""}. These are your saved times; ask the organizer to reopen if you need to change them.
        </p>
      ) : (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div role="radiogroup" aria-label="Paint with" className="flex gap-1.5">
          {MODES.map((m) => {
            const on = mode === m.state;
            return (
              <button key={m.label} type="button" role="radio" aria-checked={on} onClick={() => setMode(m.state)}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition-colors duration-150 ${on ? "border-indigo bg-indigo text-white" : "border-rule bg-sheet text-ink"}`}>
                <span aria-hidden className={`size-3 rounded-sm border ${on ? "border-white" : "border-indigo"} ${m.state === FREE ? (on ? "bg-white" : "bg-indigo") : m.state === IF_NEEDED ? "if-needed" : "bg-sheet"}`} />
                {m.label}
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className={`text-sm ${save === "error" ? "font-medium text-vermilion" : "text-ink-soft"}`}>
          {save === "saving" ? "Saving…" : save === "saved" ? "Saved" : save === "error" ? "Not saved" : ""}
        </p>
      </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <WeekButton dir="prev" disabled={week === 0} onClick={() => setWeek(week - 1)} />
        <div className="text-center" aria-live="polite">
          <p className="text-sm font-bold">{days.length ? formatDateRange(days[0], days[days.length - 1]) : ""}</p>
          <p className="text-xs text-ink-soft">
            <b className="text-ink">{tally(FREE)}</b> free · <b className="text-ink">{tally(IF_NEEDED)}</b> if needed
            {weeks.length > 1 && <> · week {week + 1} of {weeks.length}</>}
          </p>
        </div>
        <WeekButton dir="next" disabled={week >= weeks.length - 1} onClick={() => setWeek(week + 1)} />
      </div>

      <div
        className={`mt-3 select-none ${s.closed ? "" : "touch-none"}`}
        onPointerDown={(e) => {
          const k = keyAt(e.clientX, e.clientY);
          if (!k) return;
          (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
          // Starting on a cell that already has this state erases instead.
          paint.current = (answers.get(k) ?? 0) === mode ? 0 : mode;
          last.current = k;
          set(k, paint.current);
        }}
        onPointerMove={(e) => {
          if (paint.current === null) return;
          const k = keyAt(e.clientX, e.clientY);
          if (!k) return;
          // Paint the rectangle from where the drag started, so fast or diagonal drags never skip cells.
          const [d1, m1] = (last.current ?? k).split("@");
          const [d2, m2] = k.split("@");
          const [a, b] = [days.indexOf(d1), days.indexOf(d2)].sort((x, y) => x - y);
          const [lo, hi] = [Number(m1), Number(m2)].sort((x, y) => x - y);
          for (const d of days.slice(a, b + 1)) for (const mm of minutes) if (mm >= lo && mm <= hi) set(slotKey(d, mm), paint.current);
        }}
        onPointerUp={() => (paint.current = null)}
        onPointerLeave={() => (paint.current = null)}
      >
        <table className="w-full table-fixed border-collapse">
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
                <th scope="row" className="w-14 pr-2 text-right align-top text-xs font-medium text-ink-soft">
                  {showLabel(m) ? formatHour(m) : ""}
                </th>
                {cols.map(({ date, active }) => {
                  const k = slotKey(date, m);
                  if (!active) return <td key={k} className={`border-l border-rule bg-paper ${rowH}`} />;
                  const st = answers.get(k) ?? 0;
                  return (
                    <td key={k} className="border-l border-rule p-0">
                      <button type="button" data-slot={k} aria-disabled={s.closed || undefined}
                        aria-label={`${DAY_NAMES[dayOf(date).getUTCDay()]} ${dayOf(date).getUTCDate()}, ${formatHour(m)}: ${STATE_WORD[st]}${inSession(s.sessions, date, m) ? ", confirmed session" : ""}`}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(k, st === mode ? 0 : mode); } }}
                        className={`block w-full ${rowH} ${st === FREE ? "bg-indigo" : st === IF_NEEDED ? "if-needed" : "dot-grid"}`}
                        style={{ boxShadow: sessionOutline(s.sessions, date, m, s.slotMinutes) }} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        {s.closed ? "" : "Tap or drag to paint. Starting on a painted slot clears it. "}Unpainted means busy. Times in {s.timeZone.replaceAll("_", " ")}.
      </p>

      <div className="mt-6 grid gap-3">
        {/* Persistent live region: linking swaps the offer for the "Linked" line, and screen readers hear it. */}
        <div aria-live="polite" className="grid gap-3">
        {linked ? <Linked s={s} me={me} />
          : account.signedIn && !account.mine ? <ClaimOffer s={s} me={me} name={name} />
          : account.signedIn ? (
            <>
              <p className="text-sm text-ink-soft">Your account is linked to another name on this schedule, so this one can&apos;t be linked too.</p>
              {!hasPin && <PinOffer s={s} me={me} onSet={(pin) => { setHasPin(true); remember(s.shareId, { ...me, pin }); }} />}
            </>
          )
          : (
            <>
              {!hasPin && <PinOffer s={s} me={me} onSet={(pin) => { setHasPin(true); remember(s.shareId, { ...me, pin }); }} />}
              <p className="text-sm text-ink-soft">
                Or <a href={signInHref(s.shareId)} className="font-medium text-indigo underline underline-offset-4">sign in</a> to link this name to your account and change it from any device.
              </p>
            </>
          )}
        </div>
        <CalendarFeed s={s} me={me} />
      </div>
    </section>
  );
}

// Authored arrow, one stroke weight, so the week buttons don't rely on font glyphs.
export function WeekButton({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={dir === "prev" ? "Previous week" : "Next week"}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-wash text-indigo hover:bg-indigo-wash-hover disabled:opacity-40">
      <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {dir === "prev" ? <path d="M13 8H3m4-4L3 8l4 4" /> : <path d="M3 8h10m-4-4 4 4-4 4" />}
      </svg>
    </button>
  );
}

// Signed in, name not linked yet: lock it to the account (replaces the PIN).
function ClaimOffer({ s, me, name }: { s: Schedule; me: Me; name: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <details className="rounded-[10px] border border-rule bg-sheet px-3.5 open:pb-4">
      <summary className="cursor-pointer list-none py-3 text-sm font-bold text-ink-soft">
        Link to your account <span className="font-normal">· change your times from any device, no PIN</span>
      </summary>
      <p className="text-sm text-ink-soft">Only you will be able to change {name}&apos;s times after this.</p>
      <button type="button" disabled={busy} onClick={async () => {
        setBusy(true);
        const ok = await claimName(s.shareId, me.pid, me.pin).catch(() => false);
        setBusy(false);
        if (!ok) setError("Couldn't link this name. Reload the page and try again.");
      }} className="mt-3 rounded-full bg-indigo px-5 py-3 text-sm font-bold text-white hover:bg-indigo-deep disabled:opacity-60">
        {busy ? "Linking…" : `Link ${name}`}
      </button>
      {error && <p role="alert" className="mt-1.5 text-sm font-medium text-vermilion">{error}</p>}
    </details>
  );
}

function Linked({ s, me }: { s: Schedule; me: Me }) {
  const [busy, setBusy] = useState(false);
  return (
    <p className="text-sm text-ink-soft">
      Linked to your account, so only you can change these times.{" "}
      <button type="button" disabled={busy} onClick={async () => {
        setBusy(true);
        // Keep the name on this device, so unlinking doesn't send them back to the name list.
        if (await unclaimName(s.shareId, me.pid).catch(() => false)) remember(s.shareId, me);
        setBusy(false);
      }}
        className="-my-1.5 inline-block py-1.5 font-medium text-indigo underline underline-offset-4 disabled:opacity-60">
        {busy ? "Unlinking…" : "Unlink"}
      </button>
    </p>
  );
}

function PinOffer({ s, me, onSet }: { s: Schedule; me: Me; onSet: (pin: string) => void }) {
  const [error, setError] = useState("");
  return (
    <details className="rounded-[10px] border border-rule bg-sheet px-3.5 open:pb-4">
      <summary className="cursor-pointer list-none py-3 text-sm font-bold text-ink-soft">
        Add a PIN <span className="font-normal">· so only you can change your times</span>
      </summary>
      <form className="flex gap-2" onSubmit={async (e) => {
        e.preventDefault();
        const pin = String(new FormData(e.currentTarget).get("newPin"));
        if (!/^\d{4,8}$/.test(pin)) return setError("Use 4 to 8 digits.");
        const ok = await setPin(s.shareId, me.pid, pin).catch(() => false);
        if (ok) onSet(pin);
        else setError("Couldn't set the PIN. Try again.");
      }}>
        <label htmlFor="newPin" className="sr-only">New PIN</label>
        <input id="newPin" name="newPin" inputMode="numeric" maxLength={8} autoComplete="off" placeholder="4–8 digits"
          aria-invalid={!!error} aria-describedby="newPin-err"
          className="min-w-0 flex-1 rounded-[10px] border border-rule bg-sheet px-3.5 py-3 text-base aria-[invalid=true]:border-vermilion" />
        <button className="shrink-0 rounded-full bg-indigo px-5 text-sm font-bold text-white hover:bg-indigo-deep">Set PIN</button>
      </form>
      {error && <p id="newPin-err" className="mt-1.5 text-sm font-medium text-vermilion">{error}</p>}
    </details>
  );
}

const quietBtn = "rounded-full bg-indigo-wash px-5 py-3 text-center text-sm font-bold text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover";
const textBtn = "font-medium text-indigo underline underline-offset-4";

// Which subscribe options can work here: webcal:// opens Apple Calendar or desktop Outlook (Android has no handler),
// and Google Calendar only adds feeds by URL on its website, not in its phone apps.
function device() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return "desktop";
}

const GOOGLE_HOW = "add it in Google Calendar on a computer (Other calendars, then From URL); it syncs to your phone.";

// The member's private subscription link. Fetched on first open so tokens are only made for people who want one.
function CalendarFeed({ s, me }: { s: Schedule; me: Me }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState<"" | "reset" | "resetFailed">("");
  const panel = useRef<HTMLDetailsElement>(null);
  const resetBtn = useRef<HTMLButtonElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  // "use your calendar feed" under Confirmed links here: open the panel and bring it into view.
  useEffect(() => {
    const onHash = () => {
      if (location.hash !== "#calendar-feed" || !panel.current) return;
      panel.current.open = true;
      panel.current.scrollIntoView({ block: "start" });
      panel.current.querySelector("summary")?.focus();
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  async function load(reset: boolean) {
    setBusy(true);
    const t = await feedToken(s.shareId, me.pid, me.pin, reset).catch(() => null);
    setBusy(false);
    if (!reset) {
      flushSync(() => { if (t) setToken(t); setFailed(!t); });
      // The panel just grew; when it was opened from the link, keep all of it on screen.
      if (location.hash === "#calendar-feed") panel.current?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (t) setToken(t);
    flushSync(() => { setAsking(false); setNotice(t ? "reset" : "resetFailed"); });
    noticeRef.current?.focus();
  }

  function keep() {
    flushSync(() => setAsking(false));
    resetBtn.current?.focus();
  }

  const path = token ? `/cal/${token}.ics` : "";
  const webcal = token ? `webcal://${window.location.host}${path}` : "";
  const on = token ? device() : "desktop";
  return (
    <details id="calendar-feed" ref={panel} className="scroll-mt-6 rounded-[10px] border border-rule bg-sheet px-3.5 open:pb-4"
      onToggle={(e) => { if (e.currentTarget.open && !token && !busy) load(false); }}>
      <summary className="cursor-pointer list-none py-3 text-sm font-bold text-ink-soft">
        Calendar feed <span className="font-normal">· confirmed sessions show up in your calendar</span>
      </summary>
      {!token ? (
        failed ? (
          <p role="alert" className="text-sm font-medium text-vermilion">
            Couldn&apos;t get your feed link.{" "}
            <button type="button" onClick={() => load(false)} className={textBtn}>Try again</button>
          </p>
        ) : <p className="text-sm text-ink-soft">Getting your link…</p>
      ) : (
        <div className="grid gap-3 text-sm">
          <p className="text-ink-soft">Confirmed sessions appear in your calendar, and cancelled ones disappear, on their own.</p>
          {on === "desktop" && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <a href={webcal} className={quietBtn}>Apple Calendar / Outlook</a>
                <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noopener noreferrer" className={quietBtn}>
                  Google Calendar<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
              <p className="text-ink-soft">Google Calendar can take up to a day to show changes.</p>
            </>
          )}
          {on === "ios" && (
            <>
              <a href={webcal} className={quietBtn}>Add to Apple Calendar</a>
              <p className="text-ink-soft">Use Google Calendar? Copy the link below, then {GOOGLE_HOW}</p>
            </>
          )}
          {on === "android" && <p className="text-ink-soft">Copy the link, then {GOOGLE_HOW}</p>}
          <div className={on === "android" ? "" : "border-t border-rule pt-3"}>
            <CopyLink path={path} label="Your private calendar feed link" action="Copy feed link" quiet={on !== "android"} />
          </div>
          {notice === "reset" && (
            <p ref={noticeRef} tabIndex={-1} role="status" className="font-medium">New link ready. The old one no longer works, so subscribe again with this one.</p>
          )}
          {notice === "resetFailed" && (
            <p ref={noticeRef} tabIndex={-1} role="alert" className="font-medium text-vermilion">
              Couldn&apos;t reset the link, so the old one still works.{" "}
              <button type="button" disabled={busy} onClick={() => load(true)} className={textBtn}>{busy ? "Resetting…" : "Try again"}</button>
            </p>
          )}
          {asking ? (
            <Confirm busy={busy} onYes={() => load(true)} onKeep={keep}
              question="Reset the link? Calendars using the old one stop updating until you subscribe again."
              yes="Yes, reset" busyYes="Resetting…" />
          ) : notice !== "resetFailed" && (
            <p className="text-ink-soft">
              The link is private to you.{" "}
              <button type="button" ref={resetBtn} onClick={() => { setNotice(""); setAsking(true); }} className={`${textBtn} -my-1.5 inline-block py-1.5`}>Reset it</button>
              {" "}if it&apos;s shared by mistake.
            </p>
          )}
        </div>
      )}
    </details>
  );
}
