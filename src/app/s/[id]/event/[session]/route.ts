import { getSchedule } from "@/lib/supabase";
import { toICS } from "@/lib/calendar";

// One confirmed session as a calendar file (Apple Calendar, Outlook desktop, anything that opens .ics).
export async function GET(_req: Request, ctx: RouteContext<"/s/[id]/event/[session]">) {
  const { id, session } = await ctx.params;
  const s = await getSchedule(id);
  const x = s?.sessions.find((v) => v.id === session);
  if (!s || !x) return new Response("Not found", { status: 404 });
  return new Response(toICS([{ title: s.title, timeZone: s.timeZone, session: x }], new Date()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="avail-${x.day}-${String(Math.floor(x.startMin / 60)).padStart(2, "0")}${String(x.startMin % 60).padStart(2, "0")}.ics"`,
    },
  });
}
