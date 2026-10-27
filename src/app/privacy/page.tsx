import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy", description: "What Avail stores, why, and how to have it deleted." };

const CONTACT = "privacy@foxesvx.dev";
const h2 = "mt-10 text-lg font-bold";
const p = "mt-2 text-ink-soft";

// Plain statements of what the app actually does; keep in step with the code when features change.
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16">
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em]">Privacy</h1>
      <p className="mt-2 text-ink-soft">Avail stores only what it needs to find a time that suits everyone. No ads, no tracking, nothing sold.</p>

      <h2 className={h2}>What we store</h2>
      <ul className="mt-2 grid gap-1.5 text-ink-soft">
        <li><b className="text-ink">Schedules:</b> the title, dates, hours, people&apos;s names as the organizer typed them, confirmed sessions with any location, link and notes.</li>
        <li><b className="text-ink">Answers:</b> which times each name marked free or if needed, and when they last answered.</li>
        <li><b className="text-ink">PINs:</b> only a scrambled (hashed) form, never the PIN itself.</li>
        <li><b className="text-ink">Accounts (optional):</b> your email address, which schedules you organize, and any name you linked to your account.</li>
        <li><b className="text-ink">Secret links:</b> organizer and invite links are stored only in scrambled form; calendar feed links are stored so you can see yours again.</li>
      </ul>

      <h2 className={h2}>On your device</h2>
      <p className={p}>
        Your browser remembers which name you picked on each schedule and the organizer links you opened, so you don&apos;t have to pick again. If you
        sign in, a cookie keeps you signed in, and a short-lived cookie remembers which page to return to. Nothing is used for tracking or advertising.
      </p>

      <h2 className={h2}>Who can see what</h2>
      <p className={p}>
        Anyone with a schedule&apos;s share link can see it and its confirmed sessions. The organizer chooses whether members see who is free or only how
        many. Organizers always see names. A schedule&apos;s organizers see each other&apos;s email addresses.
      </p>

      <h2 className={h2}>Services we use</h2>
      <ul className="mt-2 grid gap-1.5 text-ink-soft">
        <li><b className="text-ink">Supabase</b> stores the data (servers in Singapore) and handles sign-in.</li>
        <li><b className="text-ink">Vercel</b> runs the website.</li>
        <li><b className="text-ink">Resend</b> sends sign-in emails.</li>
        <li><b className="text-ink">Cloudflare Turnstile</b> checks that a person, not a bot, is creating schedules or asking for sign-in emails.</li>
        <li><b className="text-ink">Google and Microsoft calendars</b> receive a session only when you choose &ldquo;Add to calendar&rdquo; or subscribe to a feed.</li>
      </ul>

      <h2 className={h2}>How long we keep it</h2>
      <p className={p}>
        Schedules and answers are kept until the organizer removes people or asks us to delete the schedule. Automatic clean-up of old schedules may come
        later; this page will say so first.
      </p>

      <h2 className={h2}>Your choices</h2>
      <ul className="mt-2 grid gap-1.5 text-ink-soft">
        <li>Add a PIN or link your name to your account so only you can change your times.</li>
        <li>Reset your calendar feed link, or unlink your name, at any time.</li>
        <li>Ask us to delete your account, a schedule you organize, or your name and answers: email <a href={`mailto:${CONTACT}`} className="font-medium text-indigo underline underline-offset-4">{CONTACT}</a>.</li>
      </ul>

      <h2 className={h2}>Contact</h2>
      <p className={p}>
        Questions or requests: <a href={`mailto:${CONTACT}`} className="font-medium text-indigo underline underline-offset-4">{CONTACT}</a>.
      </p>
      <p className="mt-10 text-sm text-ink-soft">Last updated 27 October 2026.</p>
    </main>
  );
}
