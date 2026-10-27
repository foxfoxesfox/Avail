"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Schedule } from "@/lib/supabase";
import { toLocalInput } from "@/lib/format";
import { CreateForm } from "@/app/new/create-form";
import { ScheduleSummary } from "../../../summary";
import { Confirm } from "../../../confirm";
import { updateSchedule } from "./actions";

const quiet = "rounded-full bg-indigo-wash px-5 py-3 text-sm font-bold text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover";

/** Details on the organizer page: the summary, or (Edit) the setup form. People are edited in their own section. */
export function Details({ s, token }: { s: Schedule; token: string | null }) {
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [asking, setAsking] = useState(false);
  const [said, setSaid] = useState("");
  const editBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const finish = (message: string) => {
    flushSync(() => { setEditing(false); setDirty(false); setAsking(false); setSaid(message); });
    editBtn.current?.focus();
  };

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">{editing ? "Edit schedule" : "Details"}</h2>
        {!editing ? (
          <button type="button" ref={editBtn} onClick={() => { setSaid(""); setEditing(true); }} className={quiet}>Edit</button>
        ) : !asking && (
          // Closing never saves: with changes, ask before throwing them away.
          <button type="button" ref={closeBtn} onClick={() => (dirty ? setAsking(true) : finish(""))} className={quiet}>Close</button>
        )}
      </div>
      <p aria-live="polite" className={said ? "mb-3 text-sm font-medium" : "sr-only"}>{said}</p>
      {editing && asking && (
        <div className="mb-5">
          <Confirm busy={false} question="Discard your changes to the schedule?" yes="Yes, discard" busyYes="Discarding…"
            onKeep={() => { flushSync(() => setAsking(false)); closeBtn.current?.focus(); }}
            onYes={() => finish("Changes discarded.")} />
        </div>
      )}
      {!editing ? <ScheduleSummary s={s} /> : (
        <>
          <p className="mb-5 text-sm text-ink-soft">
            Answers are kept: shrinking the dates or hours only hides answers outside them, and they come back if you widen it again.
          </p>
          <CreateForm zones={[]}
            defaults={{
              title: s.title, startDate: s.startDate, endDate: s.endDate, weekdays: s.weekdays.map(String),
              startHour: String(s.dayStartMin / 60), endHour: String(s.dayEndMin / 60), slotMinutes: String(s.slotMinutes),
              timeZone: s.timeZone, deadline: s.deadline ? toLocalInput(s.deadline, s.timeZone) : "",
              visibility: s.showNames ? "names" : "counts",
            }}
            edit={{
              action: (prev, form) => updateSchedule(s.shareId, token, prev, form), people: s.participants.length,
              onDone: () => finish("Saved. Members see the new setup now."), onDirty: () => setDirty(true),
            }} />
        </>
      )}
    </section>
  );
}
