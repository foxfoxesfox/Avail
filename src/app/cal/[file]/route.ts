import { getFeed } from "@/lib/supabase";
import { toICS } from "@/lib/calendar";

// A member's private feed, /cal/<token>.ics. Calendar apps poll it, so cancelled sessions drop out on their own.
export async function GET(_req: Request, ctx: RouteContext<"/cal/[file]">) {
  const token = (await ctx.params).file.replace(/\.ics$/, "");
  const f = /^[\w-]{16,64}$/.test(token) ? await getFeed(token) : null;
  if (!f) return new Response("Not found", { status: 404 });
  const events = f.sessions.map((session) => ({ title: f.title, timeZone: f.timeZone, session }));
  return new Response(toICS(events, new Date(), `${f.title} · Avail`), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" },
  });
}
