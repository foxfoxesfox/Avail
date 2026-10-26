"use client";

/** Two-step confirm in place of the action: the question, then "Keep" (focused, first, so the safe choice is under the thumb)
 *  and the action. Both are full-size capsules with room between them. */
export function Confirm({ question, yes, busyYes, busy, onYes, onKeep }: {
  question: React.ReactNode; yes: string; busyYes: string; busy: boolean; onYes: () => void; onKeep: () => void;
}) {
  return (
    <div className="grid gap-2 text-sm">
      <p>{question}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" autoFocus onClick={onKeep}
          className="rounded-full bg-indigo-wash px-5 py-3 font-bold whitespace-nowrap text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover">
          Keep
        </button>
        <button type="button" disabled={busy} onClick={onYes}
          className="rounded-full bg-indigo px-5 py-3 font-bold whitespace-nowrap text-white transition-colors duration-150 hover:bg-indigo-deep disabled:opacity-60">
          {busy ? busyYes : yes}
        </button>
      </div>
    </div>
  );
}
