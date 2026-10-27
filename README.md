# Avail
Availability App

Team availability web app: share one link, everyone marks when they're free, and confirmed sessions land in each person's calendar. Live at https://avail.foxesvx.dev.

- Plan and notes: [docs/Home.md](docs/Home.md) (the `docs/` folder is an Obsidian vault); build log per slice in [docs/Phase 1.md](docs/Phase%201.md)
- User-facing answers to common questions: the in-app Help page ([src/app/help/page.tsx](src/app/help/page.tsx)) and Privacy page ([src/app/privacy/page.tsx](src/app/privacy/page.tsx))
- Google Sheets version used before the app: [tools/google-sheets/availability.gs](tools/google-sheets/availability.gs)
- Examples, tests and demo data use generic names only (Alex, Sam, Priya, Jordan, Chris, Mei Lin)

## Stack
Next.js (App Router, `src/`, Cache Components on) + TypeScript + Tailwind 4, Supabase (Postgres + Auth), Vercel, Resend (sign-in email over SMTP), Cloudflare Turnstile (bot check).

## Run locally
```
npm install
npm run dev      # http://localhost:3000
npm test         # node --test on src/**/*.test.ts
npm run build && npx next start -p 3100   # production build, as used for testing
```

`.env.local` (never committed):

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public key; every call goes through database functions, never tables |
| `SUPABASE_SECRET_KEY` | Server-only; used for one call, `create_schedule` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile widget key (public) |
| `TURNSTILE_SECRET_KEY` | Turnstile server check; if unset the check is skipped (local dev only) |

Vercel needs the same variables (Production; Preview optional). For local bot-check testing, Cloudflare's test keys work: site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA` (always passes) or `2x0000000000000000000000000000000AA` (always fails).

## Database
- Schema and functions live in [supabase/migrations/](supabase/migrations/), applied with `supabase db push --linked` (the CLI is linked to the hosted project; there is no local database).
- Every table has row-level security on and **no policies**, and is revoked from the public roles. The app reads and writes only through `SECURITY DEFINER` functions, and each one checks the secret, PIN or account itself. Internal helpers (`organizer_schedule`, `member_ok`, `random_token`, `clean_name`) are not callable from outside.
- [src/lib/supabase.ts](src/lib/supabase.ts): `supabase` (public key, no session), `db()` (public key plus the visitor's session cookies, so functions can use `auth.uid()`), `serverOnly` (secret key, only for `create_schedule`, so the bot check in front of it can't be skipped).

## How identity and links work
| Thing | Where it lives | Notes |
|---|---|---|
| Share link `/s/{shareId}` | `schedules.share_id` | Public to whoever has it; organizers can replace it (`reset_share_link`) |
| Organizer link `/s/{shareId}/manage/{token}` | sha256 of the token in `schedules.admin_token_hash` | Can't be shown again; the owner account can issue a new one (`new_organizer_link`) |
| Co-organizer invite `/invite/{token}` | sha256 in `organizer_invites` | Owner creates it; one use, 7 days; accepting needs sign-in |
| Calendar feed `/cal/{token}.ics` | `participants.feed_token` (plain) | Only reveals what the share link shows; members can reset it |
| Picked name (guests) | Browser `localStorage` key `avail:{shareId}` = `{pid, pin}` | Per device. Clearing site data forgets it; answers stay in the database |
| Organizer links opened (guests) | Browser `localStorage` key `avail:organizer` | Shown on the home page as "Organizer links on this device" |
| PIN | bcrypt hash in `participants.pin_hash` | 5 wrong PINs lock the name for 15 minutes (`member_ok`) |
| Account | Supabase Auth (email link) | Session cookies refreshed by [src/proxy.ts](src/proxy.ts); post-sign-in return path in the short-lived `avail_next` cookie |
| Organizer by account | `schedule_organizers` (`owner` / `co`) | First account to add a schedule is the owner; co-organizers join by organizer link or invite |
| Linked name | `participants.user_id` | Then only that account can change the name's answers, no PIN |

Organizer access is "the organizer link **or** an account in `schedule_organizers`" (`organizer_schedule()`), so signed-in organizers use `/s/{shareId}/manage` without the secret. Deleting a schedule needs the organizer link or the owner account, plus the exact title.

## Answers and editing
- Answers are rows of (day, minute, free | if needed) in the schedule's own time zone. Busy is no row.
- Saving replaces only the answers inside the schedule's current dates and hours. Shrinking a schedule hides answers instead of deleting them, and widening it brings them back.
- Slot size can get finer at any time (each answer is copied into the smaller slots) but coarser only before anyone answers. The time zone is fixed after creation.
- Closing answers sets the deadline to now; reopening clears it. The database refuses saves after the deadline.
- Totals refresh by polling every 10 seconds.

## Bot protection
- Creating a schedule: the Turnstile token is checked on the server ([src/lib/turnstile.ts](src/lib/turnstile.ts)) before `create_schedule`, which only the secret key may call.
- Sign-in emails: the token is passed to Supabase, which checks it (CAPTCHA protection is on in Supabase Auth).

## Supabase settings the app depends on
- Authentication → URL Configuration: Site URL `https://avail.foxesvx.dev`; Redirect URLs `https://avail.foxesvx.dev/**`, `https://avail-topaz.vercel.app/**`, `http://localhost:3000/**`, `http://localhost:3100/**`.
- Email templates (Confirm signup, Magic link) link to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`, so a link opened on another device still signs in.
- Custom SMTP through Resend, sender `no-reply@auth.foxesvx.dev`.
- Attack Protection: CAPTCHA on, provider Turnstile.
