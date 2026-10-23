// Availability grid helpers. Pure (no imports) so they run under `node --test`.

export const FREE = 2;
export const IF_NEEDED = 1;
export type State = 0 | 1 | 2; // 0 = busy (not stored)

/** "2026-10-26@600" → one slot: a calendar day plus minutes after midnight. */
export const slotKey = (day: string, minute: number) => `${day}@${minute}`;

export function slotMinutes(dayStartMin: number, dayEndMin: number, step: number): number[] {
  const out: number[] = [];
  for (let m = dayStartMin; m < dayEndMin; m += step) out.push(m);
  return out;
}

/** Splits dates (YYYY-MM-DD, ascending) into Monday-to-Sunday weeks. */
export function groupWeeks(dates: string[]): string[][] {
  const weeks: string[][] = [];
  let key = "";
  for (const d of dates) {
    const t = Date.parse(d + "T00:00:00Z");
    const monday = new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10);
    if (monday !== key) { weeks.push([]); key = monday; }
    weeks[weeks.length - 1].push(d);
  }
  return weeks;
}

/** Fixed columns for one week: every scheduled weekday (Monday first), inactive when outside the date range. */
export function weekColumns(weekDates: string[], weekdays: number[], start: string, end: string) {
  const t = Date.parse(weekDates[0] + "T00:00:00Z");
  const monday = t - ((new Date(t).getUTCDay() + 6) % 7) * 86_400_000;
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => weekdays.includes(d)).map((dow) => {
    const date = new Date(monday + ((dow + 6) % 7) * 86_400_000).toISOString().slice(0, 10);
    return { date, active: date >= start && date <= end };
  });
}

/** Map of slotKey → state into the three parallel arrays the database function takes. */
export function toRows(answers: Map<string, State>) {
  const days: string[] = [], minutes: number[] = [], states: number[] = [];
  for (const [k, s] of answers) {
    if (!s) continue;
    const [d, m] = k.split("@");
    days.push(d); minutes.push(Number(m)); states.push(s);
  }
  return { days, minutes, states };
}

export function fromRows(rows: [string, number, number][]): Map<string, State> {
  return new Map(rows.map(([d, m, s]) => [slotKey(d, m), s as State]));
}
