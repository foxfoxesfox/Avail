---
tags: [plan]
status: draft
updated: 2026-10-23
---

# Avail: Plan (draft 1)

Back to [[Home]].

A web app (installable to the home screen) where an organizer creates a schedule, shares one link, members mark when they're free, and confirmed sessions land in everyone's own calendar.

## 1. Competitors and lessons
What each app does well (we borrow it), where it falls short (we avoid it), and how Avail does better. Our own ideas that none of them have are in [[#4. Ideas no current app does well]].

| App | We borrow | It gets wrong | Avail does better |
|---|---|---|---|
| **When2meet** | Paint-a-grid, totals at a glance, no sign-up | Clunky on phones, dated, nothing reaches your calendar, start from scratch each time, no notifications | Phone-first grid, "If needed" answers, calendar feeds, reusable teams and templates, optional PIN per row |
| **Crab Fit** | Same no-login grid, cleaner, open source | One-off polls only: no calendar output, reuse or notifications | Schedules belong to teams you reuse; confirmed times reach everyone's calendar |
| **Doodle** | "If need be" answers; polls of proposed times | Ads and paywalls on the free tier; team reuse is paid; no free-time grid | No ads, complete free tier; grid **and** polls (Phase 3) |
| **Rallly** | Clean, open-source, ad-free polls | Polls only: no weekly grid, no teams, no calendar feed | All three schedule types, teams and calendars |
| **Calendly / Google "find a time"** | Strong calendar integration | Everyone needs the same tool or an account; built for 1-to-1 bookings | Guests need no account; built for groups; works with any calendar |
| **TimeTree** | Join by link; comments on each event; a shared calendar the group keeps using; activity feed; colour per calendar | Ads and a Premium paywall ($4.49/mo); invite links expire after 7 days; no "when is everyone free?" grid | No ads; long-lived links you can reset if leaked; the grid is the core |
| **Google Sheet** (where this started) | Familiar grid, an x per hour, the "Expected attendance" row | Manual setup, hard on phones, no notifications, rows break when people join or leave | All automatic; the improved Sheets script (Members list) stays as a fallback |

**Our angle:** one tool that combines the three schedule types, reusable teams, "key people must attend" suggestions, and calendar, email, push and Telegram notifications, with no ads.

**Borrowed features and where they land**

| Takeaway | From | When |
|---|---|---|
| One share link, no account to join | When2meet, TimeTree | Done (slice 2) |
| Per-person notification choices at join time | TimeTree | Slice 7, Phase 2 |
| Comment thread on each **confirmed session** (agenda, "running late", room change) | TimeTree | Phase 2 |
| **Team page**: every confirmed session across a team's schedules, one calendar feed per team | TimeTree | Phase 2 (teams) |
| Activity list on the organizer page, plus the "someone updated" digest | TimeTree | Phase 2 |
| Colour per team or project on the team page and in feeds | TimeTree | Phase 2 |
| Busy-time auto-fill from Google/Microsoft calendars | Calendly, TimeTree | Phase 3 |
| Organizer can **reset** a leaked share link (instead of links that expire) | TimeTree (inverted) | Slice 8 |
| Proposed-options polls with yes / maybe / no | Doodle, Rallly | Phase 3 |

## 2. Decisions made

| Topic | Decision |
|---|---|
| Platform | Web app, mobile-first, installable (PWA). No app-store apps. |
| Audience | Public: anyone can sign up |
| Identity | Pick your name with no login, or optionally sign in with Google, Microsoft, Apple or an email link |
| Setup rights | Organizer and invited co-organizers; members edit only their own row |
| Time zone | One time zone per schedule, set by the organizer and shown on the grid |
| Slot size | 15, 30 or 60 minutes, chosen per schedule |
| Answers | Free / If needed / Busy |
| Schedule types | Specific dates, recurring weekly, organizer-proposed options (poll) |
| Calendar busy auto-fill | Later version, optional |
| Deciding | App ranks the best slots; organizer confirms one or more, or overrides and picks manually |
| Key members | Can be marked; suggestions favour slots where they're free |
| Notifications | Confirmed / changed / cancelled, nudges to non-responders, "someone updated" for organizers, session reminders. Each user chooses which ones they get. |
| Channels | Calendar (add-to-calendar and a subscription feed), email, web push, Telegram/WhatsApp. Each user chooses in settings. |
| Guests and calendar | Each name gets a private calendar feed link that can be reset |
| Visibility | Organizer chooses per schedule: everyone sees names, or members see only counts |
| Extras chosen | Teams/groups, templates and duplicate, notes and comments, location or video link, CSV/Sheet export, change history and undo |
| Budget | Free tier; launch small and add features in phases |
| Example and demo data | Generic names only (Alex, Sam, Priya, Jordan, Chris, Mei Lin) in placeholders, tests, docs, templates and demo schedules; never real team members' names or course codes |

## 3. Phases

**Phase 1: core (launch to your own teams first)**
- Create a specific-dates schedule: name, date range, weekdays, hours, slot size, time zone, members
- One share link; pick your name; optional 4-digit PIN to protect your row
- Phone-friendly grid: tap or drag to paint Free / If needed / Busy, with a one-day-at-a-time view on phones
- Live heatmap totals (the "Expected attendance" row), updating in real time as people fill in
- Mark key members; ranked suggestions; organizer confirms one or more sessions or picks manually
- Confirmed session details: location or video link, plus notes
- Add-to-calendar (Google, Apple, Outlook) and a private calendar feed per person
- Organizer account (email link and Google sign-in) with a "My schedules" list; co-organizers
- Visibility setting (names or counts only)
- Edit the setup after creation (extend dates, add or remove people) without losing answers

**Phase 2: reuse and notifications**
- Notification settings page; email notifications; nudges; organizer digest
- Teams/groups, templates, duplicate schedule
- Recurring weekly schedules (confirmed sessions become repeating calendar events)
- Comments per slot; change history with undo; CSV export
- Microsoft sign-in; installable app and web push

**Phase 3: differentiators**
- Doodle-style proposed-options polls
- Telegram bot (link your account, get alerts, see "where's everyone free?" in chat)
- Auto-fill busy times from Google/Microsoft calendar
- Apple sign-in (needs a $99/yr Apple developer account)
- Google Sheet export; import an existing sheet like yours
- WhatsApp only if there's demand, since its business API is paid per message

## 4. Ideas no current app does well
- **"Who's blocking" hints:** "7pm Tue has 5/6 — only Sam is busy." The organizer can ask that one person instead of re-polling everyone.
- **Quorum alerts:** notify the organizer the moment a slot has all key members and enough people.
- **Copy last week:** members reuse their previous answers with one tap, which suits recurring team schedules.
- **Sheet import:** paste an existing availability sheet to migrate in one step.
- **Fallback suggestions:** when no slot works, suggest the best two shorter sessions or the best "if needed" slot.

## 5. Problems to expect, and how we handle them

**Identity and trust**
- *Anyone with the link can edit someone else's row* → optional per-name PIN; signed-in users "claim" their name and lock it; change history shows who edited.
- *Duplicate or misspelt names* → organizer-managed member list; joining as a new name needs organizer approval (optional setting).
- *Guest later signs up* → merge their guest row into the account by claiming it.

**Editing a live schedule**
- *Organizer shrinks dates or hours after people answered* → keep hidden answers so they come back if the range is restored; warn before saving.
- *Changing slot size after answers exist* → only allow 60→30→15 (every answer maps cleanly); block going larger, or reset with a warning.
- *Two people editing at once* → each answer is saved per person and per slot, so edits never overwrite each other; live updates show other people's changes.

**Calendars and notifications**
- *Google Calendar refreshes subscribed feeds slowly (up to ~24h)* → also send changes by email or push with an updated calendar file; Apple and Outlook refresh faster.
- *A cancelled session stays in calendars where it was added once* → send a calendar cancellation (an .ics file with METHOD:CANCEL) by email; the feed removes it automatically.
- *Web push on iPhone only works after "Add to Home Screen"* → in-app prompt explaining it; email as the fallback.
- *Notification spam* → per-user settings, digests, quiet hours.
- *Email lands in spam* → send from our own domain with SPF/DKIM set up; the email provider's free tier is about 3,000 emails a month, so batch digests.
- *Nudges need something to nudge toward* → nudges are sent about a day before the schedule's optional response deadline; no deadline means no nudges.
- *Telegram needs the user to start the bot first* → "Connect Telegram" button with a one-tap deep link.
- *A private feed link gets shared or leaked* → "reset link" button; the feed shows only that person's schedules.

**Time**
- *Public users in other countries* → every schedule stores its time zone and shows it clearly ("All times in Singapore time, SGT"). Converting to each viewer's local time could come later.
- *Daylight saving in other regions* → store times with the time zone name (e.g. Asia/Singapore), never a fixed offset.

**Public sign-up risks**
- *Spam or abuse of the create form* → rate limits and a free bot check (Cloudflare Turnstile) when creating a schedule.
- *Guessable links* → long random IDs in every share link.
- *Privacy law (PDPA in Singapore, GDPR in Europe)* → privacy policy, "delete my data", and old schedules auto-deleted after e.g. 6 months.
- *Hidden-names mode leaking through exports or history* → exports and history follow the schedule's visibility setting.

**Usability**
- *Dragging on a phone grid fights with scrolling* → a "paint mode" toggle and a one-day view on phones.
- *Colour-only states are hard for colour-blind users* → icons or patterns for Free / If needed / Busy, plus keyboard and screen-reader support.

**Free-tier limits**
- Supabase free projects pause after a week with no activity and have a 500 MB database. That's fine for your teams; upgrade when public use grows.
- Vercel's free Hobby plan is for non-commercial use only. Move to Pro (~$20/mo) if it ever makes money.
- Google calendar *reading* (busy auto-fill) needs Google's app verification, which takes weeks. That's why it's in Phase 3.

## 6. Proposed tech
- **Next.js** (React) on **Vercel**: one codebase for the pages and the server parts
- **Address:** `avail.foxesvx.dev`, a CNAME in Cloudflare DNS (DNS only) pointing at Vercel. The portfolio at `foxesvx.dev` stays on Cloudflare Pages. If the app ever makes money, either move to Vercel Pro (~$20/mo) or to Cloudflare Workers (paid plan, $5/mo; the free plan's CPU limit is too tight for Next.js).
- **Supabase**: Postgres database, sign-in (email link, Google, Microsoft, Apple), real-time updates, row-level security
- **Resend** for email, the **Telegram Bot API**, the `ics` library for calendar files and feeds
- Cost at launch: $0, plus an optional domain at ~$15/yr

Main data: users · teams · schedules (type, time zone, slot size, dates/weekdays, hours, visibility) · organizers · participants (name, optional user, PIN, key member, feed token) · answers (participant, slot, state) · poll options · sessions (time, location, link, status) · comments · change log · notification settings.

## 7. Answered questions (Oct 23 2026)
1. **Name:** working name **Avail** (repo and folder). "Avail" is already used by other products (rental software, a blockchain project), so confirm the public brand and domain before launch.
2. **Response deadline:** optional, set per schedule. Nudges go out about a day before it; after it, the grid locks and the organizer can reopen it. No deadline means no nudges.
3. **Guests and email:** guests can add an optional email to their name, verified with one click before anything is sent.
4. **Framework:** Next.js with TypeScript.
5. **First real use:** no date yet. Build at a comfortable pace, in small testable slices (see [[Phase 1]]).
