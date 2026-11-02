import { getBooking } from "@/lib/supabase";
import { toICS } from "@/lib/calendar";

// A visitor's booking as a calendar file.
export async function GET(_req: Request, ctx: RouteContext<"/s/[id]/booked/[token]/event">) {
  const { id, token } = await ctx.params;
  const b = await getBooking(token);
  if (!b || b.shareId !== id || b.cancelled) return new Response("Not found", { status: 404 });
  const session = { id: b.id, day: b.day, startMin: b.startMin, endMin: b.endMin, location: b.location, link: null, notes: null };
  return new Response(toICS([{ title: b.title, timeZone: b.timeZone, session }], new Date()), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="avail-booking-${b.day}.ics"` },
  });
}
