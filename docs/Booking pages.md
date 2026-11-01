---
tags: [plan, feature]
status: in progress
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
- [ ] **B2. Book a time:** visitor view with open starts only, tap a start to fill the block, name and email, bot check, `book_time` with capacity and race safety, confirmation page with add-to-calendar and cancel link.
- [ ] **B3. Host's bookings:** list on the organizer page (upcoming / past), cancel, bookings in the host's calendar feed, "Your schedules" shows booking pages.
- [ ] **B4. Emails:** confirmation to visitor and host, cancellation both ways (Resend API key setup).
- [ ] **B5. Polish and launch:** editing with existing bookings, close / reopen, help and privacy updates, tests for capacity and overlap, design review.

## Open questions (later)
- Buffer time between meetings (e.g. 15 minutes)?
- Minimum notice and how far ahead people can book?
- Reminder emails before the meeting (ties into Phase 2 notifications)?
- Collect anything besides name and email (e.g. a short note)?
