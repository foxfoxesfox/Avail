import Link from "next/link";
import type { MySchedule } from "@/lib/supabase";
import { formatDateRange } from "@/lib/format";

const ROLE = { owner: "Organizer", co: "Co-organizer" } as const;

/** The signed-in account's schedules as a ruled list: organizers go to the organizer page, members to the share page. */
export function ScheduleList({ list }: { list: MySchedule[] }) {
  if (!list.length) return <p className="mt-3 text-sm text-ink-soft">None yet. Schedules you create or join while signed in appear here.</p>;
  return (
    <ul className="mt-3 border-t border-ink">
      {list.map((x) => (
        <li key={x.shareId} className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-rule py-2.5">
          <Link href={x.role ? `/s/${x.shareId}/manage` : `/s/${x.shareId}`} className="font-bold text-indigo underline-offset-4 hover:underline">
            {x.title}
          </Link>
          <span className="text-sm text-ink-soft">
            {x.role ? `${ROLE[x.role]}${x.name ? `, you're ${x.name}` : ""}` : `Member as ${x.name}`} · {formatDateRange(x.startDate, x.endDate)}
          </span>
        </li>
      ))}
    </ul>
  );
}
