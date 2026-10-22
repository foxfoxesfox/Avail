import { test } from "node:test";
import assert from "node:assert/strict";
import { listDates, parseMembers, parseScheduleForm } from "./schedule-form.ts";

const ZONES = new Set(["Asia/Singapore", "UTC"]);
const base: Record<string, string | string[]> = {
  title: "IE4727 group",
  startDate: "2026-10-12",
  endDate: "2026-10-25",
  weekdays: ["1", "2"],
  startHour: "10",
  endHour: "22",
  slotMinutes: "60",
  timeZone: "Asia/Singapore",
  deadline: "",
  visibility: "names",
  members: "Aly\nJiahui\n Niki \n\nShann, Martin",
};

function parse(over: Record<string, string | string[]> = {}) {
  const f = { ...base, ...over };
  const one = (k: string) => { const v = f[k]; return Array.isArray(v) ? v[0] ?? "" : v ?? ""; };
  const all = (k: string) => { const v = f[k]; return Array.isArray(v) ? v : v === undefined ? [] : [v]; };
  return parseScheduleForm(one, all, ZONES);
}

test("valid form becomes RPC input", () => {
  const r = parse();
  assert.ok(r.ok);
  assert.deepEqual(r.value.members, ["Aly", "Jiahui", "Niki", "Shann", "Martin"]);
  assert.deepEqual([r.value.dayStartMin, r.value.dayEndMin], [600, 1320]);
  assert.deepEqual(r.value.weekdays, [1, 2]);
  assert.equal(r.value.deadlineLocal, null);
  assert.equal(r.value.showNames, true);
});

test("rejects bad ranges, days and hours", () => {
  const r = parse({ startDate: "2026-10-20", endDate: "2026-10-12", startHour: "22", endHour: "10", weekdays: [] });
  assert.ok(!r.ok);
  assert.ok(r.errors.endDate && r.errors.dayEndMin && r.errors.weekdays);
});

test("impossible dates and weekdays outside the range", () => {
  assert.ok(!parse({ startDate: "2026-02-30" }).ok);
  // Oct 12 2026 is a Monday; a Mon–Mon range has no Sunday.
  const r = parse({ endDate: "2026-10-12", weekdays: ["0"] });
  assert.ok(!r.ok && r.errors.weekdays?.includes("inside"));
});

test("duplicate names, unknown zone, slot size and visibility", () => {
  const r = parse({ members: "Aly\naly", timeZone: "Mars/Base", slotMinutes: "45" });
  assert.ok(!r.ok);
  assert.match(r.errors.members!, /aly/i);
  assert.ok(r.errors.timeZone && r.errors.slotMinutes);
  const c = parse({ visibility: "counts", deadline: "2026-10-30T18:00", endHour: "24" });
  assert.ok(c.ok && !c.value.showNames && c.value.deadlineLocal === "2026-10-30T18:00" && c.value.dayEndMin === 1440);
});

test("listDates keeps chosen weekdays only", () => {
  // Mon 12 – Sun 25 Oct 2026, Mon+Tue
  assert.deepEqual(listDates("2026-10-12", "2026-10-25", [1, 2]), ["2026-10-12", "2026-10-13", "2026-10-19", "2026-10-20"]);
  assert.deepEqual(listDates("2026-10-25", "2026-10-12", [1]), []);
});

test("parseMembers splits lines and commas, collapses spaces", () => {
  assert.deepEqual(parseMembers(" Joline   Tan ,\r\nA\n\n"), ["Joline Tan", "A"]);
});
