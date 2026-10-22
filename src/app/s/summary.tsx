import type { Schedule } from "@/lib/supabase";
import { formatDateRange, formatDeadline, formatHours, formatWeekdays, formatZone } from "@/lib/format";

// A ruled list set straight on the page, like a planner's info block.
export function ScheduleSummary({ s, showPeople = true }: { s: Schedule; showPeople?: boolean }) {
  const rows: [string, React.ReactNode][] = [
    ["Dates", <b key="d">{formatDateRange(s.startDate, s.endDate)}</b>],
    ["Days", formatWeekdays(s.weekdays)],
    ["Hours", `${formatHours(s.dayStartMin, s.dayEndMin)} · ${s.slotMinutes} min slots`],
    ["Time zone", formatZone(s.timeZone)],
  ];
  if (s.deadline) rows.push(["Respond by", formatDeadline(s.deadline, s.timeZone)]);
  if (showPeople) rows.push(["People", s.participants.map((p) => p.name).join(", ")]);

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
