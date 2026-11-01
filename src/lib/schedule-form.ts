// Validates the "create a schedule" form. Pure (no imports) so it runs under `node --test`.
// The database re-checks every rule; this exists to give field-level messages.

export const SLOT_SIZES = [15, 30, 60] as const;
export const MAX_MEMBERS = 50;
export const MAX_DAYS = 183;

export type ScheduleInput = {
  kind: "dates" | "booking"; // find a time with a group, or a page where people book the host
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  weekdays: number[]; // 0 = Sunday … 6 = Saturday
  dayStartMin: number;
  dayEndMin: number;
  slotMinutes: number;
  timeZone: string;
  deadlineLocal: string | null; // YYYY-MM-DDTHH:MM, in timeZone
  showNames: boolean;
  members: string[];
  meetingMinutes: number | null; // booking pages: length of each meeting, a whole number of slots
  capacity: number | null; // booking pages: people per meeting (1 = one-to-one)
};

export type Field = keyof ScheduleInput;
export type FormResult =
  | { ok: true; value: ScheduleInput }
  | { ok: false; errors: Partial<Record<Field, string>> };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function toDay(s: string): number | null {
  if (!DATE.test(s)) return null;
  const t = Date.parse(s + "T00:00:00Z");
  // Rejects impossible dates such as 2026-02-30, which Date.parse rolls over.
  return Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== s ? null : t / 86_400_000;
}

/** Dates (YYYY-MM-DD) in [start, end] that fall on one of the weekdays; [] if the range is invalid or over MAX_DAYS. */
export function listDates(start: string, end: string, weekdays: number[]): string[] {
  const a = toDay(start);
  const b = toDay(end);
  if (a === null || b === null || b < a || b - a > MAX_DAYS) return [];
  const out: string[] = [];
  for (let d = a; d <= b; d++) if (weekdays.includes((d + 4) % 7)) out.push(new Date(d * 86_400_000).toISOString().slice(0, 10));
  return out;
}

export function parseMembers(text: string): string[] {
  return text.split(/\r?\n|,/).map((s) => s.trim().replace(/\s+/g, " ")).filter(Boolean);
}

/** Editing a live schedule skips the member list: people are edited one by one instead. */
export function parseScheduleForm(
  get: (name: string) => string,
  getAll: (name: string) => string[],
  validTimeZones: ReadonlySet<string>,
  { edit = false }: { edit?: boolean } = {},
): FormResult {
  const errors: Partial<Record<Field, string>> = {};
  const kind = get("kind") === "booking" ? "booking" : "dates";
  const booking = kind === "booking";

  const title = get("title").trim();
  if (!title) errors.title = "Give the schedule a name.";
  else if (title.length > 100) errors.title = "Keep the name under 100 characters.";

  const startDate = get("startDate");
  const endDate = get("endDate");
  const start = toDay(startDate);
  const end = toDay(endDate);
  if (start === null) errors.startDate = "Pick a start date.";
  if (end === null) errors.endDate = "Pick an end date.";
  else if (start !== null && end < start) errors.endDate = "End date is before the start date.";
  else if (start !== null && end - start > MAX_DAYS) errors.endDate = `Keep the range under ${MAX_DAYS} days.`;

  const weekdays = [...new Set(getAll("weekdays").map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  if (!weekdays.length) errors.weekdays = "Choose at least one day.";
  else if (start !== null && end !== null && !errors.endDate) {
    let hit = false;
    // 1970-01-01 was a Thursday (4).
    for (let d = start; d <= end && !hit; d++) hit = weekdays.includes((d + 4) % 7);
    if (!hit) errors.weekdays = "None of these days fall inside the date range.";
  }

  const dayStartMin = Number(get("startHour")) * 60;
  const dayEndMin = Number(get("endHour")) * 60;
  if (!Number.isInteger(dayStartMin) || !Number.isInteger(dayEndMin) || dayStartMin < 0 || dayEndMin > 1440 || dayEndMin <= dayStartMin)
    errors.dayEndMin = "End time must be after start time.";

  const slotMinutes = Number(get("slotMinutes"));
  if (!(SLOT_SIZES as readonly number[]).includes(slotMinutes)) errors.slotMinutes = "Choose 15, 30 or 60 minutes.";

  const timeZone = get("timeZone");
  if (!validTimeZones.has(timeZone)) errors.timeZone = "Choose a time zone from the list.";

  const deadlineRaw = get("deadline").trim();
  const deadlineLocal = deadlineRaw || null;
  if (deadlineLocal && !LOCAL_DATETIME.test(deadlineLocal)) errors.deadlineLocal = "Pick a date and time.";

  const members = edit || booking ? [] : parseMembers(get("members"));
  const seen = new Set<string>();
  const dupes = members.filter((m) => (seen.has(m.toLowerCase()) ? true : (seen.add(m.toLowerCase()), false)));
  if (!edit && !booking && !members.length) errors.members = "Add at least one person.";
  else if (members.length > MAX_MEMBERS) errors.members = `Up to ${MAX_MEMBERS} people per schedule.`;
  else if (dupes.length) errors.members = `Listed twice: ${[...new Set(dupes)].join(", ")}.`;
  else if (members.some((m) => m.length > 40)) errors.members = "Keep each name under 40 characters.";

  let meetingMinutes: number | null = null, capacity: number | null = null;
  if (booking) {
    meetingMinutes = Number(get("meetingMinutes"));
    if (!Number.isInteger(meetingMinutes) || meetingMinutes < slotMinutes || meetingMinutes % slotMinutes
        || meetingMinutes > dayEndMin - dayStartMin) {
      errors.meetingMinutes = "Pick a length that is whole slots and fits inside the day's hours.";
    }
    capacity = get("capacity") === "group" ? Number(get("groupSize")) : 1;
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100 || (get("capacity") === "group" && capacity < 2)) {
      errors.capacity = "A group needs between 2 and 100 people.";
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      kind, title, startDate, endDate, weekdays, dayStartMin, dayEndMin, slotMinutes, timeZone, deadlineLocal,
      showNames: !booking && get("visibility") !== "counts",
      members, meetingMinutes, capacity,
    },
  };
}
