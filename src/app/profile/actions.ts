"use server";

import { refresh } from "next/cache";
import { currentUser, db, serverOnly } from "@/lib/supabase";

export type NameState = { saved?: string; error?: string };

/** The name on your profile: filled in as the host on new booking pages. Blank clears it. */
export async function saveName(_prev: NameState, form: FormData): Promise<NameState> {
  if (!(await currentUser())) return { error: "Sign in again to save your name." };
  const name = String(form.get("name") ?? "").trim();
  if (name.length > 60) return { error: "Keep it under 60 characters." };
  const { error } = await (await db()).auth.updateUser({ data: { name: name || null } });
  if (error) return { error: "Couldn't save it. Try again." };
  refresh();
  return { saved: name };
}

/** Deletes the signed-in account after the email is typed back. Its organizer roles and invites go with it, and any names
 *  it claimed are unlinked; schedules stay for their other organizers and organizer links. */
export async function deleteAccount(typed: string): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return { error: "Sign in again to delete your account." };
  if (typed.trim().toLowerCase() !== user.email.toLowerCase()) return { error: "That isn't your account's email." };
  const { error } = await serverOnly.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("deleteUser failed", error);
    return { error: "Couldn't delete it. Nothing changed; try again." };
  }
  await (await db()).auth.signOut({ scope: "local" });
  refresh(); // the header and cached pages forget the session
  return {};
}
