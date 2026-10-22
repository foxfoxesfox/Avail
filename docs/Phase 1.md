---
tags: [phase, build]
status: in-progress
updated: 2026-10-23
---

# Phase 1: build slices

Back to [[Home]] · Full scope in [[Plan#3. Phases]]

Each slice ends with something you can open and try. Tick it off when it works for real.

- [ ] **1. Skeleton:** Next.js + TypeScript app runs locally; Supabase project created and connected; deployed to Vercel at `avail.foxesvx.dev` (placeholder page).
- [ ] **2. Create a schedule:** form with name, date range, weekdays, hours, slot size (15/30/60), time zone, members, optional deadline. Gives a share link and a private organizer link.
- [ ] **3. Fill in availability:** open the share link, pick your name (optional PIN), paint Free / If needed / Busy on a phone-friendly grid, saved per slot.
- [ ] **4. Live totals:** heatmap row per day, updating in real time as others fill in; names visible or hidden per the visibility setting.
- [ ] **5. Decide:** mark key members; ranked suggestions with "who's missing"; organizer confirms one or more sessions or picks manually, with location / video link / notes.
- [ ] **6. Calendars:** add-to-calendar (Google, Apple, Outlook) for confirmed sessions; a private, resettable calendar feed per person.
- [ ] **7. Accounts:** email-link and Google sign-in; "My schedules"; co-organizers; claim your guest name; optional verified guest email.
- [ ] **8. Edit live schedules:** extend dates or hours, add or remove people, safe slot-size changes, without losing answers; deadline lock and reopen.
- [ ] **9. Launch check:** accessibility, phone testing, bot protection on create, privacy page, deploy.

## What you need to set up (only you can do these)
- ~~A free **Supabase** account and project (slice 1).~~ Done Oct 23: project `avail` (ref `hyaqrqvzorqwivicjhch`, Singapore), CLI linked, keys in `.env.local`. Docker isn't installed, so we use the hosted project rather than a local database.
- A free **Vercel** account linked to the GitHub repo (slice 1).
- Later: a Google Cloud OAuth client for Google sign-in (slice 7).
