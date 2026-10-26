"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import type { Organizers as Org, User } from "@/lib/supabase";
import { CopyLink } from "../../../copy-link";
import { Confirm } from "../../../confirm";
import { saveOrganizerLink } from "../../../../my-schedules";
import { addToMySchedules, createInvite, newOrganizerLink, removeOrganizer } from "./actions";

const quiet = "rounded-full bg-indigo-wash px-5 py-3 text-sm font-bold text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover disabled:opacity-60";
const textBtn = "-my-1.5 inline-block py-1.5 font-medium text-indigo underline underline-offset-4";

/** Who organizes by account, and the ways in: sign in, add via the organizer link, invite, leave, remove, new link. */
export function Organizers({ shareId, title, token, user, org }: {
  shareId: string; title: string; token: string | null; user: User | null; org: Org | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [inviting, startInvite] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null); // a userId, or "link" for a new organizer link
  const [invite, setInvite] = useState<string | null | "failed">(null);
  const [fresh, setFresh] = useState<string | null | "failed">(null);
  const newLinkBtn = useRef<HTMLButtonElement>(null);
  const here = token ? `/s/${shareId}/manage/${token}` : `/s/${shareId}/manage`;

  // Back to the button that opened the confirm, so keyboard and screen-reader users keep their place.
  const keep = (focus: () => void) => { flushSync(() => setConfirming(null)); focus(); };

  if (!user) {
    return (
      <Section>
        <p className="text-sm text-ink-soft">
          Sign in to keep this schedule on every device. Anyone you give the organizer link to can sign in too and become a co-organizer.
        </p>
        <Link href={`/sign-in?next=${encodeURIComponent(here)}`} className={`${quiet} mt-3 inline-block`}>Sign in</Link>
      </Section>
    );
  }

  const owner = org?.myRole === "owner";
  return (
    <Section>
      {!org?.myRole && token && (
        <div className="mb-4">
          <p className="text-sm text-ink-soft">
            Add this schedule to your account (<span className="[overflow-wrap:anywhere]">{user.email}</span>) to open it on any device.
          </p>
          <button type="button" disabled={pending} onClick={() => start(() => addToMySchedules(shareId, token))} className={`${quiet} mt-3`}>
            {pending ? "Adding…" : "Add to my schedules"}
          </button>
        </div>
      )}
      {!!org?.people.length && (
        <ul className="border-t border-ink">
          {org.people.map((p) => (
            <li key={p.userId} className="border-b border-rule py-2.5 text-sm">
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.email}{p.isMe && <span className="font-normal text-ink-soft"> (you)</span>}</p>
                  <p className="text-ink-soft">{p.role === "owner" ? "Organizer" : "Co-organizer"}</p>
                </div>
                {p.role === "co" && (owner || p.isMe) && confirming !== p.userId && (
                  <button type="button" id={`org-${p.userId}`} className={`${quiet} shrink-0`}
                    aria-label={p.isMe ? "Leave this schedule" : `Remove ${p.email}`} onClick={() => setConfirming(p.userId)}>
                    {p.isMe ? "Leave" : "Remove"}
                  </button>
                )}
              </div>
              {confirming === p.userId && (
                <div className="mt-2">
                  <Confirm busy={pending}
                    question={p.isMe ? "Leave this schedule? You'll need the organizer link or a new invite to come back."
                      : "Remove this co-organizer? They lose access unless they still have the organizer link."}
                    yes={p.isMe ? "Yes, leave" : "Yes, remove"} busyYes={p.isMe ? "Leaving…" : "Removing…"}
                    onKeep={() => keep(() => document.getElementById(`org-${p.userId}`)?.focus())}
                    onYes={() => start(async () => {
                      await removeOrganizer(shareId, token, p.userId);
                      setConfirming(null);
                      if (p.isMe && !token) router.push("/account");
                    })} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {owner && (
        <div className="mt-4 grid gap-3 text-sm">
          {typeof invite === "string" && invite !== "failed" ? (
            <div className="grid gap-2">
              <p role="status" className="font-medium">Invite link ready. It works once, for 7 days; they sign in to accept.</p>
              <CopyLink path={`/invite/${invite}`} label="Co-organizer invite link" action="Copy invite link" quiet />
              <p><button type="button" onClick={() => setInvite(null)} className={textBtn}>Invite someone else</button></p>
            </div>
          ) : (
            <div>
              <button type="button" disabled={inviting} className={quiet}
                onClick={() => startInvite(async () => setInvite((await createInvite(shareId)) ?? "failed"))}>
                {inviting ? "Making invite…" : "Invite a co-organizer"}
              </button>
              {invite === "failed" && <p role="alert" className="mt-1.5 font-medium text-vermilion">Couldn&apos;t make an invite. Try again.</p>}
            </div>
          )}
          {typeof fresh === "string" && fresh !== "failed" ? (
            <>
              <p role="status" className="font-medium">New organizer link ready. The old one no longer works.</p>
              <CopyLink path={`/s/${shareId}/manage/${fresh}`} label="New organizer link" action="Copy organizer link" quiet />
            </>
          ) : confirming === "link" ? (
            <Confirm busy={pending}
              question="Make a new organizer link? The old one stops working for everyone who has it; co-organizers keep access through their accounts."
              yes="Yes, make a new link" busyYes="Making…"
              onKeep={() => keep(() => newLinkBtn.current?.focus())}
              onYes={() => start(async () => {
                const t = await newOrganizerLink(shareId);
                setConfirming(null);
                setFresh(t ?? "failed");
                if (t) saveOrganizerLink(shareId, t, title);
              })} />
          ) : (
            <p className="text-ink-soft">
              {fresh === "failed" && <span role="alert" className="font-medium text-vermilion">Couldn&apos;t make a new link. </span>}
              Lost the organizer link, or shared it by mistake?{" "}
              <button type="button" ref={newLinkBtn} onClick={() => setConfirming("link")} className={textBtn}>Make a new one</button>
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-2 text-lg font-bold">Organizers</h2>
      {children}
    </section>
  );
}
