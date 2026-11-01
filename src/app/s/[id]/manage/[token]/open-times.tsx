"use client";

import type { Schedule } from "@/lib/supabase";
import { FREE } from "@/lib/grid";
import { formatLength } from "@/lib/format";
import { PaintGrid } from "../../availability";
import { loadOpenTimes, saveOpenTimes } from "./actions";

/** Booking pages: the host paints when people can book them, on the same grid members use. */
export function OpenTimes({ s, token }: { s: Schedule; token: string | null }) {
  const slots = (s.meetingMinutes ?? 0) / s.slotMinutes;
  return (
    <PaintGrid s={s} loadKey={s.shareId} readOnly={false} blankMeans="not bookable"
      modes={[{ state: FREE, label: "Free" }, { state: 0, label: "Clear" }]}
      load={() => loadOpenTimes(s.shareId, token)}
      save={(rows) => saveOpenTimes(s.shareId, token, rows)}
      onLoadFail={() => {}}
      header={
        <div>
          <h2 className="text-lg font-bold">Your free times</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Paint when people can book you. Each meeting is {formatLength(s.meetingMinutes ?? 0)} ({slots} {slots === 1 ? "slot" : "slots"}), so a
            start time only appears if the whole meeting fits inside your free times.
          </p>
        </div>
      }
      closedNote={null} />
  );
}
