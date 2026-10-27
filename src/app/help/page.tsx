import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Help", description: "Answers to common questions about Avail." };

type QA = { q: string; a: React.ReactNode };
const link = "font-medium text-indigo underline underline-offset-4";

// Keep these in step with how the app actually behaves; the privacy page covers what is stored.
const SECTIONS: { title: string; items: QA[] }[] = [
  {
    title: "For members",
    items: [
      { q: "Do I need an account?", a: "No. Open the link the organizer shared, pick your name and mark when you're free." },
      {
        q: "How does Avail remember my name? What if I clear my browser?",
        a: <>Your browser remembers which name you picked, on that device only. Clearing &ldquo;cookies and site data&rdquo; or using a private window forgets it (clearing just the cache usually doesn&apos;t). Your answers are saved on Avail, not in your browser, so nothing is lost: open the link, pick your name again, and your times are still there.</>,
      },
      {
        q: "What does a PIN do?",
        a: "It stops anyone else with the link from changing your times. You type it once on each new device. After 5 wrong tries the name locks for 15 minutes. If you sign in, you can link your name to your account instead and skip the PIN.",
      },
      { q: "My name isn't on the list.", a: "Ask the organizer to add you. They can add people at any time, and you'll appear straight away." },
      {
        q: "How do I get sessions into my calendar?",
        a: <>Under each confirmed session, use &ldquo;Add to calendar&rdquo; for that one session. To get every session automatically, open &ldquo;Calendar feed&rdquo; under your times and subscribe: new and cancelled sessions then update on their own. Google Calendar can take up to a day to catch up.</>,
      },
      { q: "Why can't I change my times?", a: "The organizer closed answers, or the deadline passed. You can still see your saved times; ask the organizer to reopen if you need to change them." },
    ],
  },
  {
    title: "For organizers",
    items: [
      {
        q: "I lost my organizer link. Can I get it back?",
        a: <>Not the same link: Avail keeps only a scrambled copy of it. If you were signed in and added the schedule to your account, open it from <Link href="/account" className={link}>Your schedules</Link> and, as the owner, make a new organizer link there. To be safe, save the link when you create a schedule, or sign in and add it to your schedules.</>,
      },
      {
        q: "How do I give someone else control?",
        a: <>Use &ldquo;Invite a co-organizer&rdquo;: they sign in to accept, the invite works once and lasts 7 days, and the schedule then stays in their account on every device. You can also send the organizer link itself, but anyone who has it can manage the schedule, and someone without an account relies on keeping that link.</>,
      },
      {
        q: "Can I change the dates, hours or people after sharing?",
        a: "Yes, with Edit and People on the organizer page. Answers are kept: shrinking the dates or hours only hides answers outside them. Slots can always get smaller (60 → 30 → 15 minutes) but can't get bigger once people have answered.",
      },
      { q: "The share link went to the wrong people.", a: "Use “Make a new share link” under the share link. The old one stops working, so send everyone the new one. Answers and sessions are kept." },
      {
        q: "How do I delete a schedule?",
        a: "At the bottom of the organizer page, choose “Delete this schedule” and type the schedule's name to confirm. It deletes everyone's answers and sessions for good. Only the organizer link or the owner account can do this.",
      },
    ],
  },
  {
    title: "Accounts and privacy",
    items: [
      {
        q: "Why sign in?",
        a: "To see your schedules on every device, lock your name so only you can change it, and co-organize. Everything else works without an account.",
      },
      { q: "How do I sign in?", a: "Enter your email and open the link we send you; there's no password. Google sign-in is coming." },
      { q: "What does Avail store?", a: <>Only what it needs to find a time. The <Link href="/privacy" className={link}>privacy page</Link> lists everything, and how to ask for deletion.</> },
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16">
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em]">Help</h1>
      <p className="mt-2 text-ink-soft">Quick answers to common questions. Tap a question to open it.</p>
      {SECTIONS.map((sec) => (
        <section key={sec.title} className="mt-10">
          <h2 className="text-lg font-bold">{sec.title}</h2>
          <ul className="mt-3 border-t border-ink">
            {sec.items.map((x) => (
              <li key={x.q} className="border-b border-rule">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-3 font-medium">
                    {x.q}
                    {/* Authored plus, one stroke weight like the week arrows; turns to × when open. */}
                    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
                      className="mt-1 shrink-0 text-ink-soft transition-transform duration-150 group-open:rotate-45">
                      <path d="M7 2v10M2 7h10" />
                    </svg>
                  </summary>
                  <p className="pb-4 text-ink-soft">{x.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-10 text-sm text-ink-soft">
        Still stuck? Email <a href="mailto:privacy@foxesvx.dev" className={link}>privacy@foxesvx.dev</a>.
      </p>
    </main>
  );
}
