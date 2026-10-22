"use client";

import { useState, useSyncExternalStore } from "react";

const noop = () => () => {};

export function CopyLink({ path, label, action, quiet = false }: { path: string; label: string; action: string; quiet?: boolean }) {
  const [copied, setCopied] = useState(false);
  // Origin is only known in the browser; the server renders the bare path.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const url = origin + path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.origin + path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context): the URL stays selectable in the field.
    }
  }

  return (
    <div className="grid gap-2 sm:flex sm:items-stretch">
      <input readOnly value={url} aria-label={label} onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-[10px] border border-rule bg-sheet px-3.5 py-3 text-sm text-ink" />
      <button type="button" onClick={copy}
        className={`shrink-0 rounded-full px-5 py-3 text-sm font-bold transition-colors duration-150 sm:w-48 ${quiet ? "bg-indigo-wash text-indigo hover:bg-indigo-wash-hover" : "bg-indigo text-white hover:bg-indigo-deep"}`}>
        <span aria-live="polite">{copied ? "Copied" : action}</span>
      </button>
    </div>
  );
}
