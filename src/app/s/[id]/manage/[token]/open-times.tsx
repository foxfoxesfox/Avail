"use client";

import type { Schedule } from "@/lib/supabase";
import { FREE } from "@/lib/grid";
import { formatHour, formatLength } from "@/lib/format";
import { PaintGrid, type BookedRun } from "../../availability";
import { loadOpenTimes, saveOpenTimes } from "./actions";

/** Booking pages: the host paints when people can book them, on the same grid members use. */
export function OpenTimes({ s, token, booked }: { s: Schedule; token: string | null; booked: BookedRun[] }) {
  const meeting = s.meetingMinutes ?? 0;
  const slots = meeting / s.slotMinutes;
  // Group pages run fixed sessions from the first hour; spell out the first few so hosts can paint whole sessions.
  const group = (s.capacity ?? 1) > 1;
  const sessions = [0, 1, 2].map((i) => s.dayStartMin + i * meeting).filter((m) => m + meeting <= s.dayEndMin).map(formatHour);
  return (
    <PaintGrid s={s} loadKey={s.shareId} readOnly={false} blankMeans="not bookable" booked={booked} sessionMinutes={group && slots > 1 ? meeting : undefined}
      modes={[{ state: FREE, label: "Free" }, { state: 0, label: "Clear" }]}
      load={() => loadOpenTimes(s.shareId, token)}
      save={(rows) => saveOpenTimes(s.shareId, token, rows)}
      onLoadFail={() => {}}
      header={
        <div>
          <h2 className="text-lg font-bold">Your free times</h2>
          <p className="mt-1 max-w-prose text-sm text-ink-soft">
            {group ? <>
              Paint when people can join you. Sessions are {formatLength(meeting)} and start at {sessions.join(", ")} and so on
              {slots > 1 && <>, divided by the darker lines</>}; a session opens only if you&apos;re free for all of it.
            </> : <>
              Paint when people can book you. Each meeting is {formatLength(meeting)} ({slots} {slots === 1 ? "slot" : "slots"}), so a
              start time only appears if the whole meeting fits inside your free times.
            </>} Booked times are outlined with who booked, and stay free until you cancel the booking.
          </p>
        </div>
      }
      closedNote={null} />
  );
}
