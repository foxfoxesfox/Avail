"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/supabase";

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
