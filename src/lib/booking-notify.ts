import "server-only";
import { after } from "next/server";
import { getBooking, serverOnly } from "./supabase";
import { sendEmail } from "./email";
import { toICS } from "./calendar";
import { hostBooked, hostCancelledByVisitor, visitorBooked, visitorCancelledByHost, type Notice } from "./booking-emails";

const SITE = process.env.SITE_URL ?? "https://avail.foxesvx.dev";

type What = { booked: string } | { visitorCancelled: string } | { hostCancelled: string };

/** Emails about a booking, sent after the response so nobody waits on them. booked / visitorCancelled carry the visitor's
 *  private token; hostCancelled the booking id. Hosts are emailed only when they organize with an account. */
export function notifyBooking(what: What) {
  after(async () => {
    const id = "hostCancelled" in what ? what.hostCancelled
      : (await getBooking("booked" in what ? what.booked : what.visitorCancelled))?.id;
    if (!id) return;
    const { data: n, error } = await serverOnly.rpc("booking_notice", { p_booking: id });
    if (error || !n) return console.error("booking_notice failed", error);
    const notice = n as Notice;
    const manage = `${SITE}/s/${notice.shareId}/manage`;
    if ("booked" in what) {
      const session = { id, day: notice.day, startMin: notice.startMin, endMin: notice.endMin, location: notice.location ?? null, link: null, notes: null };
      await Promise.all([
        sendEmail([notice.email], visitorBooked(notice, `${SITE}/s/${notice.shareId}/booked/${what.booked}`),
          { ics: toICS([{ title: notice.title, timeZone: notice.timeZone, session }], new Date()) }),
        sendEmail(notice.hostEmails, hostBooked(notice, manage), { replyTo: notice.email }),
      ]);
    } else if ("visitorCancelled" in what) {
      await sendEmail(notice.hostEmails, hostCancelledByVisitor(notice, manage), { replyTo: notice.email });
    } else {
      await sendEmail([notice.email], visitorCancelledByHost(notice, `${SITE}/s/${notice.shareId}`));
    }
  });
}
