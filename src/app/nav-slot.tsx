"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Top bar, right side: names the current page on /new, otherwise offers it.
export function NavSlot() {
  const here = usePathname() === "/new";
  return here ? (
    <span aria-current="page" className="text-sm font-medium text-ink-soft">New schedule</span>
  ) : (
    <Link href="/new" className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline">
      New schedule
    </Link>
  );
}
