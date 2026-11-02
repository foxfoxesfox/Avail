"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { deleteAccount } from "./actions";

const quiet = "rounded-full bg-indigo-wash px-5 py-3 text-sm font-bold text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover";

/** Last section of the profile. Same pattern as deleting a schedule: type the account's email before the button works. */
export function DeleteAccount({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const trigger = useRef<HTMLButtonElement>(null);
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <section className="mt-12 border-t border-rule pt-6">
      <h2 className="text-lg font-bold">Delete account</h2>
      {!open ? (
        <>
          <p className="mt-1 text-sm text-ink-soft">Removes your account for good. Schedules stay for their organizer links.</p>
          <button type="button" ref={trigger} onClick={() => setOpen(true)} className={`${quiet} mt-3`}>Delete my account…</button>
        </>
      ) : (
        <form className="mt-2 grid gap-3 text-sm" onSubmit={(e) => {
          e.preventDefault();
          if (!matches || pending) return;
          start(async () => {
            const r = await deleteAccount(typed);
            if (r.error) return setError(r.error);
            router.replace("/");
          });
        }}>
          <p>
            This deletes your account and your name on it. You stop being an organizer of every schedule you added, and names
            you linked are unlinked (their answers stay). Schedules aren&apos;t deleted: anyone with the organizer link still
            manages them, so delete any you no longer want first. It can&apos;t be undone.
          </p>
          <div>
            <label htmlFor="confirm-email" className="mb-1.5 block font-medium">
              Type <span className="rounded bg-indigo-wash px-1.5 py-0.5 font-bold text-ink [overflow-wrap:anywhere]">{email}</span> to confirm
            </label>
            <input id="confirm-email" type="email" value={typed} autoFocus autoComplete="off" spellCheck={false}
              onChange={(e) => { setTyped(e.target.value); setError(""); }}
              aria-invalid={!!error} aria-describedby={error ? "delete-account-err" : undefined}
              className="w-full rounded-[10px] border border-rule bg-sheet px-3.5 py-3 text-base text-ink aria-[invalid=true]:border-vermilion" />
            {error && <p id="delete-account-err" role="alert" className="mt-1.5 font-medium text-vermilion">{error}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={quiet}
              onClick={() => { flushSync(() => { setOpen(false); setTyped(""); setError(""); }); trigger.current?.focus(); }}>
              Keep
            </button>
            <button aria-disabled={!matches || pending}
              className="rounded-full bg-indigo px-5 py-3 font-bold whitespace-nowrap text-white transition-colors duration-150 hover:bg-indigo-deep aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
              {pending ? "Deleting…" : "Delete my account"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
