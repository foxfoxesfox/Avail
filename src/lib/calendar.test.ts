import { test } from "node:test";
import assert from "node:assert/strict";
import { googleLink, outlookLink, toICS, toInstant, type CalendarEvent } from "./calendar.ts";

test("toInstant converts schedule wall time to UTC", () => {
  assert.equal(toInstant("2026-10-26", 600, "Asia/Singapore").toISOString(), "2026-10-26T02:00:00.000Z");
  assert.equal(toInstant("2026-10-26", 1440, "Asia/Singapore").toISOString(), "2026-10-26T16:00:00.000Z");
  // Either side of daylight-saving changes.
  assert.equal(toInstant("2026-03-08", 720, "America/New_York").toISOString(), "2026-03-08T16:00:00.000Z");
  assert.equal(toInstant("2026-03-07", 720, "America/New_York").toISOString(), "2026-03-07T17:00:00.000Z");
  assert.equal(toInstant("2026-10-25", 600, "Europe/London").toISOString(), "2026-10-25T10:00:00.000Z");
  assert.equal(toInstant("2026-10-24", 600, "Europe/London").toISOString(), "2026-10-24T09:00:00.000Z");
});

const e: CalendarEvent = {
  title: "Project meetings; week 3, room",
  timeZone: "Asia/Singapore",
  session: { id: "s1", day: "2026-10-26", startMin: 840, endMin: 960, location: "Library room 3", link: "https://meet.example.com/abc", notes: "Bring the draft.\nSecond line" },
};

test("links carry the session's UTC times", () => {
  assert.match(googleLink(e), /dates=20261026T060000Z%2F20261026T080000Z/);
  assert.match(outlookLink(e), /startdt=2026-10-26T06%3A00%3A00.000Z/);
});

test("ics escapes text and folds long lines", () => {
  const ics = toICS([e], new Date("2026-10-26T00:00:00Z"), "Avail · " + "x".repeat(100));
  assert.ok(ics.includes("SUMMARY:Project meetings\\; week 3\\, room\r\n"));
  assert.ok(ics.includes("DTSTART:20261026T060000Z\r\nDTEND:20261026T080000Z"));
  assert.ok(ics.replace(/\r\n /g, "").includes("DESCRIPTION:Bring the draft.\\nSecond line\\n\\nhttps://meet.example.com/abc\r\n"));
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});
