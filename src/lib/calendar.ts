// Calendar output for confirmed sessions: real instants, add-to-calendar links and .ics text (RFC 5545).
import type { Session } from "./supabase";

export type CalendarEvent = { title: string; timeZone: string; session: Session };

// Offset of a zone from UTC at instant t, in ms (positive east of Greenwich).
function offsetMs(t: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(t);
  const p = Object.fromEntries(parts.map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - t;
}

/** The instant a schedule's wall-clock time happens: day + minutes after midnight (1440 = next midnight) in its zone. */
export function toInstant(day: string, minute: number, timeZone: string) {
  const wall = Date.parse(day + "T00:00:00Z") + minute * 60_000;
  // Second pass corrects the guess when it lands on the other side of a daylight-saving change.
  const guess = wall - offsetMs(wall, timeZone);
  return new Date(wall - offsetMs(guess, timeZone));
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, ""); // 20261026T020000Z

function times({ timeZone, session: x }: CalendarEvent) {
  return { start: toInstant(x.day, x.startMin, timeZone), end: toInstant(x.day, x.endMin, timeZone) };
}

const details = ({ session: x }: CalendarEvent) => [x.notes, x.link].filter(Boolean).join("\n\n");

export function googleLink(e: CalendarEvent) {
  const { start, end } = times(e);
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${stamp(start)}/${stamp(end)}`, details: details(e) });
  if (e.session.location) q.set("location", e.session.location);
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function outlookLink(e: CalendarEvent) {
  const { start, end } = times(e);
  const q = new URLSearchParams({
    path: "/calendar/action/compose", rru: "addevent", subject: e.title,
    startdt: start.toISOString(), enddt: end.toISOString(), body: details(e),
  });
  if (e.session.location) q.set("location", e.session.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q}`;
}

const text = (s: string) => s.replace(/[\\;,]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");

// Content lines longer than 75 octets continue on lines that start with a space.
function fold(line: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let n = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (n + b > 75) {
      out.push(cur);
      cur = " ";
      n = 1;
    }
    cur += ch;
    n += b;
  }
  out.push(cur);
  return out.join("\r\n");
}

/** A calendar file. With a name it is a subscription feed that apps re-poll; without, a one-off download. */
export function toICS(events: CalendarEvent[], now: Date, feedName?: string) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Avail//Avail//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  if (feedName) lines.push(`X-WR-CALNAME:${text(feedName)}`, "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H");
  for (const e of events) {
    const { start, end } = times(e);
    const x = e.session;
    lines.push("BEGIN:VEVENT", `UID:${x.id}@avail`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
      `SUMMARY:${text(e.title)}`);
    if (x.location) lines.push(`LOCATION:${text(x.location)}`);
    if (details(e)) lines.push(`DESCRIPTION:${text(details(e))}`);
    if (x.link) lines.push(`URL:${x.link.replace(/[\r\n]/g, "")}`); // URL values aren't escaped, so no line breaks may get in
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
