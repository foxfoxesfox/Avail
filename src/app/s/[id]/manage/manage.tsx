import { notFound, redirect } from "next/navigation";
import { currentUser, getOrganizers, getScheduleAsOrganizer } from "@/lib/supabase";
import { CopyLink } from "../../copy-link";
import { Hanko } from "../../sessions";
import { RememberOrganizer } from "../../../my-schedules";
import { Board } from "./[token]/board";
import { Organizers } from "./[token]/organizers";
import { Details } from "./[token]/details";
import { People } from "./[token]/people";
import { ShareControls } from "./[token]/share-controls";

/** The organizer page. Reached by the secret link (token) or, signed in, by an account that organizes it (token null). */
export async function Manage({ shareId, token }: { shareId: string; token: string | null }) {
  const [s, user] = await Promise.all([getScheduleAsOrganizer(shareId, token), currentUser()]);
  if (!s) {
    if (!token && !user) redirect(`/sign-in?next=/s/${encodeURIComponent(shareId)}/manage`);
    notFound();
  }
  const org = user ? await getOrganizers(shareId, token) : null;

  return (
    <>
      <title>{`${s.title} · Organizer · Avail`}</title>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em] text-balance">{s.title}</h1>
          <p className="mt-1 text-ink-soft">Send the share link to everyone, then pick a time below.</p>
        </div>
        {/* One hanko per screen: once a session is confirmed, the seal moves to it. */}
        {s.sessions.length === 0 && <Hanko />}
      </div>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-bold">Share link</h2>
        <p className="mb-3 text-sm text-ink-soft">For members: they pick their name and mark when they&apos;re free.</p>
        <CopyLink path={`/s/${s.shareId}`} label="Share link" action="Copy share link" />
        <ShareControls s={s} token={token} />
      </section>

      {token && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-bold">Your organizer link</h2>
          <p className="mb-3 text-sm text-ink-soft">
            Keep this private: anyone with it can manage the schedule. Sign in and add it to your schedules to open it on any device.
          </p>
          <CopyLink path={`/s/${s.shareId}/manage/${token}`} label="Organizer link" action="Copy organizer link" quiet />
        </section>
      )}

      <Board s={s} token={token} />
      {token && <RememberOrganizer shareId={s.shareId} token={token} title={s.title} />}
      <People s={s} token={token} />
      <Organizers shareId={s.shareId} title={s.title} token={token} user={user} org={org} />

      <Details s={s} token={token} />
    </>
  );
}
