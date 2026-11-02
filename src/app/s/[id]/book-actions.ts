"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { refresh } from "next/cache";
import { serverOnly, supabase } from "@/lib/supabase";
import { isHuman } from "@/lib/turnstile";
import { notifyBooking } from "@/lib/booking-notify";

export type BookState = { errors?: { name?: string; email?: string }; message?: string; taken?: number; values?: { name: string; email: string } };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Bookable starts on a booking page as [day, minute, places left]. */
export async function loadStarts(shareId: string): Promise<[string, number, number][]> {
  if (typeof shareId !== "string" || shareId.length > 32) throw new Error("Invalid request");
  const { data, error } = await supabase.rpc("get_booking_starts", { p_share_id: shareId });
  if (error) throw error;
  return data;
}

export async function bookTime(_prev: BookState, form: FormData): Promise<BookState> {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const [shareId, day, start] = [get("shareId"), get("day"), Number(get("start"))];
  const values = { name: get("name"), email: get("email") };
  if (shareId.length > 32 || !DAY.test(day) || !Number.isInteger(start) || start < 0 || start > 1439) throw new Error("Invalid request");

  const errors: BookState["errors"] = {};
  if (!values.name) errors.name = "Type your name.";
  else if (values.name.length > 60) errors.name = "Keep it under 60 characters.";
  if (!EMAIL.test(values.email) || values.email.length > 254) errors.email = "Type an email address, like alex@example.com.";
  if (errors.name || errors.email) return { errors, values };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await isHuman(get("cf-turnstile-response"), ip))) {
    return { message: "Couldn't confirm you're a person. Wait a moment, then press Book again.", values };
  }

  // The visitor's browser zone, only to show them the time on their own clock; the database drops unknown names.
  const zone = get("zone").slice(0, 64) || null;
  const { data, error } = await serverOnly.rpc("book_time", {
    p_share_id: shareId, p_day: day, p_start_min: start, p_name: values.name, p_email: values.email, p_zone: zone,
  });
  if (error?.message.includes("time not available")) {
    return { message: "Sorry, that time was just taken or is no longer open. Pick another.", taken: Date.now(), values };
  }
  if (error?.message.includes("already booked")) {
    return { errors: { email: "This email already has a booking at that time." }, values };
  }
  if (error) {
    console.error("book_time failed", error);
    return { message: "Couldn't book that time. Nothing was saved; try again.", values };
  }
  notifyBooking({ booked: data });
  redirect(`/s/${shareId}/booked/${data}`);
}

/** Cancel from the booking's private link; the place opens again. */
export async function cancelBooking(token: string) {
  if (typeof token !== "string" || token.length > 64) throw new Error("Invalid request");
  const { data, error } = await supabase.rpc("cancel_booking", { p_token: token });
  if (error) throw error;
  if (data) notifyBooking({ visitorCancelled: token });
  refresh();
}
