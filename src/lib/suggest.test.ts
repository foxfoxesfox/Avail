import { test } from "node:test";
import assert from "node:assert/strict";
import { rankSessions, type Person, type SlotNames } from "./suggest.ts";

const people: Person[] = [
  { name: "Alex", isKey: true, replied: true },
  { name: "Sam", isKey: false, replied: true },
  { name: "Priya", isKey: false, replied: true },
  { name: "Jordan", isKey: false, replied: false },
];
const D = "2026-10-26";
const s = (free: string[], ifNeeded: string[] = []): SlotNames => ({ free, ifNeeded });
const slots = new Map<string, SlotNames>([
  [`${D}@600`, s(["Sam", "Priya"])], // 10am: key member Alex missing
  [`${D}@660`, s(["Alex", "Sam"], ["Priya"])], // 11am
  [`${D}@720`, s(["Alex", "Sam", "Priya"])], // 12pm: everyone who replied
]);
const minutes = [600, 660, 720];

test("key members first, then most free", () => {
  const r = rankSessions([D], minutes, 60, 1, slots, people);
  assert.deepEqual(r.map((x) => x.startMin), [720, 660, 600]);
  assert.deepEqual(r[0].free, ["Alex", "Sam", "Priya"]);
  assert.deepEqual(r[0].noReply, ["Jordan"]);
  assert.deepEqual(r[2].keyMissing, ["Alex"]);
});

test("a 2-slot block needs people for both slots; if-needed carries through", () => {
  const r = rankSessions([D], minutes, 60, 2, slots, people);
  // 11am–1pm: Alex, Sam free both; Priya if-needed at 11 → ifNeeded
  assert.deepEqual([r[0].startMin, r[0].endMin], [660, 780]);
  assert.deepEqual(r[0].free, ["Alex", "Sam"]);
  assert.deepEqual(r[0].ifNeeded, ["Priya"]);
  // 10am–12pm: Alex not free at 10 → key missing, ranked last
  assert.deepEqual(r[1].keyMissing, ["Alex"]);
});

test("blocks with nobody available are skipped; length longer than the day gives none", () => {
  assert.equal(rankSessions([D], minutes, 60, 1, new Map(), people).length, 0);
  assert.equal(rankSessions([D], minutes, 60, 4, slots, people).length, 0);
});
