"use server";

import { supabase } from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PIN = /^\d{4,8}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function checkMember(shareId: string, pid: string, pin: string | null) {
  if (typeof shareId !== "string" || shareId.length > 32 || !UUID.test(pid) || (pin !== null && !PIN.test(pin))) {
    throw new Error("Invalid request");
  }
}

/** The member's saved answers as [day, minute, state] rows, or null when the PIN doesn't match. */
export async function loadMine(shareId: string, pid: string, pin: string | null): Promise<[string, number, number][] | null> {
  checkMember(shareId, pid, pin);
  const { data, error } = await supabase.rpc("get_my_availability", { p_share_id: shareId, p_participant: pid, p_pin: pin });
  if (error) throw error;
  return data;
}

export async function setPin(shareId: string, pid: string, pin: string): Promise<boolean> {
  checkMember(shareId, pid, pin);
  const { data, error } = await supabase.rpc("set_pin", { p_share_id: shareId, p_participant: pid, p_pin: pin });
  if (error) throw error;
  return data;
}

export async function saveMine(
  shareId: string, pid: string, pin: string | null,
  rows: { days: string[]; minutes: number[]; states: number[] },
): Promise<{ ok: boolean }> {
  checkMember(shareId, pid, pin);
  const { days, minutes, states } = rows;
  const n = days.length;
  if (n > 20000 || minutes.length !== n || states.length !== n
      || !days.every((d) => DAY.test(d)) || !minutes.every(Number.isInteger) || !states.every((s) => s === 1 || s === 2)) {
    throw new Error("Invalid request");
  }
  const { error } = await supabase.rpc("save_availability", {
    p_share_id: shareId, p_participant: pid, p_pin: pin, p_days: days, p_minutes: minutes, p_states: states,
  });
  if (error) console.error("save_availability failed", error);
  return { ok: !error };
}

export type Totals = {
  people: number;
  replied: number;
  pending: string[] | null; // null when names are hidden from this viewer
  slots: [string, number, number, number, string[] | null, string[] | null][]; // day, minute, free, if needed, names…
};

/** Group totals per slot. Pass the organizer token to see names even when the schedule hides them. */
export async function getTotals(shareId: string, token: string | null): Promise<Totals | null> {
  if (typeof shareId !== "string" || shareId.length > 32 || (token !== null && (typeof token !== "string" || token.length > 64))) {
    throw new Error("Invalid request");
  }
  const { data, error } = await supabase.rpc("get_totals", { p_share_id: shareId, p_token: token });
  if (error) throw error;
  return data;
}
