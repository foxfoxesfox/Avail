---
name: Avail
description: A planner's week page for finding when everyone is free.
colors:
  paper: "#f4f6f5"
  sheet: "#ffffff"
  ink: "#1e2328"
  ink-soft: "#4f5a64"
  rule: "#cbd3da"
  dot: "#b9c3cc"
  indigo: "#2d3e8c"
  indigo-deep: "#22306e"
  indigo-wash: "#e6e9f4"
  vermilion: "#c8341f"
  seal: "#e2412b"
typography:
  display:
    fontFamily: "Zen Kaku Gothic New, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Zen Kaku Gothic New, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  title:
    fontFamily: "Zen Kaku Gothic New, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.556
    fontFeature: "tnum"
  body:
    fontFamily: "Zen Kaku Gothic New, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  body-sm:
    fontFamily: "Zen Kaku Gothic New, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "tnum"
  label:
    fontFamily: "Zen Kaku Gothic New, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "0.06em"
    fontFeature: "tnum"
rounded:
  field: "10px"
  capsule: "9999px"
spacing:
  chip-gap: "6px"
  pair-gap: "12px"
  gutter: "20px"
  field-gap: "20px"
  section: "32px"
  column-gap: "40px"
components:
  button-primary:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.sheet}"
    typography: "{typography.body}"
    rounded: "{rounded.capsule}"
    padding: "16px 24px"
  button-primary-hover:
    backgroundColor: "{colors.indigo-deep}"
    textColor: "{colors.sheet}"
  button-quiet:
    backgroundColor: "{colors.indigo-wash}"
    textColor: "{colors.indigo}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.capsule}"
    padding: "12px 20px"
  day-chip:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.capsule}"
    padding: "10px 0"
  day-chip-selected:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.sheet}"
  field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  hanko-seal:
    textColor: "{colors.seal}"
    typography: "{typography.label}"
    rounded: "{rounded.capsule}"
    size: "64px"
---

# Design System: Avail

## Overview

**Creative North Star: "The Planner Page"**

Availability is set like a Japanese techō week page: a cool paper ground, white writing fields, sumi ink type, a blue-grey dot grid, and one vermilion seal that marks what is decided. The system is calm, dense in the way a planner is dense (every figure in its column, every row ruled), and refuses the category's white card, blue primary and rounded-input SaaS form.

State is carried by flat colour fields, not by depth: indigo fills what is chosen, a 1px ink rule opens every list, grey rules separate its rows. Controls are filled capsules. Numbers are always tabular so dates, hours and counts align like a printed calendar.

**Key Characteristics:**
- Cool paper ground with white writing sheets; no cards, no shadows.
- One family (Zen Kaku Gothic New), tabular figures everywhere.
- Indigo means chosen; vermilion means Sunday, an error, or the seal.
- Ruled lists and week strips open on an ink rule.
- The dot grid is the page's texture and the future time grid's ground.

## Colors

A near-neutral cool palette with one working accent (indigo) and one ceremonial accent (vermilion).

### Primary
- **Ai Indigo** (`indigo`): selection, the primary action capsule, checked day chips, Saturday text, focus rings, caret, text selection, and (next slice) the Free state as a flat fill. Pressed and hover state uses **Deep Indigo** (`indigo-deep`).
- **Indigo Wash** (`indigo-wash`): the quiet capsule's fill, for the secondary action beside a primary one.

### Secondary
- **Text Vermilion** (`vermilion`): Sunday text in day chips and week strips, error messages, and the invalid-field border. Darkened from the seal for 5.2:1 on white.
- **Seal Vermilion** (`seal`): the hanko seal and the wordmark's seal dot only. Never text that must be read.

### Neutral
- **Planner Paper** (`paper`): the page ground and browser theme colour.
- **Writing Sheet** (`sheet`): fields, chips at rest, the dot-grid ground.
- **Sumi Ink** (`ink`): body text, headings, and the opening rule of lists and week strips.
- **Soft Ink** (`ink-soft`): secondary text, field labels, placeholders, unselected dates (6.9:1 on paper).
- **Rule Grey** (`rule`): field borders, row rules, the top bar's bottom border.
- **Dot Grey** (`dot`): the dot grid and dot lines only.

### Named Rules
**The Indigo Means Chosen Rule.** Indigo as a fill states "selected", "free", or "the main action". Never use it as decoration.

**The Seal Rule.** Seal vermilion appears at most twice on a screen: the wordmark dot and one hanko marking a created or confirmed thing. Its rarity is the point.

**The Weekend Ink Rule.** Wherever days are named, Saturday is set in indigo and Sunday in text vermilion, as in a Japanese planner. Weekday colour never carries meaning alone; the letter or date is always present.

## Typography

**Display Font:** Zen Kaku Gothic New (with ui-sans-serif, system-ui)
**Body Font:** the same family, weights 400, 500 and 700 only.

**Character:** A quiet Japanese gothic with plain Latin, set bold for headings and regular for running text; the planner feel comes from figures and rules, not from a contrasting display face.

### Hierarchy
- **Display** (700, 2.5rem, 1.05, -0.03em): the single landing headline.
- **Headline** (700, 1.875rem, 1.25, -0.02em): page title, followed by a one-line lede in Soft Ink.
- **Title** (700, 1.125rem): section headings inside a page.
- **Body** (400, 1rem, 1.5): field values, list values, ledes.
- **Body small** (400 or 700, 0.875rem): helper lines, copy-link fields, week-strip dates, counts.
- **Label** (700, 0.75rem, 0.06em, uppercase): field labels and legends attached directly to their control. Not a free-standing heading device.

