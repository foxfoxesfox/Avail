import Link from "next/link";
import { currentUser } from "@/lib/supabase";

const link = "text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline";

// Top bar: "Sign in" for guests; once signed in, "Your schedules" and a round profile button with the account's initial,
// so being signed in shows at a glance. The full email stays off the header (it ends up in screenshots shared to group
// chats); the profile page says which account it is.
export async function AccountSlot() {
  const user = await currentUser();
  if (!user) return <Link href="/sign-in" className={link}>Sign in</Link>;
  return (
    <>
      <Link href="/account" className={link}>Your schedules</Link>
      <Link href="/profile" aria-label="Your profile"
        className="grid size-8 place-items-center rounded-full bg-indigo-wash text-sm font-bold text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover">
        {(user.email ?? "?").charAt(0).toUpperCase()}
      </Link>
    </>
  );
}
