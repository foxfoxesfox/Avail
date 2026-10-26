"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";

export async function acceptInvite(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const token = String(form.get("token") ?? "");
  if (!/^[\w-]{16,64}$/.test(token)) return { error: "This invite link isn't valid." };
  const { data, error } = await (await db()).rpc("accept_invite", { p_token: token });
  if (error || !data) return { error: "This invite has been used or has expired. Ask the organizer for a new one." };
  redirect(`/s/${data}/manage`);
}
