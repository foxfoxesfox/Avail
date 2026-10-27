"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import type { Schedule } from "@/lib/supabase";
import { forgetOrganizerLink } from "../../../../my-schedules";
import { deleteSchedule } from "./actions";

const quiet = "rounded-full bg-indigo-wash px-5 py-3 text-sm font-bold text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover";

/** Last section of the organizer page. Like deleting a repository: type the exact name before the button works. */
export function DeleteSchedule({ s, token }: { s: Schedule; token: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const trigger = useRef<HTMLButtonElement>(null);
  const matches = typed === s.title;

  return (
    <section className="mt-12 border-t border-rule pt-6">
      <h2 className="text-lg font-bold">Delete schedule</h2>
      {!open ? (
        <>
          <p className="mt-1 text-sm text-ink-soft">Removes it for everyone, for good.</p>
          <button type="button" ref={trigger} onClick={() => setOpen(true)} className={`${quiet} mt-3`}>Delete this schedule…</button>
        </>
      ) : (
        <form className="mt-2 grid gap-3 text-sm" onSubmit={(e) => {
          e.preventDefault();
          if (!matches || pending) return;
          start(async () => {
            const r = await deleteSchedule(s.shareId, token, typed);
            if (r.error) return setError(r.error);
            forgetOrganizerLink(s.shareId);
            router.replace("/");
          });
        }}>
          <p>
            This permanently deletes <b>{s.title}</b>: everyone&apos;s answers, confirmed sessions, calendar feeds and invites.
            The share and organizer links stop working. It can&apos;t be undone.
          </p>
          <div>
            <label htmlFor="confirm-title" className="mb-1.5 block font-medium">
              Type <span className="rounded bg-indigo-wash px-1.5 py-0.5 font-bold text-ink">{s.title}</span> to confirm
            </label>
            <input id="confirm-title" value={typed} autoFocus autoComplete="off" spellCheck={false}
              onChange={(e) => { setTyped(e.target.value); setError(""); }}
              aria-invalid={!!error} aria-describedby={error ? "delete-err" : undefined}
              className="w-full rounded-[10px] border border-rule bg-sheet px-3.5 py-3 text-base text-ink aria-[invalid=true]:border-vermilion" />
            {error && <p id="delete-err" role="alert" className="mt-1.5 font-medium text-vermilion">{error}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={quiet}
              onClick={() => { flushSync(() => { setOpen(false); setTyped(""); setError(""); }); trigger.current?.focus(); }}>
              Keep
            </button>
            <button aria-disabled={!matches || pending}
              className="rounded-full bg-indigo px-5 py-3 font-bold whitespace-nowrap text-white transition-colors duration-150 hover:bg-indigo-deep aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
              {pending ? "Deleting…" : "Delete this schedule"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
