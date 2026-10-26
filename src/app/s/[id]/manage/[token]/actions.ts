"use server";

import { refresh } from "next/cache";
import { supabase } from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function checkOrganizer(shareId: string, token: string) {
  if (typeof shareId !== "string" || shareId.length > 32 || typeof token !== "string" || token.length > 64) {
    throw new Error("Invalid request");
  }
}

export async function setKeyMember(shareId: string, token: string, pid: string, isKey: boolean) {
  checkOrganizer(shareId, token);
  if (!UUID.test(pid) || typeof isKey !== "boolean") throw new Error("Invalid request");
  const { error } = await supabase.rpc("set_key_member", { p_share_id: shareId, p_token: token, p_participant: pid, p_key: isKey });
  if (error) throw error;
  refresh();
}

export type SessionInput = { day: string; startMin: number; endMin: number; location: string; link: string; notes: string };

export async function confirmSession(shareId: string, token: string, v: SessionInput): Promise<{ error?: string }> {
  checkOrganizer(shareId, token);
  if (!DAY.test(v.day) || !Number.isInteger(v.startMin) || !Number.isInteger(v.endMin)) throw new Error("Invalid request");
  const location = String(v.location ?? "").trim(), link = String(v.link ?? "").trim(), notes = String(v.notes ?? "").trim();
  if (location.length > 200 || notes.length > 1000) return { error: "Location or notes are too long." };
  if (link && (link.length > 500 || !/^https?:\/\//i.test(link))) return { error: "Video link must start with https://" };
  const { error } = await supabase.rpc("confirm_session", {
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

export async function cancelSession(shareId: string, token: string, sessionId: string) {
  checkOrganizer(shareId, token);
  if (!UUID.test(sessionId)) throw new Error("Invalid request");
  const { error } = await supabase.rpc("cancel_session", { p_share_id: shareId, p_token: token, p_session: sessionId });
  if (error) throw error;
  refresh();
}
