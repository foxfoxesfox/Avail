import "server-only";
import type { Email } from "./booking-emails";

const FROM = process.env.EMAIL_FROM ?? "Avail <no-reply@auth.foxesvx.dev>";

/** Sends one email through Resend's API. Failures are logged, never thrown: a booking stands even if its email doesn't go. */
export async function sendEmail(to: string[], m: Email, opts: { replyTo?: string; ics?: string } = {}) {
  const key = process.env.RESEND_API_KEY;
  // shortcut: with no key (local dev before setup) emails are skipped; set RESEND_API_KEY on every deployment.
  if (!key || !to.length) return;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM, to, subject: m.subject, text: m.text, html: m.html, reply_to: opts.replyTo,
      attachments: opts.ics ? [{ filename: "booking.ics", content: Buffer.from(opts.ics).toString("base64") }] : undefined,
    }),
  }).catch((e) => { console.error("email failed", e); return null; });
  if (r && !r.ok) console.error("email failed", r.status, await r.text());
}
