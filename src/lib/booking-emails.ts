// The four booking emails as plain text plus matching HTML. Pure, so they run under `node --test`.
import { formatDateRange, formatHours, formatZone } from "./format.ts";
import { onClock } from "./calendar.ts";

export type Notice = {
  shareId: string; title: string; timeZone: string; day: string; startMin: number; endMin: number;
  name: string; email: string; hostEmails: string[]; hostName?: string | null; location?: string | null;
  visitorZone?: string | null; // the visitor's browser zone when they booked
};
export type Email = { subject: string; text: string; html: string };

const when = (n: Notice) => `${formatDateRange(n.day, n.day)}, ${formatHours(n.startMin, n.endMin)}`;
const zone = (n: Notice) => `${when(n)} (${formatZone(n.timeZone)} time)`;
// Visitors from elsewhere also get the time on their own clock.
const theirZone = (n: Notice) => {
  const t = n.visitorZone && onClock(n.day, n.startMin, n.endMin, n.timeZone, n.visitorZone);
  return t ? `${zone(n)}\nThat's ${t}.` : zone(n);
};
// "with Alex" and "Where: …" lines when the host filled them in.
const details = (n: Notice) => [n.hostName && `With ${n.hostName}`, n.location && `Where: ${n.location}`].filter(Boolean).join("\n");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function email(subject: string, paragraphs: string[]): Email {
  const text = [...paragraphs, "Avail"].join("\n\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1d2433">${paragraphs
    .map((p) => `<p>${esc(p).replace(/https?:\/\/\S+/g, (u) => `<a href="${u}">${u}</a>`).replace(/\n/g, "<br>")}</p>`)
    .join("")}<p style="color:#5b6478">Avail</p></div>`;
  // Subjects are one header line: no line breaks from titles or names.
  return { subject: subject.replace(/\s+/g, " ").trim(), text, html };
}

export function visitorBooked(n: Notice, bookingUrl: string) {
  return email(`Booked: ${n.title} · ${when(n)}`, [
    `Hi ${n.name},`,
    [`You're booked for ${n.title}:\n${theirZone(n)}`, details(n)].filter(Boolean).join("\n"),
    `Add it to your calendar, or cancel if you can't make it:\n${bookingUrl}`,
    "That link is private to you, so keep this email.",
  ]);
}

export function hostBooked(n: Notice, manageUrl: string) {
  return email(`New booking: ${n.name} · ${when(n)}`, [
    `${n.name} (${n.email}) booked ${n.title}:\n${zone(n)}`,
    `Reply to this email to reach them. All bookings:\n${manageUrl}`,
  ]);
}

export function hostCancelledByVisitor(n: Notice, manageUrl: string) {
  return email(`Cancelled: ${n.name} · ${when(n)}`, [
    `${n.name} (${n.email}) cancelled their booking for ${n.title}:\n${zone(n)}`,
    `The time is open for others again. All bookings:\n${manageUrl}`,
  ]);
}

export function visitorCancelledByHost(n: Notice, shareUrl: string) {
  return email(`Cancelled: ${n.title} · ${when(n)}`, [
    `Hi ${n.name},`,
    `${n.hostName ?? "The host"} cancelled your booking for ${n.title}:\n${theirZone(n)}`,
    `To pick another time:\n${shareUrl}`,
  ]);
}