### Named Rules
**The Tabular Figures Rule.** `font-variant-numeric: tabular-nums` is set on the root; every date, hour, slot and count aligns in columns. Never override it.

**The Bold Figure Rule.** In running summaries the figure is bold Ink and its unit regular Soft Ink ("**10** days · **12** slots a day").

## Layout

One centred planner sheet, max width 42rem (672px), 20px side gutters, top bar sharing the same width. Pages stack: headline, lede, then content at 32px section spacing. Fields stack at 20px; paired or tripled fields (from/to, start/end/slot) share a row at 12px. Day chips divide the row into seven equal capsules 6px apart.

At 768px and up the create form gains a 15rem right column (40px gap) holding the week strip, the running count and the primary capsule; the column is sticky. On phones the same column follows the fields, ending in a full-width primary capsule.

Loading placeholders are a dot-grid sheet at the content's height, never a spinner or skeleton bars.

## Elevation & Depth

Flat. There are no shadows anywhere. Depth is a two-step tonal layer: white sheet on paper ground, outlined by a 1px Rule Grey border. Hierarchy within a sheet comes from rules: a 1px Ink rule opens a list or week strip, 1px Rule Grey rules separate rows.

### Named Rules
**The Flat Sheet Rule.** Nothing lifts. Hover and press change colour (150ms colour transition), never elevation or position.

## Shapes

Two radii only: gently rounded writing fields and containers (10px) and full capsules for every pressable control and chip. The hanko is a full circle, outlined 3px, rotated -12deg. Lists and strips have no radius and no side borders; they are ruled, not boxed.

## Components

### Buttons
Flat filled capsules; the action is the colour.
- **Shape:** full capsule (9999px).
- **Primary:** Ai Indigo fill, white bold text, 16px 24px (16px 28px standalone); full width at the end of a form.
- **Hover / Focus:** fill shifts to Deep Indigo over 150ms; focus is a 2px indigo outline at 2px offset. Pending: wait cursor, 70% opacity.
- **Quiet:** Indigo Wash fill, indigo bold text, 12px 20px; used for the lesser of two adjacent actions (copy organizer link beside copy share link). Primary and quiet sit at the same width (12rem) when paired.

### Chips
- **Day chip:** a capsule per weekday, white with Rule Grey border, single bold letter; Saturday letter indigo, Sunday vermilion.
- **Selected:** indigo fill and border, white letter. The native checkbox stays in the DOM (visually hidden) and carries the focus ring to the capsule.

### Inputs / Fields
- **Style:** white sheet, 1px Rule Grey border, 10px radius, 12px 14px padding, Ink text, Soft Ink placeholder, uppercase Label above.
- **Focus:** 2px indigo outline at 2px offset; indigo caret and native accent colour.
- **Error:** border turns text vermilion and a vermilion message (0.875rem, 500) sits 6px below, linked by `aria-describedby`.
- **Dot lines:** a multi-line field (people, one per line) carries a row of dots under each 1.75rem line, the planner's ruled-dot page.

### Navigation
Top bar on paper with a 1px Rule Grey bottom border. Left: the "Avail" wordmark (1.25rem, 700, tight tracking) followed by a 10px seal-vermilion dot. Right: the page label in Soft Ink body-small 500; elsewhere it is a link that darkens to Ink and underlines on hover.

### Ruled List
A planner info block set straight on the page: Ink top rule, 7rem Soft Ink key column, Ink values, Rule Grey bottom rule per row, 10px vertical padding. The lead value (dates) is bold.

### Week Strip
Monday-first seven-column calendar under a guide line naming the range in view ("Fri 23 Oct – Thu 5 Nov 2026"). Ink top rule, weekday letters in Label weight, each week row ruled in Rule Grey. Chosen dates are bold (Ink, or indigo / vermilion on weekends); unchosen dates are Soft Ink. Shows six weeks, then "+n more weeks".

### Hanko Seal
A 64px circle, 3px seal-vermilion ring, "AVAIL" in 0.75rem bold tracked 0.08em, rotated -12deg, decorative (`aria-hidden`). It marks a thing that is created or confirmed: the organizer page today, a confirmed session in the time grid next.

### Dot Grid
A white sheet with 1.1px Dot Grey dots on a 14px square pitch. Used for loading placeholders now and as the ground of the time grid, where Free cells take a flat indigo fill.

## Do's and Don'ts

### Do:
- **Do** set every action as a filled capsule: indigo for the main action, indigo wash for the lesser one.
- **Do** open every list, strip or grid with a 1px Ink rule and separate rows with 1px Rule Grey.
- **Do** keep Saturday indigo and Sunday vermilion wherever days are shown, with the letter or date always present.
- **Do** keep figures tabular and bold in summaries, units regular in Soft Ink.
- **Do** reuse the dot grid for the time grid and fill Free cells with flat indigo, labelled for screen readers and never shown by colour alone.
- **Do** reserve the hanko for something created or confirmed, one per screen.

### Don't:
- **Don't** use shadows, elevation, or decorative gradients; the dot pattern is the only gradient in the system.
- **Don't** use outlined ghost buttons for actions; outlines belong to fields, resting day chips and the hanko ring.
- **Don't** put content in white cards on the paper ground; use ruled lists and sheets-as-fields.
- **Don't** use seal vermilion for readable text or vermilion for anything but Sunday, errors and the seal.
- **Don't** add a second typeface or weights beyond 400, 500 and 700.
