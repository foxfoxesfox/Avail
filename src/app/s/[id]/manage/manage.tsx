import { notFound, redirect } from "next/navigation";
import { currentUser, getBookings, getOrganizers, getScheduleAsOrganizer } from "@/lib/supabase";
import { CopyLink } from "../../copy-link";
import { Hanko } from "../../sessions";
import { RememberOrganizer } from "../../../my-schedules";
import { Board } from "./[token]/board";
import { Organizers } from "./[token]/organizers";
import { Details } from "./[token]/details";
import { People } from "./[token]/people";
import { OpenTimes } from "./[token]/open-times";
import { BookingEmails, Bookings } from "./[token]/bookings";
import { loadOpenTimes } from "./[token]/actions";
import { DeleteSchedule } from "./[token]/delete-schedule";
import { ShareControls } from "./[token]/share-controls";

/** The organizer page. Reached by the secret link (token) or, signed in, by an account that organizes it (token null). */
export async function Manage({ shareId, token }: { shareId: string; token: string | null }) {
  const [s, user] = await Promise.all([getScheduleAsOrganizer(shareId, token), currentUser()]);
  if (!s) {
    if (!token && !user) redirect(`/sign-in?next=/s/${encodeURIComponent(shareId)}/manage`);
    notFound();
  }
  const booking = s.kind === "booking";
  const [org, bookings, open] = await Promise.all([
    user ? getOrganizers(shareId, token) : null, booking ? getBookings(shareId, token) : [], booking ? loadOpenTimes(shareId, token) : [],
  ]);
  // A booking page with nothing painted can't take bookings: lead with the free times until the host paints some.
  const fresh = booking && open.length === 0;
  const active = bookings.filter((b) => !b.cancelled);
  // One outlined run per booked time on the free-times grid; group sessions list everyone in it.
  const runs = new Map<string, { day: string; startMin: number; endMin: number; names: string[] }>();
  for (const b of active) {
    const k = `${b.day}@${b.startMin}@${b.endMin}`;
    runs.set(k, { day: b.day, startMin: b.startMin, endMin: b.endMin, names: [...(runs.get(k)?.names ?? []), b.name] });
  }
  const freeTimes = <OpenTimes s={s} token={token} booked={[...runs.values()]} />;
  const bookingList = (
    <Bookings shareId={s.shareId} token={token} upcoming={active.filter((b) => !b.past)}
      past={active.filter((b) => b.past).reverse()} cancelled={bookings.filter((b) => b.cancelled)} />
  );
  const organizerLink = token && (
    <section className="mt-8">
      <h2 className="mb-1 text-lg font-bold">Your organizer link</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Keep this private: anyone with it can manage the schedule. Sign in and add it to your schedules to open it on any device.
      </p>
      <CopyLink path={`/s/${s.shareId}/manage/${token}`} label="Organizer link" action="Copy organizer link" quiet />
    </section>
  );
  return (
    <>
      <title>{`${s.title} · Organizer · Avail`}</title>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em] text-balance">{s.title}</h1>
          <p className="mt-1 text-ink-soft">
            {fresh ? "Start by painting your free times. Nobody can book until you do."
              : booking ? "Share the link: people book a time that suits them, and it appears below."
              : "Send the share link to everyone, then pick a time below."}
          </p>
        </div>
        {/* One hanko per screen: once a session is confirmed, the seal moves to it. */}
        {s.sessions.length === 0 && <Hanko />}
      </div>
      {/* A booking page leads with what needs the host now: painting while nothing is free, then who booked. */}
      {fresh ? freeTimes : booking && bookingList}
      {/* Then, until it's done, the step that tells the host about new bookings. */}
      {booking && token && !org?.myRole && <BookingEmails shareId={s.shareId} token={token} signedIn={!!user} />}

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-bold">Share link</h2>
        <p className="mb-3 text-sm text-ink-soft">
          {fresh ? "Share it once you've painted some free times above."
            : booking ? "For anyone you want to meet: they pick a time that suits them."
            : "For members: they pick their name and mark when they're free."}
        </p>
        <CopyLink path={`/s/${s.shareId}`} label="Share link" action="Copy share link" />
        <ShareControls s={s} token={token} />
      </section>

      {!booking && organizerLink}

      {/* Booking pages: the host's own free times instead of the group's decision tools, then the set-and-forget organizer link. */}
      {booking ? <>{fresh ? bookingList : freeTimes}{organizerLink}</> : <Board s={s} token={token} />}
      {token && <RememberOrganizer shareId={s.shareId} token={token} title={s.title} />}
      {!booking && <People s={s} token={token} />}
      {/* Booking pages offer "Add to my schedules" in the booking-emails step instead. */}
      <Organizers shareId={s.shareId} title={s.title} token={token} user={user} org={org} offerAdd={!booking} />

      <Details s={s} token={token} />
      {/* The organizer link or the owner account may delete; co-organizers may not. */}
      {(token || org?.myRole === "owner") && <DeleteSchedule s={s} token={token} />}
    </>
  );
}
