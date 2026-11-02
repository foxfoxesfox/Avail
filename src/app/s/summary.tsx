import type { Schedule } from "@/lib/supabase";
import { formatDateRange, formatDeadline, formatHours, formatLength, formatWeekdays, formatZone } from "@/lib/format";

// A ruled list set straight on the page, like a planner's info block.
export function ScheduleSummary({ s, showPeople = true }: { s: Schedule; showPeople?: boolean }) {
  const rows: [string, React.ReactNode][] = [
    ["Dates", <b key="d">{formatDateRange(s.startDate, s.endDate)}</b>],
    ["Days", formatWeekdays(s.weekdays)],
    // On booking pages these are the grid's hours, not the host's free time.
    [s.kind === "booking" ? "Hours shown" : "Hours", `${formatHours(s.dayStartMin, s.dayEndMin)} · ${s.slotMinutes} min slots`],
    ["Time zone", formatZone(s.timeZone)],
  ];
  if (s.kind === "booking") {
    rows.push(["Meetings", formatLength(s.meetingMinutes ?? 0)]);
    rows.push(["Per meeting", s.capacity === 1 ? "One person" : `Up to ${s.capacity} people`]);
    if (s.hostName) rows.push(["Host", s.hostName]);
    if (s.location) rows.push(["Where", <Where key="w" location={s.location} />]);
    else if (s.online) rows.push(["Where", "A link you get once you book"]);
  }
  if (s.deadline) rows.push([s.kind === "booking" ? "Book until" : "Respond by", formatDeadline(s.deadline, s.timeZone)]);
  if (showPeople && s.kind !== "booking") rows.push(["People", s.participants.map((p) => p.name).join(", ")]);

  return (
    <dl className="border-t border-ink text-base">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[7rem_1fr] gap-x-4 border-b border-rule py-2.5">
          <dt className="text-ink-soft">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A booking page's place: a link when it's a web address (opens in a new tab), otherwise plain text. Long values wrap. */
export function Where({ location }: { location: string }) {
  return /^https?:\/\/\S+$/i.test(location) ? (
    <a href={location} target="_blank" rel="noopener noreferrer"
      className="font-medium text-indigo underline underline-offset-4 [overflow-wrap:anywhere] hover:text-indigo-deep">
      {location}<span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : <span className="[overflow-wrap:anywhere]">{location}</span>;
}
