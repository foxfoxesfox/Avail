"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import type { Schedule } from "@/lib/supabase";
import { formatDeadline, formatZone } from "@/lib/format";
import { Confirm } from "../../../confirm";
import { forgetOrganizerLink } from "../../../../my-schedules";
import { resetShareLink, setAnswersOpen } from "./actions";

const textBtn = "-my-1.5 inline-block py-1.5 font-medium text-indigo underline underline-offset-4 aria-disabled:opacity-60";

/** Under the share link: whether answers are open (close now / reopen), and a new share link if it leaked. */
export function ShareControls({ s, token }: { s: Schedule; token: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState<"close" | "reset" | null>(null);
  const [failed, setFailed] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const reopenBtn = useRef<HTMLButtonElement>(null);
  const resetBtn = useRef<HTMLButtonElement>(null);
  // Read the ref after the flush: while the confirm shows, its trigger isn't mounted.
  const keep = (ref: React.RefObject<HTMLButtonElement | null>) => { flushSync(() => setAsking(null)); ref.current?.focus(); };

  // After closing or reopening, focus the button that undoes it, and say what happened.
  const [said, setSaid] = useState("");
  const acted = useRef(false);
  useEffect(() => {
    if (!acted.current) return;
    acted.current = false;
    setSaid(s.closed ? "Answers closed." : "Answers reopened.");
    (s.closed ? reopenBtn : closeBtn).current?.focus();
  }, [s.closed]);
  const zone = ` (${formatZone(s.timeZone)} time)`;

  return (
    <div className="mt-3 grid gap-3 text-sm">
      <p aria-live="polite" className="sr-only">{said}</p>
      {asking === "close" ? (
        <Confirm busy={pending} yes="Yes, close answers" busyYes="Closing…" onKeep={() => keep(closeBtn)}
          question="Close answers now? Members can still see the schedule but can't change their times until you reopen."
          onYes={() => start(async () => { acted.current = true; await setAnswersOpen(s.shareId, token, false); setAsking(null); })} />
      ) : (
        <p className={s.closed ? "font-medium" : "text-ink-soft"}>
          {s.closed
            ? <>Answers are closed{s.deadline ? ` since ${formatDeadline(s.deadline, s.timeZone)}${zone}` : ""}. </>
            : s.deadline ? <>Answers close {formatDeadline(s.deadline, s.timeZone)}{zone}. </> : <>Answers are open. </>}
          {s.closed ? (
            <button type="button" ref={reopenBtn} aria-disabled={pending}
              onClick={() => { if (pending) return; acted.current = true; start(() => setAnswersOpen(s.shareId, token, true)); }} className={textBtn}>
              {pending ? "Reopening…" : "Reopen"}
            </button>
          ) : (
            <button type="button" ref={closeBtn} onClick={() => setAsking("close")} className={textBtn}>Close now</button>
          )}
        </p>
      )}
      {asking === "reset" ? (
        <Confirm busy={pending} yes="Yes, make a new link" busyYes="Making…" onKeep={() => keep(resetBtn)}
          question="Make a new share link? The current one stops working, so send everyone the new one. Answers, sessions and calendar feeds are kept."
          onYes={() => start(async () => {
            const next = await resetShareLink(s.shareId, token);
            if (!next) { setFailed(true); setAsking(null); return; }
            forgetOrganizerLink(s.shareId);
            router.replace(token ? `/s/${next}/manage/${token}` : `/s/${next}/manage`);
          })} />
      ) : (
        <p className="text-ink-soft">
          {failed && <span role="alert" className="font-medium text-vermilion">Couldn&apos;t make a new link. </span>}
          Shared it too widely?{" "}
          <button type="button" ref={resetBtn} onClick={() => { setFailed(false); setAsking("reset"); }} className={textBtn}>Make a new share link</button>
        </p>
      )}
    </div>
  );
}
