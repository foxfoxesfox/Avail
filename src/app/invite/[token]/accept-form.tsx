"use client";

import { useActionState } from "react";
import { acceptInvite } from "./actions";

export function AcceptForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvite, {});
  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="token" value={token} />
      <button disabled={pending}
        className="w-full rounded-full bg-indigo px-6 py-4 text-base font-bold text-white transition-colors duration-150 hover:bg-indigo-deep disabled:opacity-60">
        {pending ? "Joining…" : "Join as co-organizer"}
      </button>
      {state.error && <p role="alert" className="mt-2 text-sm font-medium text-vermilion">{state.error}</p>}
    </form>
  );
}
