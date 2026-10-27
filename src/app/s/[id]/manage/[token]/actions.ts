"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/supabase";
import { MAX_MEMBERS, parseMembers, parseScheduleForm } from "@/lib/schedule-form";
import type { CreateState } from "@/app/new/actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// token is null on the account route (/s/[id]/manage): the database then checks the signed-in account instead.
function checkOrganizer(shareId: string, token: string | null) {
  if (typeof shareId !== "string" || shareId.length > 32 || (token !== null && (typeof token !== "string" || token.length > 64))) {
    throw new Error("Invalid request");
  }
}

export async function setKeyMember(shareId: string, token: string | null, pid: string, isKey: boolean) {
  checkOrganizer(shareId, token);
  if (!UUID.test(pid) || typeof isKey !== "boolean") throw new Error("Invalid request");
  const { error } = await (await db()).rpc("set_key_member", { p_share_id: shareId, p_token: token, p_participant: pid, p_key: isKey });
  if (error) throw error;
  refresh();
}

export type SessionInput = { day: string; startMin: number; endMin: number; location: string; link: string; notes: string };

export async function confirmSession(shareId: string, token: string | null, v: SessionInput): Promise<{ error?: string }> {
  checkOrganizer(shareId, token);
  if (!DAY.test(v.day) || !Number.isInteger(v.startMin) || !Number.isInteger(v.endMin)) throw new Error("Invalid request");
  const location = String(v.location ?? "").trim(), link = String(v.link ?? "").trim(), notes = String(v.notes ?? "").trim();
  if (location.length > 200 || notes.length > 1000) return { error: "Location or notes are too long." };
  if (link && (link.length > 500 || !/^https?:\/\//i.test(link))) return { error: "Video link must start with https://" };
  const { error } = await (await db()).rpc("confirm_session", {
    p_share_id: shareId, p_token: token, p_day: v.day, p_start_min: v.startMin, p_end_min: v.endMin,
    p_location: location, p_link: link, p_notes: notes,
  });
  if (error) {
    console.error("confirm_session failed", error);
    return { error: error.message.includes("outside") ? "That time is outside the schedule." : "Couldn't confirm. Try again." };
  }
  refresh();
  return {};
}

export async function cancelSession(shareId: string, token: string | null, sessionId: string) {
  checkOrganizer(shareId, token);
  if (!UUID.test(sessionId)) throw new Error("Invalid request");
  const { error } = await (await db()).rpc("cancel_session", { p_share_id: shareId, p_token: token, p_session: sessionId });
  if (error) throw error;
  refresh();
}

/** Add this schedule to the signed-in account through its organizer link. */
export async function addToMySchedules(shareId: string, token: string) {
  checkOrganizer(shareId, token);
  if (!token) throw new Error("Invalid request");
  const { error } = await (await db()).rpc("add_organizer", { p_share_id: shareId, p_token: token });
  if (error) throw error;
  refresh();
}

export async function removeOrganizer(shareId: string, token: string | null, userId: string) {
  checkOrganizer(shareId, token);
  if (!UUID.test(userId)) throw new Error("Invalid request");
  const { error } = await (await db()).rpc("remove_organizer", { p_share_id: shareId, p_token: token, p_user: userId });
  if (error) throw error;
  refresh();
}

/** Owner only: a new organizer link; the old one stops working. */
export async function newOrganizerLink(shareId: string): Promise<string | null> {
  checkOrganizer(shareId, null);
  const { data, error } = await (await db()).rpc("new_organizer_link", { p_share_id: shareId });
  if (error) return null;
  return data;
}

/** Owner only: a one-time co-organizer invite secret (valid 7 days), or null. */
export async function createInvite(shareId: string): Promise<string | null> {
  checkOrganizer(shareId, null);
  const { data, error } = await (await db()).rpc("create_invite", { p_share_id: shareId });
  if (error) return null;
  return data;
}

export type EditState = CreateState & { saved?: number };

/** Save the edited setup. Time zone and people aren't part of this form. */
export async function updateSchedule(shareId: string, token: string | null, _prev: EditState, form: FormData): Promise<EditState> {
  checkOrganizer(shareId, token);
  const get = (k: string) => String(form.get(k) ?? "");
  const values = Object.fromEntries(
    ["title", "startDate", "endDate", "startHour", "endHour", "slotMinutes", "timeZone", "deadline", "visibility"].map((k) => [k, get(k)]),
  );
  const echo = { ...values, weekdays: form.getAll("weekdays").map(String) };
  const parsed = parseScheduleForm(get, (k) => form.getAll(k).map(String), new Set([get("timeZone")]), { edit: true });
  if (!parsed.ok) return { errors: parsed.errors, values: echo };
  const v = parsed.value;
  const { error } = await (await db()).rpc("update_schedule", {
    p_share_id: shareId, p_token: token, p_title: v.title, p_start_date: v.startDate, p_end_date: v.endDate,
    p_weekdays: v.weekdays, p_day_start_min: v.dayStartMin, p_day_end_min: v.dayEndMin, p_slot_minutes: v.slotMinutes,
    p_deadline_local: v.deadlineLocal, p_show_names: v.showNames,
  });
  if (error) {
    if (error.message.includes("slots can only get smaller")) return { errors: { slotMinutes: "People have answered, so slots can only get smaller (60 → 30 → 15)." }, values: echo };
    if (error.message.includes("does not fit")) return { errors: { slotMinutes: "A confirmed session doesn't line up with that slot size." }, values: echo };
    console.error("update_schedule failed", error);
    return { message: "Couldn't save. Nothing was changed; try again.", values: echo };
  }
  refresh();
  return { saved: Date.now() };
}

export async function setAnswersOpen(shareId: string, token: string | null, open: boolean) {
  checkOrganizer(shareId, token);
  const { error } = await (await db()).rpc("set_answers_open", { p_share_id: shareId, p_token: token, p_open: open === true });
  if (error) throw error;
  refresh();
}

// People: one at a time, so a typo can never delete someone's answers by accident.
const PERSON_ERRORS: [string, string][] = [
  ["already on the schedule", "That name is already on the schedule."],
  ["1 to 40", "Use 1 to 40 characters."],
  ["up to 50", "Up to 50 people per schedule."],
  ["at least one person", "A schedule needs at least one person."],
];
const personError = (msg: string) => PERSON_ERRORS.find(([k]) => msg.includes(k))?.[1] ?? "Couldn't save. Try again.";

/** Add one or more names (one per line or comma-separated, as on the create form). Reports what was added and what wasn't. */
export async function addPeople(shareId: string, token: string | null, text: string): Promise<{ added: string[]; failed: string[]; errors: string[] }> {
  checkOrganizer(shareId, token);
  const names = parseMembers(String(text).slice(0, 5000)).slice(0, MAX_MEMBERS);
  const client = await db();
  const added: string[] = [], failed: string[] = [], errors: string[] = [];
  for (const name of names) {
    const { error } = await client.rpc("add_participant", { p_share_id: shareId, p_token: token, p_name: name });
    if (error) { failed.push(name); errors.push(`${name}: ${personError(error.message)}`); }
    else added.push(name);
  }
  if (added.length) refresh();
  return { added, failed, errors };
}

export async function renamePerson(shareId: string, token: string | null, pid: string, name: string): Promise<{ error?: string }> {
  checkOrganizer(shareId, token);
  if (!UUID.test(pid)) throw new Error("Invalid request");
  const { error } = await (await db()).rpc("rename_participant", { p_share_id: shareId, p_token: token, p_participant: pid, p_name: String(name).slice(0, 200) });
  if (error) return { error: personError(error.message) };
  refresh();
  return {};
}

export async function removePerson(shareId: string, token: string | null, pid: string): Promise<{ error?: string }> {
  checkOrganizer(shareId, token);
  if (!UUID.test(pid)) throw new Error("Invalid request");
  const { error } = await (await db()).rpc("remove_participant", { p_share_id: shareId, p_token: token, p_participant: pid });
  if (error) return { error: personError(error.message) };
  refresh();
  return {};
}

/** A new share link; the old one stops working. Returns the new share id, or null. */
export async function resetShareLink(shareId: string, token: string | null): Promise<string | null> {
  checkOrganizer(shareId, token);
  const { data, error } = await (await db()).rpc("reset_share_link", { p_share_id: shareId, p_token: token });
  if (error) return null;
  return data;
}
