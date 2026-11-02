import Link from "next/link";
import { currentUser } from "@/lib/supabase";

const link = "text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline";

// Top bar: "Sign in" for guests; once signed in, "Your schedules" with the account's initial, so being signed in shows
// at a glance. The full email stays off the header (it ends up in screenshots shared to group chats); Your schedules
// says which account it is.
export async function AccountSlot() {
  const user = await currentUser();
  if (!user) return <Link href="/sign-in" className={link}>Sign in</Link>;
  return (
    <Link href="/account" className={`${link} group flex items-center gap-2`}>
      Your schedules<span className="sr-only"> (signed in)</span>
      <span aria-hidden className="grid size-7 place-items-center rounded-full bg-indigo-wash text-xs font-bold text-indigo no-underline transition-colors duration-150 group-hover:bg-indigo-wash-hover">
        {(user.email ?? "?").charAt(0).toUpperCase()}
      </span>
    </Link>
  );
}
