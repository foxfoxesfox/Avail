// Display helpers. Dates are calendar dates (no time zone); deadlines are instants shown in the schedule's zone.

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Fri 23 Oct" / "Thu 5 Nov 2026" (Intl's en-GB adds a comma once a year is present).
function day(iso: string, withYear = false) {
  const d = new Date(iso + "T00:00:00Z");
  return `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ""}`;
}

export function formatDateRange(start: string, end: string) {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return start === end ? day(start, true) : `${day(start, !sameYear)} – ${day(end, true)}`;
}

export function formatHour(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

export function formatHours(startMin: number, endMin: number) {
  return `${formatHour(startMin)}–${endMin === 1440 ? "midnight" : formatHour(endMin)}`;
}

export function formatWeekdays(days: number[]) {
  const key = [...days].sort().join("");
  if (key === "0123456") return "Every day";
  if (key === "12345") return "Weekdays";
  if (key === "06") return "Weekends";
  // Monday-first order, as the form shows them.
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => DAY_NAMES[d]).join(", ");
}

export function formatDeadline(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone,
  }).format(new Date(iso));
}

export function formatZone(timeZone: string) {
  return timeZone.replaceAll("_", " ").split("/").pop()!;
}
