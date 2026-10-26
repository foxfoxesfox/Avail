---
tags: [phase, build]
status: in-progress
updated: 2026-10-26
---

# Phase 1: build slices

Back to [[Home]] · Full scope in [[Plan#3. Phases]]

Each slice ends with something you can open and try. Tick it off when it works for real.

- [x] **1. Skeleton:** Next.js + TypeScript app runs locally; Supabase project created and connected; deployed to Vercel at `avail.foxesvx.dev` (placeholder page).
- [x] **2. Create a schedule:** form with name, date range, weekdays, hours, slot size (15/30/60), time zone, members, optional deadline. Gives a share link and a private organizer link.
  - Built Oct 23: `/new` form, `/s/[id]` share page (summary only), `/s/[id]/manage/[token]` organizer page. Database: `supabase/migrations/` (tables locked; access only through `create_schedule`, `get_schedule`, `get_schedule_admin`). Validation tests: `npm test`. Design: Planner Page world (`PRODUCT.md`, `.impeccable/`). Design review: ship (Oct 23).
- [x] **3. Fill in availability:** open the share link, pick your name (optional PIN), paint Free / If needed / Busy on a phone-friendly grid, saved per slot.
  - Built Oct 24: name picker, optional bcrypt PIN, one-week grid with rectangle drag painting, autosave. Migration `20261023193909_availability.sql`; access only via `get_my_availability`, `set_pin`, `save_availability`. Not yet: joining with a new name, deadline lock (slice 8), PIN guess limits (slice 9). Design review: ship (Oct 24) after fixes: range heading + tally, drawn arrows, ruled grid, registered dots, fixed week columns, 28px min rows, "Clear" chip.
- [x] **4. Live totals:** heatmap row per day, updating in real time as others fill in; names visible or hidden per the visibility setting.
  - Built Oct 26: "Your times / Everyone" tabs on the share page; Everyone heat grid (count + "+n if needed", shade by share of people, tap a slot for names); "x of y replied · waiting on …"; organizer page shows the same with names always. Migration `20261025173502_totals.sql` (`get_totals`, `participants.responded_at`). Updates by polling every 10 s (upgrade to Realtime if traffic grows). Hidden-names mode tested: members see counts only. Design review: ship (Oct 26) after fixes: four flat heat steps (text ≥ 5.4:1), indigo-chosen tabs, printed key, "+1" notation, empty state, tap scrolls the answer into view on phones.
- [x] **5. Decide:** mark key members; ranked suggestions with "who's missing"; organizer confirms one or more sessions or picks manually, with location / video link / notes.
  - Built Oct 26: organizer "Decide" section: key-member chips, session length, top 5 best times (key members first, then most free, then most if-needed) with If needed / Busy / No reply and "Key member missing"; confirm with location, video link, notes; "Pick a time yourself"; confirmed sessions (hanko) on organizer and member pages, inline cancel. Migration `20261025180751_decide.sql` (`sessions`, `participants.is_key`, organizer-secret RPCs). Ranking tested in `src/lib/suggest.test.ts`. Design review: ship (Oct 27) after fixes: one hanko per screen, warnings in ink not vermilion, quiet secondary buttons, rank 1 as the only primary, manual pick opens in view, no zero-free "best" times, confirm form on paper, confirmed sessions outlined as one block in both grids. Still open: a best-slot mark inside the Everyone grid (the ranked list covers it for now).
- [ ] **6. Calendars:** add-to-calendar (Google, Apple, Outlook) for confirmed sessions; a private, resettable calendar feed per person.
- [ ] **7. Accounts:** email-link and Google sign-in; "My schedules"; co-organizers; claim your guest name; optional verified guest email.
- [ ] **8. Edit live schedules:** extend dates or hours, add or remove people, safe slot-size changes, without losing answers; deadline lock and reopen.
- [ ] **9. Launch check:** accessibility, phone testing, bot protection on create, privacy page, deploy.

## What you need to set up (only you can do these)
- ~~A free **Supabase** account and project (slice 1).~~ Done Oct 23: project `avail` (ref `hyaqrqvzorqwivicjhch`, Singapore), CLI linked, keys in `.env.local`. Docker isn't installed, so we use the hosted project rather than a local database.
- ~~A free **Vercel** account linked to the GitHub repo (slice 1).~~ Done Oct 23: live at https://avail-topaz.vercel.app (team FoxesDev, Hobby), and at https://avail.foxesvx.dev via a Cloudflare CNAME (DNS only), HTTPS by Vercel.
- Optional: delete the unused Cloudflare Pages project `avail-85u.pages.dev`.
- Later: a Google Cloud OAuth client for Google sign-in (slice 7).

## Resume here (Oct 26)
- Slices 1–5 done, tested and design-reviewed (ship).
- Demo schedule has key members Alex and Sam and one confirmed session (Mon 26 Oct, 2–4pm, Library room 3) for testing slice 6.
- Old test schedules ("RLS test", two "x") can be deleted. Use `supabase db push --linked`.
- Feedback fixes (Oct 26), tested on a production build:
  - PIN set on a name no longer shows "Couldn't open your row": the page refreshes after a PIN is set, and an out-of-date page asks for the PIN instead of erroring.
  - "Switch person" button in the grid header returns to the name picker.
  - Slot details list **Not free** and **No reply** as well as Free / If needed (when names are visible).
  - Heat key is now "Fewer → More"; a slot where everyone is free shows "All" in deep indigo with a white ring.
  - Lost organizer links: only a hash is stored, so a link can't be recovered. For now this browser remembers organizer links under "Your schedules on this device" on the home page; accounts (slice 7) fix it properly.
  - The Everyone grid now loads even if the tab opens in the background.
- Next: slice 6, calendars (add-to-calendar and a private feed per person).
