# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Any group organizer (student project teams, clubs, friends, volunteers, small workplaces; no single primary audience) who needs to find times when several people are free, and the members who open a shared link to say when they're free. Members often arrive from a chat app on a phone, have never used Avail, and may not create an account. Organizers come back across days and projects.

## Product Purpose
Replace hand-built availability spreadsheets: an organizer creates a schedule in a minute, shares one link, members mark Free / If needed / Busy, totals show the best times, and confirmed sessions reach each person's own calendar. Success: everyone answers without help, and the organizer picks a time without re-polling.

## Positioning
One tool combining date-range grids, recurring weekly schedules and proposed-option polls, with reusable teams, key members that must attend, and calendar feeds plus customizable notifications. Neighbours (When2meet, Doodle, Rallly, Calendly) each cover only part of this. Full comparison in `docs/Plan.md`.

## Operating Context
- Links are shared through WhatsApp, Telegram and email; first contact is usually a phone browser.
- Each schedule has one time zone set by the organizer; times are shown in it, labelled.
- Organizers previously used a Google Sheet grid (dates and hourly columns, names as rows, x for free, an "Expected attendance" total row). `tools/google-sheets/availability.gs` is that tool.
- Guests pick their name without signing in; accounts (Google, Microsoft, Apple, email link) are optional.

## Capabilities and Constraints
- Scope and phases: `docs/Plan.md`; build slices: `docs/Phase 1.md`.
- Slot sizes 15 / 30 / 60 minutes; answers Free / If needed / Busy; optional response deadline; organizer chooses whether members see names or only counts.
- Free-tier hosting (Vercel Hobby, Supabase Free) at launch.
- Undecided: final public brand name and domain (working name Avail at avail.foxesvx.dev).

## Brand Commitments
- Name: Avail (working). Stands on its own; not tied to the foxesvx personal brand.
- Voice: neutral and efficient. Few words, plain labels, no jokes or personality copy.

## Evidence on Hand
None yet: no users, testimonials, metrics or logos. Do not fabricate any.

## Product Principles
1. A member can answer from a phone in under a minute, with no account and no instructions.
2. The organizer's decision is the product: make the best times and who's missing obvious.
3. Reuse beats re-entry: teams, templates and past schedules carry forward.
4. Meet people where they are: their calendar, their chat app, their device.
5. Private by default: unguessable links, organizer-controlled visibility, nothing shared that isn't needed.

## Accessibility & Inclusion
Public product used on phones by anyone: WCAG 2.2 AA, full keyboard use, screen-reader labels on the grid, and states never shown by colour alone.
