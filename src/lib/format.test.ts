import { test } from "node:test";
import assert from "node:assert/strict";
import { toLocalInput } from "./format.ts";

test("toLocalInput shows a deadline in the schedule's zone", () => {
  assert.equal(toLocalInput("2026-10-30T09:00:00Z", "Asia/Singapore"), "2026-10-30T17:00");
  assert.equal(toLocalInput("2026-10-30T16:30:00Z", "Asia/Singapore"), "2026-10-31T00:30");
  assert.equal(toLocalInput("2026-03-08T16:00:00Z", "America/New_York"), "2026-03-08T12:00");
});
