import Link from "next/link";
import { currentUser } from "@/lib/supabase";

const link = "text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline";

// Top bar: "Sign in" for guests, "Your schedules" once signed in. The email stays off the header (it ends up in
// screenshots shared to group chats); Your schedules and the sign-in page say which account it is.
export async function AccountSlot() {
  const user = await currentUser();
  return user ? <Link href="/account" className={link}>Your schedules</Link> : <Link href="/sign-in" className={link}>Sign in</Link>;
}
