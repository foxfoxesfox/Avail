"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendLink, type SendState } from "./actions";

export function EmailForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SendState, FormData>(sendLink, {});
  const sent = useRef<HTMLHeadingElement>(null);
  // The form (and its focused button) disappears: move focus to the confirmation so it is read out.
  useEffect(() => { if (state.sentTo) sent.current?.focus(); }, [state.sentTo]);
  if (state.sentTo) {
    return (
      <div className="mt-6 border-t border-ink pt-4">
        <h2 ref={sent} tabIndex={-1} className="text-lg font-bold">Check your email</h2>
        <p className="mt-1 text-ink-soft">
          We sent a sign-in link to <span className="font-medium text-ink [overflow-wrap:anywhere]">{state.sentTo}</span>. It works once and expires in an hour.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Wrong address or no email after a few minutes?{" "}
          <a href="" className="font-medium text-indigo underline underline-offset-4">Try again</a>
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="mt-6" noValidate>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email" className="mb-1.5 block text-xs font-bold tracking-[0.06em] text-ink-soft uppercase">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.email}
        aria-invalid={!!state.error} aria-describedby={state.error ? "email-err" : undefined}
        className="w-full rounded-[10px] border border-rule bg-sheet px-3.5 py-3 text-base text-ink aria-[invalid=true]:border-vermilion" />
      {state.error && <p id="email-err" className="mt-1.5 text-sm font-medium text-vermilion">{state.error}</p>}
      <button disabled={pending}
        className="mt-4 w-full rounded-full bg-indigo px-6 py-4 text-base font-bold text-white transition-colors duration-150 hover:bg-indigo-deep disabled:opacity-60">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
