"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

// Organizer links opened on this device, newest first. They hold the organizer secret, so they never leave the browser.
// shortcut: device-only memory until accounts (slice 7) keep schedules across devices.
const KEY = "avail:organizer";
type Saved = { shareId: string; token: string; title: string; at: number };

const read = (): Saved[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
};
const listen = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

/** Mounted on the organizer page: remembers this schedule's organizer link on the device. */
export function RememberOrganizer({ shareId, token, title }: { shareId: string; token: string; title: string }) {
  useEffect(() => {
    const rest = read().filter((x) => x.shareId !== shareId);
    localStorage.setItem(KEY, JSON.stringify([{ shareId, token, title, at: Date.now() }, ...rest].slice(0, 20)));
    window.dispatchEvent(new StorageEvent("storage"));
  }, [shareId, token, title]);
  return null;
}

/** Home page: the organizer links remembered on this device. */
export function MySchedules() {
  const raw = useSyncExternalStore(listen, () => localStorage.getItem(KEY), () => null);
  const list: Saved[] = raw ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : [];
  if (!list.length) return null;
  return (
    <section className="mt-12">
      <h2 className="text-lg font-bold">Your schedules on this device</h2>
      <p className="mt-1 text-sm text-ink-soft">Organizer links you&apos;ve opened in this browser.</p>
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
