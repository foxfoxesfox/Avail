"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { parseScheduleForm, type Field } from "@/lib/schedule-form";

export type CreateState = { errors?: Partial<Record<Field, string>>; message?: string; values?: Record<string, string | string[]> };

const ZONES = new Set([...Intl.supportedValuesOf("timeZone"), "UTC"]);

export async function createSchedule(_prev: CreateState, form: FormData): Promise<CreateState> {
  const get = (k: string) => String(form.get(k) ?? "");
  const getAll = (k: string) => form.getAll(k).map(String);
  // Echo the fields back so a failed submit keeps what was typed.
  const values = Object.fromEntries(
    ["title", "startDate", "endDate", "startHour", "endHour", "slotMinutes", "timeZone", "deadline", "visibility", "members"].map((k) => [k, get(k)]),
  );
  const echo = { ...values, weekdays: getAll("weekdays") };

  const parsed = parseScheduleForm(get, getAll, ZONES);
  if (!parsed.ok) return { errors: parsed.errors, values: echo };
  const v = parsed.value;

  const { data, error } = await supabase.rpc("create_schedule", {
    p_title: v.title,
    p_start_date: v.startDate,
    p_end_date: v.endDate,
    p_weekdays: v.weekdays,
    p_day_start_min: v.dayStartMin,
    p_day_end_min: v.dayEndMin,
    p_slot_minutes: v.slotMinutes,
    p_time_zone: v.timeZone,
    p_deadline_local: v.deadlineLocal,
    p_show_names: v.showNames,
    p_members: v.members,
  });
  if (error) {
    if (error.message.includes("deadline has passed")) return { errors: { deadlineLocal: "That time has already passed." }, values: echo };
    console.error("create_schedule failed", error);
    return { message: "Couldn't create the schedule. Nothing was saved; try again.", values: echo };
  }

  const { share_id, admin_token } = data[0];
  redirect(`/s/${share_id}/manage/${admin_token}`);
}
