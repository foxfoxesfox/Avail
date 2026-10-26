import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { currentUser } from "@/lib/supabase";
import { safeNext } from "@/lib/auth";
import { EmailForm } from "./email-form";
import { googleSignIn, signOut } from "./actions";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

const h1 = "text-[1.875rem] leading-tight font-bold tracking-[-0.02em]";

const ERRORS: Record<string, string> = {
  link: "That sign-in link has expired or was already used. Send yourself a new one.",
  google: "Couldn't start Google sign-in. Try again, or use an email link.",
};

async function Content({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const q = await searchParams;
  const next = safeNext(typeof q.next === "string" ? q.next : null);
  const error = typeof q.error === "string" ? ERRORS[q.error] : undefined;
  const user = await currentUser();
  if (user) {
    return (
      <>
        <h1 className={h1}>You&apos;re signed in</h1>
        <p className="mt-2 text-ink-soft">As <span className="font-medium text-ink [overflow-wrap:anywhere]">{user.email}</span>.</p>
        <Link href={next === "/" ? "/account" : next}
          className="mt-6 block rounded-full bg-indigo px-6 py-4 text-center text-base font-bold text-white transition-colors duration-150 hover:bg-indigo-deep">
          Continue
        </Link>
        <form action={signOut} className="mt-3">
          <button className="w-full rounded-full bg-indigo-wash px-6 py-4 text-base font-bold text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover">
            Sign out and use another email
          </button>
        </form>
      </>
    );
  }
  return (
    <>
      <h1 className={h1}>Sign in</h1>
      <p className="mt-2 text-ink-soft">Keep your schedules on every device and lock your name on the ones you join. No password needed.</p>
      {error && <p role="alert" className="mt-4 text-sm font-medium text-vermilion">{error}</p>}
      <EmailForm next={next} />
      <div className="my-6 flex items-center gap-3 text-sm text-ink-soft" aria-hidden>
        <span className="h-px flex-1 bg-rule" />or<span className="h-px flex-1 bg-rule" />
      </div>
      {/* shortcut: Google isn't configured yet (needs the Google Cloud client); re-enable the button once it is. */}
      <form action={googleSignIn}>
        <input type="hidden" name="next" value={next} />
        <button disabled aria-describedby="google-wip"
          className="w-full cursor-not-allowed rounded-full bg-indigo-wash px-6 py-4 text-base font-bold text-ink-soft">
          Continue with Google
        </button>
      </form>
      <p id="google-wip" className="mt-2 text-center text-sm text-ink-soft">Work in progress: Google and other sign-in options are coming.</p>
    </>
  );
}

// Optional: guests never need an account. Signing in keeps schedules across devices and locks your name.
export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="mx-auto w-full max-w-sm px-5 pt-12 pb-16">
      <Suspense fallback={<div className="dot-grid h-72 rounded-[10px] border border-rule" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
