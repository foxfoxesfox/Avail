---
tags: [plan, feature]
status: built (P2 design items left)
updated: 2026-11-01
---

# Booking pages

Back to [[Home]] · Fits into [[Plan#3. Phases]] as the next build after [[Phase 1]]

A second kind of schedule next to today's group poll. A host publishes **their own** free times and shares one link; **anyone** with the link books a time that suits them. No list of people up front.

| | Find a time (today) | Booking page (new) |
|---|---|---|
| Who marks times | Everyone on the list | Only the host |
| Who can use the link | Listed names | Anyone with the link |
| Outcome | Organizer picks one time for the group | Each visitor books their own time, first come first served |
| Visitor identity | Pick your name (optional PIN) | Types name and email when booking |

Example uses: 1-to-1 interviews or office hours (one person per time), a class or sharing session (several people per time, up to a limit).

## Decisions (Nov 1 2026)
- **Capacity is a setting.** Default **1 per meeting**: once a time is booked it disappears for everyone else. The host can switch to **group sessions** and set a limit (e.g. 10); the time stays bookable until full.
- **Instant confirmation.** No approval step; the host can still cancel a booking.
- **The host sets the meeting length** (e.g. 2 hours). On a 30-minute grid that is 4 slots. The visitor sees "This meeting is 2 hours (4 slots)", taps a start time, and the whole block fills in. Only starts where the full block fits inside the host's free times, and isn't taken, can be chosen.
- **A date range**, like today's schedules. Repeating weekly availability waits for the Phase 2 recurring-schedules work.
- **Proposed, to confirm when building:** visitors need no account; name and email are required (for the confirmation and the cancel link); visitors never see who else booked.

## How it works
**Host**
1. On "New schedule", choose **Booking page** instead of **Find a time**.
2. Set name, dates, days, hours, slot size, time zone, **meeting length** and **capacity** (1-to-1 or group with a limit).
3. Paint their free times on the same grid members use today.
4. Share the link. The organizer page lists upcoming bookings (time, name, email), with cancel, and the existing close / reopen, edit, new share link and delete controls.

**Visitor**
1. Opens the link: sees the host's open starts only, in the host's time zone (labelled).
2. Taps a start: the whole meeting block highlights.
3. Enters name and email, passes the bot check, books.
4. Gets a confirmation page and email with add-to-calendar (Google, Outlook, .ics) and a private cancel link.

## What we reuse
- Time grid, week strip, slot sizes, time-zone handling, close answers / deadline, edit, delete, new share link
- Add-to-calendar links and .ics files; the host's calendar feed shows bookings
- Accounts and "Your schedules" for hosts; organizer link and co-organizers
- Turnstile bot check (now also on booking), privacy and help pages (to extend)

## What's new
- `schedules.kind` gains `booking` (the column exists, limited to `dates` today); new settings: meeting length, capacity.
- The host's free times, stored like answers but owned by the schedule.
- A `bookings` table: schedule, day, start, end, name, email, hashed cancel token, created time.
- A `book_time` database function that checks the block is inside the free times and under capacity **and** inserts it in one locked step, so two people can't take the last place at the same moment.
- Confirmation and cancellation emails through Resend's API (needs a `RESEND_API_KEY` server setting; the domain is already verified).
- Visitor booking view and a confirmation page; host bookings list.

## Edge cases to handle
- Host shrinks their free times after people booked: bookings stay; the list flags any now outside the free times.
- Host cancels: the visitor gets an email; the place opens again.
- Visitor cancels from the email link: the place opens again; the host is told.
- Same person booking repeatedly: limit per email (e.g. 1 active booking per page, setting later).
- Booking too close to the start: possible "minimum notice" setting (e.g. 2 hours), later.
- Group sessions show "3 of 10 places left" to visitors, never names.

## Build slices
Each ends with something you can try. Tick them off as they land.
- [x] **B1. Create a booking page:** "Find a time / Booking page" choice on New schedule; meeting length and capacity settings; host paints free times. Migration for `kind`, settings and host free times.
  - Landed Nov 1 2026: migration `20261101143054_booking_pages.sql` (`kind = 'booking'`, `meeting_minutes`, `capacity`, `open_times` table, `create_booking_page` (secret key only), `get_open_times` / `save_open_times`, `update_schedule` takes meeting length and capacity). The paint grid is now a shared `PaintGrid` used by members and hosts; it reloads when an edit changes dates, hours or slot size, so autosave never writes stale slots.
  - Tested on a production build: 1-to-1 (2 hr on 30-min slots) and group (up to 12) pages created; free times autosave; edit to 15-min slots splits them (16 → 32); narrowing hours hides slots and widening brings them back; bad group size is refused with the form kept. The share link shows "isn't taking bookings yet" until B2.
- [x] **B2. Book a time:** visitor view with open starts only, tap a start to fill the block, name and email, bot check, `book_time` with capacity and race safety, confirmation page with add-to-calendar and cancel link.
  - Landed Nov 2 2026: migration `20261101190133_bookings.sql` (`bookings` table; internal `booking_starts`; public `get_booking_starts`, `get_booking`, `cancel_booking`; `book_time` for the secret key only, locking the schedule row so bookings on one page take turns). Capacity counts per slot, so overlapping bookings at different starts share places. Starts must be in the future and inside the current dates and hours; closing answers closes bookings. One email can't hold two overlapping bookings on a page.
  - Visitor: `/s/{id}` shows the week grid with open starts shaded; tapping one fills the meeting; name, email, Turnstile, "Book this time". Private page `/s/{id}/booked/{token}` (token hashed in the database) with add-to-calendar (Google, Outlook, .ics) and cancel.
  - Tested on a production build: group counts (overlapping starts showed 4 of 5), 1-to-1 hides booked and overlapping starts, two simultaneous requests for one time gave one booking and one "just taken", a visitor beaten to a time sees the message and a reloaded grid, cancel reopens the time, wrong or mismatched booking links 404 with no data.
- [x] **B3. Host's bookings:** list on the organizer page (upcoming / past), cancel, bookings in the host's calendar feed, "Your schedules" shows booking pages.
  - Landed Nov 2 2026: migration `20261101191911_host_bookings.sql` (`get_bookings` with a `past` flag from the database clock, `host_cancel_booking`, `get_host_feed_token` with `schedules.host_feed_token`, `get_feed` also serves host feeds, `my_schedules` returns `kind`). All organizer-only (link or account).
  - Organizer page: "Bookings · N upcoming" above the free-times grid, each with Cancel (two-step confirm; says Avail doesn't email them yet), "Past" and "Cancelled" folded away, and the shared calendar feed panel ("Bookings show up in your calendar"; events titled "Name · Page", email in the notes). Your schedules labels "Booking page".
  - Tested on a production build: list matched the data, host cancel moved the booking to Cancelled and reopened the time, host feed held only active bookings, wrong feed or organizer link gave nothing, member feeds unchanged. Not checked in the browser: the Your schedules label (needs a signed-in account; the database function was checked).
- [x] **B4. Emails:** confirmation to visitor and host, cancellation both ways (Resend API key setup).
  - Landed Nov 2 2026: migration `20261101192409_booking_emails.sql` (`booking_notice`, secret key only: booking details plus organizers' account emails). Texts in `src/lib/booking-emails.ts` (tested), sender `src/lib/email.ts` (Resend API, failures logged, never undo a booking), wiring in `src/lib/booking-notify.ts` with `after()`. Book: visitor confirmation with private link and .ics, host "New booking" (reply-to the visitor). Visitor cancels: host told. Host cancels: visitor told. Hosts are emailed only when they organize with an account.
  - Setup: a separate Resend API key (Sending access, `auth.foxesvx.dev`) as `RESEND_API_KEY` in `.env.local` and Vercel (Secret). Optional `SITE_URL` (email link origin) and `EMAIL_FROM`.
  - Tested locally: booking confirmation and host-cancel email to `delivered@resend.dev`, both accepted by Resend (200). Host emails tested with a signed-in owner: "New booking" and "Cancelled" (visitor cancel) arrived in Gmail.
- [ ] **B5. Polish and launch:** editing with existing bookings, close / reopen, help and privacy updates, tests for capacity and overlap, design review.
  - Done Nov 2 2026 (tested on a production build): bookings stay when the host edits, and any outside the current free times get a note on the organizer page (migration `20261102045349_bookings_outside.sql`); close / reopen ("Close bookings now? Nobody can book a time until you reopen", visitors see "Bookings are closed"); share-link previews say "You're invited to book a time on Avail" for booking pages; People names survive switching to Booking page and back; focus goes to the heading after a visitor cancels; Help has a "Booking pages" section; Privacy covers bookings and booking emails.
  - Design review Nov 2 2026 (Impeccable critique, 26/40, snapshot in `.impeccable/critique/`); fixed the three P1s: open starts print their time ("N left" on groups) with one Tab stop and arrow keys, focus moves to the form after picking, the chosen meeting is one solid block; bookings outlined and named on the host's free-times grid; optional host name and place (`20261102052519_booking_host_place.sql`) shown to visitors, on the booked page, in emails and calendar files; the booked page says a confirmation is on its way and who cancelled; host list says who cancelled. Also "1 slot" plural, radio dot on the type cards, fold markers. Tested on a production build, incl. 375px phone width.
  - Second critique Nov 2 2026: 28/40 (from 26). Fixed its three P1s: typing a group size selects "A group" (it used to save as one person); every two-step confirm is a group named by its question, so screen readers hear it with "Keep" (shared `Confirm`, plus the session-cancel buttons); a booking page with nothing painted leads with "Your free times" and says nobody can book yet, and hosts not organizing by account see "Sign in to get an email for each booking". Also "Office hours" placeholder, full-width "Book this time" on phones, arrow-key hint hidden on touch screens. Tested on a production build.
  - Third critique Nov 2 2026: 28/40 (26 → 28 → 28; earlier fixes held, two new P1s). Fixed both: clearing free times (click or drag) skips booked cells and the save status says "Booked times stay free. Cancel the booking first."; once painted, the organizer page leads with Bookings, then share link, free times, organizer link. Also "Times are Singapore time." on both grids, "A confirmation was sent to …". Tested on a production build (click and drag over a booking).
  - Fourth critique Nov 3 2026: 29/40 (26 → 28 → 28 → 29; detector clean). Fixed its three P1s: the visitor grid only draws hours with open starts (Office hours: 10am–2pm instead of to 10pm); "Times are Singapore time." in the lede and under the form heading, plus the meeting on the visitor's own clock when their zone differs, and full dates in the start labels; hosts not organizing by account get a "Get an email for each booking" step with a Sign in / Add to my schedules button. Also: a place that's a web link stays off the public page until someone books (`20261103020000_booking_link_after_booking.sql`: public data gets `online` instead, the organizer still sees it), with a hint on New schedule. Tested on a production build, incl. 375px.
  - Fifth critique Nov 3 2026: 28/40 (26 → 28 → 28 → 29 → 28; run-4 fixes held, a stricter pass found new P1s; detector clean). Fixed both: group pages run fixed sessions: starts line up with the meeting length from the first hour (10am, 11am, …), so people join one session instead of overlapping ones ("Each session is 1 hr… Pick a session to join."); bookings keep the visitor's browser zone, and the booked page and visitor emails add "That's 9pm–10pm New York time, Tue 3 Nov 2026" when it differs (`20261103040000_group_sessions_visitor_zone.sql`; shared `onClock` in `src/lib/calendar.ts`, tested). Tested on a production build with a new 30-min-slot group page.
  - Sixth critique Nov 3 2026: 28/40 (run-5 fixes held; fixed sessions raised two new P1s; detector clean bar a long free-times line). Fixed both: on the visitor grid each group session is one block at its full length (one button, "N left" in its first row) instead of a single slot with dot paper between; group hosts see where sessions fall: "Sessions are 1 hr and start at 10am, 11am, 12pm and so on, divided by the darker lines; a session opens only if you're free for all of it", darker rules at session boundaries on the free-times grid, a hint under "A group" on New schedule, and a Help answer. The free-times text is capped at a readable measure. Tested on a production build (group and 1-to-1 pages).
  - Seventh critique Nov 3 2026: 28/40; the score has settled at 28–29 since run 3 (each fresh review finds new P2s), so the critique loop stopped here. Fixed after it: a cancelled booking no longer returns or shows the meeting place (`20261103060000_cancelled_booking_place.sql`), checked in the database.
  - Left (P2/P3 from the reviews, not done): visitors in another zone see the grid in the host's time (option: open in the visitor's clock with a switch); group wording on the visitor page still mixes "time"/"start"/"session" ("8 starts open", "Book this time"); visitors in another zone only see their own time after picking; group bookings listed per person, not per session; host grid doesn't show painted bits no meeting can start in, or past days ("N bookable starts"); Sign in offered three times on the organizer page; visitor "Schedule details" repeats the lede; group the host's bookings by time for classes; past slots today drawn as plain paper on both grids; visitor cancel shows nothing if it fails; show the heading while loading; arrow keys on the host's free-times grid; meeting length before slot size on New schedule; free times first on a new booking page's organizer view. Automated capacity / overlap tests (the logic is in the database and there's no local one; covered by hand in B2: group places, two requests at once, taken time).

## Open questions (later)
- Buffer time between meetings (e.g. 15 minutes)?
- Minimum notice and how far ahead people can book?
- Reminder emails before the meeting (ties into Phase 2 notifications)?
- Collect anything besides name and email (e.g. a short note)?
