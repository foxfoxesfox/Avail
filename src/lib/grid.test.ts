import { test } from "node:test";
import assert from "node:assert/strict";
import { fromRows, groupWeeks, slotKey, slotMinutes, toRows, weekColumns, type State } from "./grid.ts";

test("slot minutes cover the day window, end excluded", () => {
  assert.deepEqual(slotMinutes(600, 720, 30), [600, 630, 660, 690]);
  assert.equal(slotMinutes(0, 1440, 15).length, 96);
});

test("weeks split on Monday", () => {
  // Fri 23, Mon 26, Tue 27, Mon 2 Nov
  assert.deepEqual(groupWeeks(["2026-10-23", "2026-10-26", "2026-10-27", "2026-11-02"]),
    [["2026-10-23"], ["2026-10-26", "2026-10-27"], ["2026-11-02"]]);
});

test("week columns stay fixed; days outside the range are inactive", () => {
  // Range starts Fri 23 Oct; weekdays Mon–Fri.
  const cols = weekColumns(["2026-10-23"], [1, 2, 3, 4, 5], "2026-10-23", "2026-11-05");
  assert.deepEqual(cols.map((c) => c.date), ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"]);
  assert.deepEqual(cols.map((c) => c.active), [false, false, false, false, true]);
});

test("rows round-trip and busy is dropped", () => {
  const m = new Map<string, State>([[slotKey("2026-10-26", 600), 2], [slotKey("2026-10-26", 660), 1], [slotKey("2026-10-27", 600), 0]]);
  const r = toRows(m);
  assert.deepEqual(r, { days: ["2026-10-26", "2026-10-26"], minutes: [600, 660], states: [2, 1] });
  const back = fromRows(r.days.map((d, i) => [d, r.minutes[i], r.states[i]]));
  assert.equal(back.get(slotKey("2026-10-26", 660)), 1);
  assert.equal(back.size, 2);
});
