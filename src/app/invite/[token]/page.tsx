import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { currentUser, getInvite } from "@/lib/supabase";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { title: "Co-organizer invite", robots: { index: false, follow: false } };

const email = "font-medium text-ink [overflow-wrap:anywhere]";

async function Content({ params }: { params: PageProps<"/invite/[token]">["params"] }) {
  const { token } = await params;
  const [invite, user] = await Promise.all([/^[\w-]{16,64}$/.test(token) ? getInvite(token) : null, currentUser()]);
  if (!invite) {
    return (
      <>
        <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em]">Invite no longer works</h1>
        <p className="mt-2 text-ink-soft">It has been used or has expired. Ask the organizer for a new one.</p>
      </>
    );
  }
  const here = `/invite/${token}`;
  return (
    <>
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em] text-balance">Co-organize &ldquo;{invite.title}&rdquo;</h1>
      <p className="mt-2 text-ink-soft">Co-organizers see everyone&apos;s names, pick times and confirm sessions. This invite works once.</p>
      {user ? (
        <>
          <AcceptForm token={token} />
          <p className="mt-3 text-sm text-ink-soft">
            Joining as <span className={email}>{user.email}</span>.{" "}
            <Link href={`/sign-in?next=${encodeURIComponent(here)}`} className="font-medium text-indigo underline underline-offset-4">Use another email</Link>
          </p>
        </>
      ) : (
        <Link href={`/sign-in?next=${encodeURIComponent(here)}`}
          className="mt-6 block rounded-full bg-indigo px-6 py-4 text-center text-base font-bold text-white transition-colors duration-150 hover:bg-indigo-deep">
          Sign in to join
        </Link>
      )}
    </>
  );
}

// Lands here from an owner's one-time invite link.
export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="mx-auto w-full max-w-sm px-5 pt-12 pb-16">
      <Suspense fallback={<div className="dot-grid h-40 rounded-[10px] border border-rule" />}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
