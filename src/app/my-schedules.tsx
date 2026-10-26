"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

// Organizer links opened on this device, newest first. They hold the organizer secret, so they never leave the browser.
// Signed-in organizers also get them from their account (Your schedules); this list covers signing out and guests.
const KEY = "avail:organizer";
type Saved = { shareId: string; token: string; title: string; at: number };

const read = (): Saved[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
};
const listen = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

export function saveOrganizerLink(shareId: string, token: string, title: string) {
  const rest = read().filter((x) => x.shareId !== shareId);
  localStorage.setItem(KEY, JSON.stringify([{ shareId, token, title, at: Date.now() }, ...rest].slice(0, 20)));
  window.dispatchEvent(new StorageEvent("storage"));
}

/** Mounted on the organizer page: remembers this schedule's organizer link on the device. */
export function RememberOrganizer({ shareId, token, title }: { shareId: string; token: string; title: string }) {
  useEffect(() => saveOrganizerLink(shareId, token, title), [shareId, token, title]);
  return null;
}

/** The organizer links remembered on this device, minus schedules already in the signed-in account. */
export function MySchedules({ exclude = [] }: { exclude?: string[] }) {
  const raw = useSyncExternalStore(listen, () => localStorage.getItem(KEY), () => null);
  const all: Saved[] = raw ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : [];
  const list = all.filter((x) => !exclude.includes(x.shareId));
  if (!list.length) return null;
  return (
    <section className="mt-12">
      <h2 className="text-lg font-bold">Organizer links on this device</h2>
      <p className="mt-1 text-sm text-ink-soft">Remembered by this browser only. Sign in and add them to your schedules to keep them everywhere.</p>
      <ul className="mt-3 border-t border-ink">
        {list.map((x) => (
          <li key={x.shareId} className="border-b border-rule py-2.5">
            <Link href={`/s/${x.shareId}/manage/${x.token}`} className="font-bold text-indigo underline-offset-4 hover:underline">
              {x.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
