"use client";

import { useActionState } from "react";
import { saveName, type NameState } from "./actions";

/** Your name on the profile: one field and Save, with the result read out under it. */
export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<NameState, FormData>(saveName, {});
  return (
    <form action={action} className="mt-8">
      <label htmlFor="profile-name" className="mb-1.5 block text-xs font-bold tracking-[0.06em] text-ink-soft uppercase">Your name</label>
      <div className="flex flex-wrap gap-3">
        <input id="profile-name" name="name" defaultValue={state.saved ?? name} maxLength={60} autoComplete="name"
          aria-invalid={!!state.error} aria-describedby="profile-name-hint profile-name-status"
          className="min-w-0 flex-1 basis-56 rounded-[10px] border border-rule bg-sheet px-3.5 py-3 text-base text-ink aria-[invalid=true]:border-vermilion" />
        <button aria-disabled={pending} onClick={(e) => { if (pending) e.preventDefault(); }}
          className="rounded-full bg-indigo px-6 py-3 text-sm font-bold text-white transition-colors duration-150 hover:bg-indigo-deep aria-disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <p id="profile-name-hint" className="mt-1.5 text-sm text-ink-soft">Filled in as the host on new booking pages, so visitors see who they&apos;re meeting.</p>
      <p id="profile-name-status" role="status" className={`mt-1 text-sm font-medium ${state.error ? "text-vermilion" : "text-ink-soft"}`}>
        {state.error ?? (state.saved !== undefined ? "Saved." : "")}
      </p>
    </form>
  );
}
