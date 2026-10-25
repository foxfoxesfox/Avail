---
tags: [phase, build]
status: in-progress
updated: 2026-10-23
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
- [ ] **5. Decide:** mark key members; ranked suggestions with "who's missing"; organizer confirms one or more sessions or picks manually, with location / video link / notes.
  - From the slice 4 review: give the best slot(s) a distinct mark in the Everyone grid (e.g. everyone who replied is free), alongside the ranked suggestions.
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
- Slices 1–4 done and tested (slice 4: totals, names on tap, replied list, hidden names, organizer view).
- Test data: demo schedule "Project meetings (demo)", plus "Hidden names test"; old test schedules ("RLS test", two "x") can be deleted.
- `supabase db push` now needs `--linked` in future CLI versions.
- Next: slice 5, decide (key members, ranked suggestions, "who's missing", confirm a session).
