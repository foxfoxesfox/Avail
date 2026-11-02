import { test } from "node:test";
import assert from "node:assert/strict";
import { hostBooked, visitorBooked, type Notice } from "./booking-emails.ts";

const n: Notice = {
  shareId: "abc", title: "Office hours\nweekly", timeZone: "Asia/Singapore", day: "2026-11-03", startMin: 600, endMin: 660,
  name: "Alex <b>", email: "alex@example.com", hostEmails: ["sam@example.com"],
};

test("booking emails: visitors from another zone also get their own time; hosts don't", () => {
  const away = { ...n, visitorZone: "America/New_York" };
  assert.match(visitorBooked(away, "u").text, /That's 9pm–10pm New York time, Mon 2 Nov 2026\./);
  assert.doesNotMatch(visitorBooked(n, "u").text, /That's/);
  assert.doesNotMatch(hostBooked(away, "u").text, /That's/);
});

test("booking emails: one-line subject, escaped HTML, linked URL", () => {
  const v = visitorBooked(n, "https://avail.example/s/abc/booked/tok");
  assert.equal(v.subject.includes("\n"), false);
  assert.match(v.subject, /^Booked: Office hours weekly · Tue 3 Nov 2026, 10am–11am$/);
  assert.match(v.text, /Hi Alex <b>,/);
  assert.equal(v.html.includes("<b>"), false);
  assert.match(v.html, /<a href="https:\/\/avail\.example\/s\/abc\/booked\/tok">/);
  assert.match(v.text, /Singapore time/);
  assert.match(hostBooked(n, "https://avail.example/s/abc/manage").text, /alex@example\.com/);
  const placed = visitorBooked({ ...n, hostName: "Sam", location: "https://meet.example/x" }, "https://avail.example/b");
  assert.match(placed.text, /With Sam\nWhere: https:\/\/meet\.example\/x/);
  assert.match(placed.html, /<a href="https:\/\/meet\.example\/x">/);
});
