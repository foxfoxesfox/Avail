import "server-only";
import { createClient } from "@supabase/supabase-js";

// Publishable key only: tables are locked, so everything goes through the
// security-definer functions in supabase/migrations.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } },
);

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
  showNames: boolean;
  createdAt: string;
  participants: { id: string; name: string; hasPin: boolean; isKey: boolean }[];
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

export async function getScheduleAsOrganizer(shareId: string, token: string): Promise<Schedule | null> {
  const { data, error } = await supabase.rpc("get_schedule_admin", { p_share_id: shareId, p_token: token });
  if (error) throw error;
  return data;
}
