import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Publishable key only: tables are locked, so everything goes through the
// security-definer functions in supabase/migrations.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } },
);

// Server-only client with the secret key, for the one call the public key may not make: creating schedules
// (so the bot check in front of it can't be skipped by calling the database directly).
// shortcut: falls back to the public key until SUPABASE_SECRET_KEY is set; the lock migration then requires it.
export const serverOnly = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } },
);

/** Request-scoped client that carries the signed-in person's session, so functions can check auth.uid(). */
export async function db() {
  // Session checks read the clock, which prerendering (including runtime prefetches) forbids: wait for the real request.
  await connection();
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        // Server Components can't set cookies; the proxy refreshes the session instead.
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {}
      },
    },
  });
}

export type User = { id: string; email: string };

/** The signed-in person, verified from the session token, or null. */
export async function currentUser(): Promise<User | null> {
  const { data } = await (await db()).auth.getClaims();
  const c = data?.claims;
  return c ? { id: c.sub, email: String(c.email ?? "") } : null;
}

export type Schedule = {
  shareId: string;
  title: string;
  kind: "dates";
  startDate: string;
  endDate: string;
  weekdays: number[];
  dayStartMin: number;
  dayEndMin: number;
  slotMinutes: number;
  timeZone: string;
  deadline: string | null;
  closed: boolean; // answers closed: the deadline has passed
  showNames: boolean;
  createdAt: string;
  participants: { id: string; name: string; hasPin: boolean; isKey: boolean; claimed: boolean }[];
  sessions: Session[];
};

export type Session = {
  id: string;
  day: string;
  startMin: number;
  endMin: number;
  location: string | null;
  link: string | null;
  notes: string | null;
};

export async function getSchedule(shareId: string): Promise<Schedule | null> {
  const { data, error } = await supabase.rpc("get_schedule", { p_share_id: shareId });
  if (error) throw error;
  return data;
}

/** The schedule when the organizer link's secret matches or the signed-in account organizes it. */
export async function getScheduleAsOrganizer(shareId: string, token: string | null): Promise<Schedule | null> {
  const { data, error } = await (await db()).rpc("get_schedule_admin", { p_share_id: shareId, p_token: token });
  if (error) throw error;
  return data;
}

export type Feed = { title: string; timeZone: string; name: string; sessions: Session[] };

export async function getFeed(token: string): Promise<Feed | null> {
  const { data, error } = await supabase.rpc("get_feed", { p_token: token });
  if (error) throw error;
  return data;
}

export type Organizers = { myRole: "owner" | "co" | null; people: { userId: string; email: string; role: "owner" | "co"; isMe: boolean }[] };

export async function getOrganizers(shareId: string, token: string | null): Promise<Organizers | null> {
  const { data, error } = await (await db()).rpc("get_organizers", { p_share_id: shareId, p_token: token });
  if (error) throw error;
  return data;
}

export type MySchedule = { shareId: string; title: string; startDate: string; endDate: string; role: "owner" | "co" | null; name: string | null };

export async function getMySchedules(): Promise<MySchedule[]> {
  const { data, error } = await (await db()).rpc("my_schedules");
  if (error) throw error;
  return data;
}

export async function getMyParticipant(shareId: string): Promise<string | null> {
  const { data, error } = await (await db()).rpc("my_participant", { p_share_id: shareId });
  if (error) throw error;
  return data;
}

/** A co-organizer invite that can still be accepted, or null (used, expired or unknown). */
export async function getInvite(token: string): Promise<{ title: string; shareId: string } | null> {
  const { data, error } = await supabase.rpc("get_invite", { p_token: token });
  if (error) throw error;
  return data;
}
