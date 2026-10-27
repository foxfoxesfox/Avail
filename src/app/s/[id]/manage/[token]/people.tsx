"use client";

import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import type { Schedule } from "@/lib/supabase";
import { Confirm } from "../../../confirm";
import { addPeople, removePerson, renamePerson } from "./actions";

const quiet = "rounded-full bg-indigo-wash px-5 py-3 text-sm font-bold text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover aria-disabled:opacity-60";
const field = "min-w-0 flex-1 rounded-[10px] border border-rule bg-sheet px-3.5 py-3 text-base text-ink placeholder:text-ink-soft aria-[invalid=true]:border-vermilion";
const labelCls = "mb-1.5 block text-xs font-bold tracking-[0.06em] text-ink-soft uppercase";

/** The schedule's people, always visible on the organizer page: changes apply at once, one row at a time. */
export function People({ s, token }: { s: Schedule; token: string | null }) {
  const [rowPending, startRow] = useTransition();
  const [adding, startAdd] = useTransition();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [said, setSaid] = useState("");
  const addField = useRef<HTMLTextAreaElement>(null);
  const setError = (at: string, msg?: string) => setErrors((e) => ({ ...e, [at]: msg ?? "" }));
  const back = (id: string) => document.getElementById(id)?.focus();
  const closeRename = (pid: string) => { setError(pid); flushSync(() => setRenaming(null)); back(`rename-${pid}`); };

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">People <span className="font-normal text-ink-soft">· {s.participants.length}</span></h2>
      <p aria-live="polite" className="sr-only">{said}</p>
      <ul className="mt-3 border-t border-ink">
        {s.participants.map((p) => (
          <li key={p.id} className="border-b border-rule py-2.5">
            {renaming === p.id ? (
              <form className="flex flex-wrap gap-2" onSubmit={(e) => {
                e.preventDefault();
                if (rowPending) return;
                const name = String(new FormData(e.currentTarget).get("name")).trim();
                if (!name) return setError(p.id, "Type a name.");
                startRow(async () => {
                  const r = await renamePerson(s.shareId, token, p.id, name);
                  if (r.error) return setError(p.id, r.error);
                  setSaid(`Renamed to ${name}.`);
                  closeRename(p.id);
                });
              }}>
                <label htmlFor={`name-${p.id}`} className="sr-only">New name for {p.name}</label>
                <input id={`name-${p.id}`} name="name" defaultValue={p.name} maxLength={40} autoFocus autoComplete="off"
                  onKeyDown={(e) => { if (e.key === "Escape") closeRename(p.id); }}
                  aria-invalid={!!errors[p.id]} aria-describedby={errors[p.id] ? `err-${p.id}` : undefined} className={field} />
                <button type="button" onClick={() => closeRename(p.id)} className={quiet}>Cancel</button>
                <button aria-disabled={rowPending} className="rounded-full bg-indigo px-5 py-3 text-sm font-bold text-white hover:bg-indigo-deep aria-disabled:opacity-60">
                  {rowPending ? "Saving…" : "Save"}
                </button>
              </form>
            ) : removing === p.id ? (
              <Confirm busy={rowPending}
                question={<>Remove <b>{p.name}</b>? Their answers are deleted{p.claimed ? ", and the name is unlinked from their account" : " too"}.</>}
                yes="Yes, remove" busyYes="Removing…"
                onKeep={() => { setError(p.id); flushSync(() => setRemoving(null)); back(`remove-${p.id}`); }}
                onYes={() => startRow(async () => {
                  const r = await removePerson(s.shareId, token, p.id);
                  if (r.error) return setError(p.id, r.error);
                  setRemoving(null);
                  setSaid(`Removed ${p.name}.`);
                  addField.current?.focus();
                })} />
            ) : (
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 font-medium">
                  {p.name}
                  {p.claimed && <span className="font-normal text-ink-soft"> · linked to an account</span>}
                </p>
                <button type="button" id={`rename-${p.id}`} onClick={() => { setError(p.id); setRenaming(p.id); }} className={quiet}
                  aria-label={`Rename ${p.name}`}>Rename</button>
                <button type="button" id={`remove-${p.id}`} onClick={() => { setError(p.id); setRemoving(p.id); }} className={quiet}
                  aria-label={`Remove ${p.name}`}>Remove</button>
              </div>
            )}
            {errors[p.id] && <p id={`err-${p.id}`} role="alert" className="mt-1.5 text-sm font-medium text-vermilion">{errors[p.id]}</p>}
          </li>
        ))}
      </ul>
      <form className="mt-4" onSubmit={(e) => {
        e.preventDefault();
        if (adding) return;
        const f = e.currentTarget;
        const text = String(new FormData(f).get("names")).trim();
        if (!text) return setError("add", "Type a name.");
        startAdd(async () => {
          const r = await addPeople(s.shareId, token, text);
          setError("add", r.errors.length ? `Not added: ${r.errors.join(" · ")}` : undefined);
          if (r.added.length) setSaid(`Added ${r.added.join(", ")}.`);
          // Leave only the names that still need fixing.
          (f.elements.namedItem("names") as HTMLTextAreaElement).value = r.failed.join("\n");
          addField.current?.focus();
        });
      }}>
        <label htmlFor="add-people" className={labelCls}>Add people · one per line or separated by commas</label>
        <div className="flex flex-wrap items-start gap-2">
          <textarea id="add-people" ref={addField} name="names" rows={2} autoComplete="off" placeholder={"Jordan\nChris"}
            aria-invalid={!!errors.add} aria-describedby={errors.add ? "err-add" : undefined}
            className={`${field} dot-lines resize-y leading-[1.75rem]`} />
          <button aria-disabled={adding} className={quiet}>{adding ? "Adding…" : "Add"}</button>
        </div>
      </form>
      {errors.add && <p id="err-add" role="alert" className="mt-1.5 text-sm font-medium text-vermilion">{errors.add}</p>}
      <p className="mt-2 text-sm text-ink-soft">New names appear in the share link&apos;s name list straight away.</p>
    </section>
  );
}
