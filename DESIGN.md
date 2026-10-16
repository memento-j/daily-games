---
name: Downstream
description: A live delivery tracker for a raindrop, over a pale relief map.
colors:
  coral: "#f2545b"
  coral-deep: "#d93d46"
  coral-soft: "#fde8e8"
  drop: "#155eef"
  ink: "#121a2b"
  ink-soft: "#4a5468"
  ink-faint: "#5f6a7d"
  card: "#ffffff"
  line: "#e3e7ee"
  land: "#eef0ec"
  land-high: "#d9ded6"
  sea: "#d3e4f3"
  shore: "#e6f0f9"
  coast: "#8fa7bf"
  river: "#a9c9ea"
  map-border: "#b9bfc8"
  water-label: "#2e5f95"
typography:
  display-hero:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(44px, 7.4vw, 72px)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.045em"
    fontVariation: "opsz auto"
  display:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "56px (66px from 1024px)"
    fontWeight: 600
    lineHeight: 0.92
    letterSpacing: "-0.04em"
    fontVariation: "opsz auto"
  title:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  result:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  stat:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  countdown:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body-lead:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.375
  step-title:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  option:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.375
    fontFeature: "tnum"
  action:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 700
  action-secondary:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  meta:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    fontFeature: "tnum"
  label:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  credit:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.625
  map-label:
    fontFamily: "Noto Sans Italic"
    fontSize: "15px (answer 18px; tile water names 11-18px by zoom)"
    fontWeight: 400
    letterSpacing: "0.12em"
rounded:
  pill: "9999px"
  card: "28px"
  card-lg: "30px"
  map-tile: "18px"
  tile: "16px"
  focus: "6px"
spacing:
  xs: "12px"
  sm: "16px"
  md: "24px"
  lg: "28px"
  xl: "36px"
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.card}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    height: "56px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.coral-deep}"
    textColor: "{colors.card}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.action-secondary}"
    rounded: "{rounded.pill}"
    height: "48px"
    width: "100%"
  sound-toggle:
    backgroundColor: "{colors.card}"
    textColor: "{colors.coral-deep}"
    rounded: "{rounded.pill}"
    size: "48px"
  sound-toggle-hover:
    textColor: "{colors.coral-deep}"
  sea-option:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.option}"
    rounded: "{rounded.tile}"
    padding: "12px 16px"
    height: "56px"
  sea-option-reached:
    backgroundColor: "{colors.drop}"
    textColor: "{colors.card}"
  sea-option-wrong:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.coral-deep}"
  sea-option-other:
    textColor: "{colors.ink-faint}"
  drop-token-scored:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "28px"
  drop-token-current:
    backgroundColor: "{colors.card}"
    textColor: "{colors.coral-deep}"
    rounded: "{rounded.pill}"
    size: "28px"
  drop-token-upcoming:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.pill}"
    size: "28px"
  stake-meter:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.coral-deep}"
    rounded: "{rounded.tile}"
    padding: "16px"
  first-time-hint:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    padding: "16px"
  stat-tile:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.stat}"
    rounded: "{rounded.tile}"
    padding: "12px 4px"
  done-today-panel:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.coral-deep}"
    rounded: "{rounded.tile}"
    padding: "16px"
  control-column:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    padding: "32px"
    width: "440px"
  tracker-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card-lg}"
    padding: "36px"
    width: "460px"
  notice-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card-lg}"
    padding: "32px"
    width: "460px"
  game-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "28px"
  coming-soon-slot:
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.card}"
    padding: "16px 28px"
  ad-slot:
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.tile}"
    height: "100px"
  map-pill:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  back-link:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 14px 6px 10px"
  preview-chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "40px"
  step-chip:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.coral-deep}"
    rounded: "{rounded.pill}"
    size: "40px"
  step-chip-active:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.card}"
---

# Design System: Downstream

## Overview

**Creative North Star: "The Raindrop Tracker"**

Downstream looks like a live delivery-tracking screen whose parcel is a raindrop. A pale, softly hillshaded relief fills the ground; a coral raindrop travels down a drop-blue route with eased, weighty motion; floating white cards with large radii and soft lifted shadows explain the game and start it. The map is the world, the cards are the interface, the drop is coral and the water is blue.

The system is minimal and friendly: one obvious action, very few words, figures set as data. It is a daily-games product that must look like its own thing. Confirmed rejections from the user: the printed-atlas look (judged about ten years too old), NYT Games styling, corporate/SaaS styling, blue as a main colour, and decorative "live" devices on the interface (pulsing dots, status lines, pulse halos), removed as filler. The reveal on the game map is the show: the raindrop glows and leads the water, the current flows, the camera travels with the drop, and quiet synthesized sound follows it.

Scope: recorded from the site homepage (`/`, the games list), Downstream's front page (`/downstream`, the tracker) and the game screen (`/downstream/play`, the split-screen control column beside Downstream's own MapLibre map). The game screen is built from shared pieces in `games/downstream/ui.tsx`; new game states should reuse them.

**Key Characteristics:**
- Pale relief map (or plain pale land) as ground; white cards float above it.
- Coral is the brand, the raindrop and the player's actions; drop-blue belongs to water only.
- Bricolage Grotesque for display and headings; Hanken Grotesk with tabular figures for everything else.
- Everything rounded: pills, 16px tiles and 28-30px cards, no hard corners on interface surfaces.
- Motion has mass: eased flow, a camera that travels with the drop, gentle lifts; reduced motion gets a finished still frame.

## Colors

Cool, quiet map neutrals with exactly two saturated voices: warm coral for the brand, the drop and the player, cold drop-blue for water.

### Primary
- **Signal Coral** (coral): the brand colour and the raindrop. The Play pill, the Next button and the Share button, the raindrop at the head of the water (with its 32% glow) and the game map's pin, the hollow origin ring where it fell, the ripple ring at each stop, the active step chip, scored drop tokens, the full points-at-stake segments, the dotted timeline thread (at 35%), the full stop after every title, headline and result line, the homepage drop mark and the mini-map's drop and pin; the hover ring on a sea option; also text selection. White text on a coral fill is only allowed large and bold (19px bold, about 3.4:1); small figures on coral are set in ink (5.1:1), as on scored drop tokens.
- **Deep Coral** (coral-deep): hover and pressed state of the coral buttons (about 4.5:1 with white), icons on coral-soft chips, coral text (the game card's "Play" label and status line, "Done today", the back link, sound toggle and preview chips on hover, the points in "+3", the stake number, a wrong pick's text, the current drop token's number, the first-time hint's "Got it"), the option seas' map lettering, and the focus ring.
- **Coral Blush** (coral-soft): resting background of the step icon chips, the points-at-stake panel and the Done-today panel (at 60%), the first-time hint (at 70%), and a wrong pick's tile; the quiet tint behind coral.

### Secondary
- **Drop Blue** (drop): water and nothing else. The route on the game map (26px blurred glow at 22% under a 6px core), the hero's route (dashed plan at 50%, glow, core), the two splash rings at the sea, the destination ring, the mini-map route, the answer sea's name on the game map, and the sea option the drop reached.

### Neutral
- **Slate Ink** (ink): titles, step titles, option names, figures on coral tokens, map city dots and names. At 25% it sets the ghost numbers of coming-soon slots; at 12-15% dashed placeholder borders and the secondary-pill ring; at 8% a missed drop token.
- **Soft Slate** (ink-soft): leads, step lines, the question line and fact line, closing notes, the hint body, the sound toggle icon, the Done-today countdown, the map hint pill, country names on the game map (at 75%).
- **Faint Slate** (ink-faint): metadata (puzzle number and date, game facts, "of 5", "· stop n of 3"), stat labels, the streak note, the homepage countdown, faded options, upcoming tokens, footer, attribution, scrollbar thumb. About 5.5:1 on white, 4.7:1 on land.
- **Card White** (card): cards, the control column, tiles, pills, map labels, marker rings, and the flowing current on the route (at 80%).
- **Hairline** (line): dividers inside cards and the day summary, resting rings on tiles, stat tiles, tokens and chips, the phone sheet grabber.
- **Pale Land** (land) / **Land Rise** (land-high): page ground and the low/high ends of the terrain shader; land is also the game map's background.
- **Still Sea** (sea): the flat sea, the game map's water, the renderer clear colour, the `html` background, the no-WebGL ground and the mini-map's sea.
- **Shore Band** (shore): the lighter band where sea meets land.
- **Coastline** (coast): the thin coast stroke in the terrain shader, the mini-map and the game map (0.8px at 70%).
- **Faint River** (river): thin background rivers, never the tracked route.
- **Border Grey** (map-border): dashed country borders on the game map only.
- **Water Ink** (water-label): map lettering only, for the tiles' own ocean and sea names. The four option seas are not lettered in it: they are the player's choices, so they are lettered in Deep Coral (user, 2026-10-16: the option names were getting drowned out by city and country names).

### Named Rules
**The Water Is Blue Rule.** Drop-blue and its map inks are strictly water: routes, rivers, background sea names, the destination sea's ring, the splash rings at the sea and, once a drop is decided, the tile and the map name of the sea it reached. The four option seas' names, while still a choice, are the player's and so coral. The raindrop itself, where it fell, its ripple at each stop, step icons and anything the player acts on are coral. Never use blue for buttons, links, icons, headings or brand surfaces; the reached-sea tile is disabled, a statement of water, not an action.

**The One Coral Action Rule.** One solid coral button per screen. While guessing there is none (the seas are the choice and Let it flow is white); on a result the Next button is the only one; on the day summary, and on the front page once today is done, Share is the only one (See your results is white). Coral elsewhere marks the drop, the player's progress and the brand's full stop; it never fills a second action or decorates a surface.

## Typography

**Display Font:** Bricolage Grotesque, optical-size axis enabled (with Helvetica Neue, Arial)
**Body Font:** Hanken Grotesk (with Helvetica Neue, Arial)
**Map Label Font:** Noto Sans (Italic, Regular, Bold), map lettering only

**Character:** Bricolage brings a quirky, characterful grotesque for titles and headings; Hanken is a calm, neutral UI face. Both are self-hosted through next/font. Tabular figures are on site-wide. Map labels are drawn by MapLibre from glyphs the tile host serves, and OpenFreeMap serves only Noto Sans; that is an intentional constraint, not a third voice to reuse in the interface.

### Hierarchy
- **Display hero** (600, clamp(44px, 7.4vw, 72px), line-height 0.95, -0.045em, max 13ch, balanced): the site homepage headline, ending in a coral full stop.
- **Display** (600, 56px; 66px on desktop; line-height 0.92; -0.04em): a game's wordmark on its front page, ending in a coral full stop; also the day's score in the day summary (56px, with the "/ max" at 28px ink-faint).
- **Title** (600, 34px, -0.035em, Bricolage): a game's name on its homepage card, coral full stop; the stake number in the points meter (coral-deep, its "pts" at 16px).
- **Result** (600, 30px, -0.03em, Bricolage): the result line after a drop ("Right. +3" with a coral full stop and coral-deep points; "Not this time."; "Here's where it goes."), and the notice card's heading (30px). The Done-today score on the front page is a 28px step of the same voice, its "/ max" at 16px ink-faint.
- **Stat** (600, 24px, line-height 1, -0.02em, Bricolage): the figures in the day summary's stats grid.
- **Headline** (600, 22px, -0.02em, Bricolage): section headings ("The games", "How a round works"), the game's drop counter ("Drop 2" with "of 5" in ink-faint) and the day summary's heading ("Done for today" with a coral full stop).
- **Countdown** (600, 20px, -0.02em, Bricolage): "New drops in 5h 12m" in the day summary. Elsewhere the countdown takes the surrounding meta size (14px; semibold ink-soft in the Done-today panel, ink-faint on the homepage card).
- **Body lead** (400, 18px, snug): the pitch under a display line (17px inside the game card).
- **Step title / Option** (600, 16px): timeline step titles; sea option names (leading tight).
- **Body** (400, 15px, snug): step lines, coming-soon copy, the question line, closing lines, the first-time hint (its first line semibold ink, the rest ink-soft); the fact line under a result is 16px.
- **Action** (700, 19px): the coral button label.
- **Action secondary** (600, 15px): the white pill label (Let it flow with its "· stop n of 3" in ink-faint, secondary Share, See your results).
- **Meta** (400-600, 14px, ink-faint): puzzle number and date, game facts, the homepage card's status line, the summary's per-drop notes, the stake caption (semibold, coral-deep).
- **Label** (500-700, 12px): map pills, the back link, the puzzle-number pill, drop token numbers, stat labels (semibold ink-faint), the streak note (regular ink-faint), the destination label; the uppercase wide-tracked state word inside a decided tile ("Reached", "Your pick").
- **Credit** (400, 11-12px, ink-faint): data attribution and the site footer line.
- **Map label** (Noto Sans Italic, 0.12-0.18em tracking, white halo): water names in Water Ink at 11-18px by zoom and class (oceans biggest); option seas in Noto Sans Bold, upright, 17px, Deep Coral with a 2.6px white halo (the strongest lettering on the map); on the result the answer becomes drop-blue, swells from 20px to 26px and settles back to 20px over 900ms, and the others fade to 40%. Country names Noto Sans Bold, uppercase, 10-14px, ink-soft at 75%; city names Noto Sans Regular (capitals Bold) 11-14px in ink beside a ringed ink dot.

### Named Rules
**The Tabular Figures Rule.** Any figure that changes (km, puzzle number, date, points, stats, the countdown) uses tabular figures, which are on site-wide. The live distance lives in the map's destination label ("Western Sea · 60 km to go", then "Reached the Western Sea"), never as a status line in the card.

**The Site Fonts Rule.** Interface text is Bricolage or Hanken only. Noto Sans appears solely inside the MapLibre canvas, because it is the only glyph set the tile host serves.

## Layout

**Site homepage (`/`):** a single centred column, max 760px, 20px side padding (32px from 640px), on pale land. Header row (drop mark and site name left, date right), headline block about 8svh below, then "The games" as a one-column list with 12px gaps, a closing note, and a footer line pushed to the bottom of the viewport. It scrolls naturally; no map.

**Game front page (`/downstream`), desktop (from 1024px):** one viewport with no scrolling. The map fills the screen (`100svh`, overflow hidden); the tracker card is set in at left `max(2rem, 6vw)`, vertically centred, 460px wide. The card reports its right edge (+24px) to the scene, which offsets its camera (`setViewOffset`) so the route is framed in the open area beside the card, never under it. The back-link pill sits top-left aligned with the card (24px from the top); the hint pill and attribution sit bottom-right.

**Game front page, phones:** the map takes the top 56svh (min 340px), and the card becomes a bottom sheet that overlaps the map by 28px, rounded on top only, with a short grabber bar. Attribution flows below the sheet. Camera field of view widens in portrait.

Rhythm inside the tracker card: 14px title to lead, 24px to the Play pill (or the Done-today block), 12px to the meta line, 28px to a hairline, 24px to the "How a round works" heading, 16px to the timeline, 10px vertical padding per step, 16px chip-to-text gap. Card padding is 36px on desktop; 20px sides and 28-32px top/bottom on phones. Once today's puzzle is finished, the Play pill and its meta line give way to the Done-today panel, then 16px, Share and See your results stacked with 8px between.

**Game screen (`/downstream/play`), desktop (from 1024px):** split screen in one viewport (`100svh`, overflow hidden): a fixed 440px white control column on the left (32px padding, scrolls internally if it must) and the map filling the rest. The map carries the same sea buttons as phones, one size up (15px text, 16px x 8px padding, max 176px wide) (with "Hide seas" at its bottom-left); picking a sea on the map or in the sidebar lights both up (the sidebar tile turns coral with a "Picked" label), and a coral "Lock in X · N pts" button appears under the tiles, above Let it flow. Clicking the picked sea again un-picks it. Every other control always sits in the same place. Column order: top bar (back link left; puzzle-number pill right), 32px, drop counter with the five drop tokens on the same row, 24px, the first-time hint on a player's very first drop (then 24px), the points-at-stake meter, 20px, the question line, 12px, the four sea tiles stacked with 8px gaps, 12px, Let it flow. On a result the hint, meter and question give way to the result line and fact, the decided tiles, and the Next button, at 16px gaps. After the fifth drop the day summary takes the column, its blocks 20px apart. The ad slot sits at the column's foot (pushed down with `margin-top: auto`, 32px above).

**Game screen, phones (Tap the sea):** the map fills the screen (100svh) and nothing scrolls while playing. Floating over it: the top bar (back link, puzzle pill, 48px sound button) 12px from the edges; the four option seas as small sea buttons at their map positions; a "Hide seas" pill at the bottom-left above the bar. A white bottom bar (26px top radius, upward shadow) holds the drop tokens and the "Worth N pts" chip (four draining coral bars), then a one-line prompt and Let it flow; after a pick it becomes the lock-in step ("Lock in X?", Change + coral Lock in); on a result, the 26px result heading, the fact, and Next. The first-time tip is a one-line white bubble under the top bar. The day summary scrolls as a page under a 34svh map.

**Sea buttons (phones):** white/95 pills, 12.5px bold coral-deep, 1.5px coral/60 ring, small shadow, max 124px wide, centred on the sea's label point; an invisible ::after extends the touch area 8px each way. Selected: coral fill, white text, 2px white ring, 110% scale. Buttons that would overlap are nudged down 34px. Hidden: no buttons and no option names on the map.

**The framing rule for the game map:** the camera always fits the pin plus all four option seas' label points (plus any route drawn), 60px padding, max zoom 6, so the choices are on screen while the player decides; mid-reveal it leans in and travels with the drop, then settles back to that framing.

## Elevation & Depth

Two layers: the relief (or plain land) as ground, and white surfaces floating over it with one soft, diffuse shadow. On the game map, depth comes from the coast line and water colour, not from interface effects (the 3D hero keeps its baked relief). No blur, no glass. The game map's hillshade is muted (exaggeration 0.55, slate shadow, white highlight) so labels stay legible. The raindrop's glow and the route's glow are map paint inside the canvas, not interface shadows.

### Shadow Vocabulary
- **Card lift** (`box-shadow: 0 18px 50px -18px rgb(18 26 43 / 0.28), 0 3px 10px -4px rgb(18 26 43 / 0.12)`): the tracker card, the notice card, the game card at rest, every map pill, the back link, puzzle-number pill and sound toggle, the destination label, the phone sheet.
- **Card lift raised** (`box-shadow: 0 24px 60px -20px rgb(18 26 43 / 0.32), 0 3px 10px -4px rgb(18 26 43 / 0.12)`): a linked card on hover, together with a 2px rise.
- **Column edge** (`box-shadow: 8px 0 30px -18px rgb(18 26 43 / 0.3)`): the desktop control column, a soft diffuse falloff onto the map.
- **Tile rest** (`box-shadow: 0 2px 6px -2px rgb(18 26 43 / 0.12)`): an open sea option, so it reads as pressable.
- **Pin lift** (`box-shadow: 0 2px 8px rgb(18 26 43 / 0.35)`): the coral pin on the game map.
- **Coral glow** (`box-shadow: 0 10px 24px -10px rgb(217 61 70 / 0.75)`): only under the coral button (Play, Next, primary Share).

### Named Rules
**The No Glass Rule.** Map overlays are solid white with the card shadow; never backdrop blur or translucent panels.

## Shapes

Everything the player touches or reads is rounded. Pills (fully round) for the coral buttons, the white secondary pills, map pills, the back link, the sound toggle, labels, drop tokens, preview chips and step chips; 16px corners for sea tiles, the stake meter, the first-time hint, the Done-today panel, stat tiles, the day-summary list and the ad slot; 28px corners for the game card, coming-soon slots and phone sheets; 30px for the desktop tracker and notice cards; 18px for the mini-map tile. The desktop control column is a full-height panel with square edges, the one unrounded surface, because it is the screen's frame rather than a floating card. Placeholders are drawn, not filled: a 2px dashed border at ink 12-15%. The timeline thread is a 2px dotted coral line at 35%. Map markers are round discs: the game map's pin is an 18px coral disc with a 3px white ring while it is the raindrop and turns into a hollow coral ring (white fill, coral border) once the water flows; the raindrop at the head of the water is a coral disc (8.5px radius, 3px white stroke); the hero's origin is white with a coral ring, its destination white with a blue ring. Ripples are thin open rings, never filled. Interface icons are inline 20px-grid SVG line icons (1.8 stroke, round caps and joins; arrows and share at 2-2.2) rendered at 14-18px; the speaker in the sound toggle has a filled body with stroked waves (or a stroked cross when muted). The site's drop mark is a filled coral raindrop silhouette.

## Components

### Buttons
- **Shape:** full pill, full column or card width.
- **Primary (Play, Next, Share):** coral, 56px tall, white 19px bold label with a trailing arrow icon (Share leads with an upload icon instead); coral glow beneath. On the game screen it appears only on a result ("Next drop", "See today's results", which takes focus) and on the day summary (Share).
- **Hover / Focus:** background deepens to coral-deep over 200ms ease-out; arrow nudges 2px right; pressed scales to 0.98. Focus ring (site-wide) is a 3px coral-deep outline, 3px offset, 6px radius.
- **Secondary (Let it flow, See your results, secondary Share):** white pill, 48px tall, ink/15 ring, 15px semibold ink label; the ring darkens to ink/35 on hover. Let it flow adds "· stop n of 3" in ink-faint and a down arrow that nudges 2px down on hover, and presses to 0.99; at the last stop it reads "Show me where it goes · no points" without the arrow.
- **Share feedback:** on phones the system share sheet opens; elsewhere the text is copied and the label reads "Copied. Paste it anywhere" (or "Couldn't copy") for 2.2s, announced politely, then returns to "Share your result".

### Button cursor
- Every enabled button (and `role="button"`) shows the hand cursor (global rule in `app/globals.css`); disabled buttons, such as a decided drop's sea tiles, keep the arrow.

### Sound toggle
- A 48px round white button with card lift, pinned to the game map's top-right corner (24px in on desktop; below the floating top bar on phones), so it's big and easy to find. A 24px speaker icon: coral-deep with waves when sound is on, ink-faint with a cross when muted; scales to 105% on hover and 95% when pressed. `aria-pressed` is true while sound is on; the label says what a press will do ("Turn sound off"). The choice is remembered site-wide.

### Sea options (signature, game screen)
- Four stacked tiles, 16px radius, min 56px tall, 12px x 16px padding, 16px semibold names, 8px gaps.
- **Open:** white, hairline ring, tile-rest shadow; hover takes a 2px coral ring and lifts 1px; 200ms ease-out.
- **Reached:** drop-blue fill, white name, an uppercase "Reached" label at the right.
- **Your pick (wrong):** coral-soft fill, coral-deep text, coral/40 ring, an uppercase "Your pick" label.
- **Other:** white at 60%, ink-faint name, hairline ring. Decided tiles are disabled.

### Drop tokens
- Five 28px round tokens, 6px gaps, 12px bold figures, beside the drop counter and again in the day summary. **Scored:** coral with the points in ink. **Miss:** ink/8 with an en dash in ink-faint. **Current:** white, 2px coral ring, coral-deep number. **Upcoming:** white, hairline ring, ink-faint number.

### First-time hint
- Shown once, on a player's very first drop, above the stake meter: a coral-soft (70%) note, 16px radius, 16px padding, `role="note"`. A semibold 15px ink first line ("First time? Here's the idea."), one ink-soft paragraph that names Let it flow in semibold ink, and a 14px semibold underlined "Got it" in coral-deep. It also goes away on the first guess or flow.

### Points-at-stake meter
- A coral-soft (60%) panel, 16px radius, 16px padding. A 14px semibold coral-deep caption ("A correct call now is worth") on the baseline with a 34px Bricolage coral-deep number and "pts". Below, four 8px pill segments: the points still available are solid coral, spent ones coral/20, draining one per stop with a 500ms colour transition.

### Result line
- A 30px Bricolage line in a status region: "Right." with a coral full stop and the points ("+3") in coral-deep, or "Not this time.", or "Here's where it goes." if the player let it flow to the end; then the fact line in 16px ink-soft. When the nearest sea to the pin is not the answer, the fact leads with the surprise: "The Black Sea is the nearest sea, but this water travels 2,140 km to the Mediterranean Sea." Otherwise the puzzle's plain distance fact.

### Day summary
- In the control column after the fifth drop, blocks 20px apart: the heading "Done for today." (22px Bricolage, coral full stop); the score in 56px Bricolage with "/ max" at 28px ink-faint; the drop tokens; the coral Share button (the screen's one coral action); a 4-up stats grid (Streak, Best, Played, Average), each a white 16px-radius tile with a hairline ring, a 24px Bricolage figure over a 12px semibold ink-faint label, 8px gaps; directly under it a 12px ink-faint note that the streak forgives one missed day a week; the countdown in 20px Bricolage; then a white 16px-radius list with hairline ring and dividers: each drop's answer in semibold, a "You said …" or "No guess" note in 14px ink-faint, and its points right-aligned (coral-deep when scored, "0" in ink-faint). The preview chips follow in preview mode.

### Done-today panel (game front page)
- Replaces the Play pill once today's puzzle is finished. A coral-soft (60%) panel, 16px radius, 16px padding: "Done today · N-day streak" (streak shown from 2 days) in semibold coral-deep on the baseline with the score in 28px Bricolage ink and "/ max" at 16px ink-faint; below, the day's share marks at 20px with 0.15em tracking (the same marks the share text carries, labelled for screen readers); then the countdown in 14px semibold ink-soft. Under the panel, 16px: the coral Share button and the white See your results pill.

### Countdown
- "New drops in 5h 12m" (then "12m", then "under a minute"): the time to the player's next local midnight, ticking every 15s. Browser-only: empty at build time and on first render, so it never mismatches. It takes its size and colour from where it sits.

### Cards / Containers
- **Control column (game screen):** card white; 440px fixed with the column-edge shadow on desktop; a top-rounded 28px sheet with card lift on phones.
- **Tracker card:** card white, card-lift shadow; 460px wide, 36px padding, 30px radius on desktop. On phones it is a bottom sheet with 28px top corners only and a 40x4px hairline grabber.
- **Notice card:** the game screen's loading, launches-soon and missing-puzzle states: a 460px max card with 30px radius, 32px padding and card lift, centred on pale land; the top bar, then a 30px Bricolage line ending in a coral full stop and one ink-soft line. Calm and honest, never an error.
- **Game card (homepage):** the whole card is the link. White, 28px radius, card-lift, 20px padding (28px from 640px); text column (title, 17px lead, then a 14px status line) beside the mini-map. The status line reads, in order of what is true: "Done today · 14/20" in semibold coral-deep with the countdown in ink-faint; or "Keep your N-day streak going" in semibold coral-deep; or the game facts in ink-faint separated by middots; the last two end in a coral-deep "Play" with arrow. Hover: rises 2px and takes card-lift raised over 175ms ease-out; the arrow nudges 2px.
- **Coming-soon slot:** no fill, 2px dashed ink/12 border, 28px radius, 16px x 20-28px padding; a ghost number ("No. 2", 28px Bricolage at ink/25) and one honest 15px line in ink-faint.
- **Ad slot:** a reserved space at the foot of the control column, below every control. It renders nothing unless `NEXT_PUBLIC_SHOW_AD_SLOTS=1`; then it is a drawn placeholder, min 100px tall, 16px radius, 2px dashed ink/15 border, "Ad space" in 12px ink-faint. Ads never interrupt play.

### Chips
- **Preview chips:** 40px round white chips with a hairline ring and a 14px bold puzzle number; hover turns the ring coral and the number coral-deep. Under a 14px ink-faint line, in the notice card and the preview day summary.

### Navigation
- **Site header (homepage):** coral drop mark plus the site name in Bricolage 18px semibold left, today's date and puzzle number in 14px ink-faint right. Plain, no bar or background.
- **Back link:** white pill with card-lift, 12px semibold name after a back arrow; on the front page it reads the site name and links to `/`; on the game screen it reads "Downstream." (coral full stop) and links to `/downstream/`. Hover turns the text coral-deep and nudges the arrow 2px left.
- **Game top bar:** the back link left; on the right a white puzzle-number pill ("No. 4" or "Preview 4", 12px semibold ink-soft, card lift) and the sound toggle, 8px apart. In the column on desktop; floating over the map on phones.

### Map pills
- White, pill-shaped, card-lift shadow, 12px text, no blur. Used for the interaction hint (medium ink-soft) and the destination label that tracks the route's end on the map (semibold ink, 4px x 10px), which carries the remaining distance.

### Step timeline
- Under a hairline: a 22px headline ("How a round works"), then an ordered list of three steps. Each row is a 40px round icon chip plus a 16px semibold title over a 15px ink-soft line. A dotted coral thread runs behind the chips from first to last. Chips rest in coral-soft with coral-deep icons and turn solid coral with white icons as the demo drop reaches that step (500ms colour transition). A 14px ink-faint meta line closes the section.

### Mini-map (signature, homepage)
- An authored SVG tile (150x104, 112px wide on phones): sea, land, coast stroke, faint rivers, a drop-blue route that draws itself in, and a coral drop that runs along it via CSS `offset-path` to a blue-ringed destination, from a coral-ringed pin. 5s loop on `cubic-bezier(0.65, 0, 0.35, 1)`. Reduced motion: the finished state (route drawn, drop at the sea).

### Relief scene (signature, game front page)
- three.js terrain with a baked hillshade, flat sea with shore band and coast stroke, faint thin rivers. The tracked route is three drop-blue lines (dashed plan, glow, core). The drop is a coral disc with a white ring; the origin a white disc with a coral ring; the destination a white disc with a blue ring and the floating label. Route growth uses flowEase (cubic in-out: slow start, steady flow, gentle arrival); the camera eases towards the route (exponential follow) rather than jumping. Tapping or clicking the land starts a new drop.
- **States:** with reduced motion, one still frame is drawn (route complete, no auto-advance) and redrawn only on resize or tap. The loop pauses when the scene is off screen or the tab is hidden. Without WebGL, the hint pill is not rendered, the timeline stays at rest, and the sea colour is the ground.

### Game map (signature, game screen)
- Downstream's own MapLibre style on OpenFreeMap vector tiles, the same world as the relief scene: pale land background, sea-coloured water, faint rivers, a 0.8px coast line, dashed Border Grey country borders, near-white ice. No terrain shading, parks, roads or POIs (shading and parks were removed for speed, 2026-10-16). Labels as in the Map label role: water names first, then countries, then city dots and names.
- **Overlays:** the pin (18px coral disc, 3px white ring, pin lift) that becomes a hollow coral ring, "where it fell", as soon as water leaves it (400ms colour ease); the route in drop-blue as a 26px glow at 22% (blur 9) under a 6px core, with a white current (2.4px at 80%) flowing along it, above every layer; the raindrop at the head of the water, a coral disc with a white stroke inside a soft coral glow (24px radius, 32%) that breathes ±6px, gone once it reaches the sea; the four option seas lettered from the puzzle file's `seaLabels`, with the tiles' own copies of those names filtered out so none appears twice. While guessing they are lettered bold in Deep Coral, above the place names; on the result the answer turns drop-blue and swells, and the others fade to 40%.
- **Motion:** a new drop's pin lands with a 700ms fall and bounce (`cubic-bezier(0.22, 1.2, 0.36, 1)`) while the camera frames the pin and the four seas (1.2s). Each reveal grows the route by distance (Turf slice) with cubic in-out easing over 1.6-3.2s per stop (longer stretches flow longer; up to 4.2s to the sea), the raindrop leading. The camera settles towards the overview in the first 30% while leaning in and travelling with the drop on a sine curve (+0.8 to +1.4 zoom, more for short stretches), so it lands exactly on the overview. The current's dash pattern steps every 55ms. A coral ripple ring opens at each stop and two blue rings at the sea (1.1s, eased out). Reduced motion: no camera travel, ripples, current, breathing or landing; the camera and line jump to each finished stage. No rotation or pitch.

### Sound (game screen)
- Synthesized in the browser with Web Audio, no audio files: a drip when rain lands on the pin, calm bubbles for exactly as long as the route draws (about 5 a second, easing to 9, growing slightly lower as the stream becomes a river), a two-note chime at each stop, a splash at the sea, a bubble "bloop" for ordinary buttons (Let it flow, Got it, Share, turning sound on), an upward swish for Next, three rising bubbles and a ringing mallet note for a right call, and two hollow wooden notes stepping down for a wrong one. Every sound follows a player's tap. Mute is the big button in the map's top-right corner and is remembered.

## Do's and Don'ts

### Do:
- **Do** make the raindrop and the player's actions coral: the drop, where it fell, step icons, the Play, Next and Share buttons, scored tokens, the full stop.
- **Do** keep drop-blue for water: routes, rivers, sea names, the splash at the sea and the sea a drop reached.
- **Do** keep one solid coral button per screen; white text on coral at 19px bold or larger only, ink for small figures on coral.
- **Do** float interface on solid white surfaces with the card-lift shadow and pill, 16px or 28-30px corners.
- **Do** fit a game's front page and game screen in one desktop viewport, keeping the route clear of the interface; let phones scroll with the interface as a sheet below the map.
- **Do** keep the game's controls in fixed places in the control column; nothing floats over the game map but the top bar on phones.
- **Do** keep the four option seas lettered and in frame whenever a drop is on screen.
- **Do** put live figures on the map or in the stake meter, set in tabular figures.
- **Do** ease every movement with mass, and show the finished state under prefers-reduced-motion.
- **Do** make the reveal the show: the raindrop leads the water, the camera travels with it and settles back to the overview, and each stop and the sea get a ripple.
- **Do** keep sound quiet and short, synthesized, tied to what the water is doing; a wrong call is soft falling notes, never a buzzer; muting persists.
- **Do** lead the result with the surprise when the nearest sea is not where the water goes.
- **Do** mark unfinished things honestly: dashed slots with plain copy, never fake content.
- **Do** reserve ad space only below the controls, at the column's foot or the end of a game.
- **Do** keep map attribution small (11px, ink-faint) in a corner or below the sheet.

### Don't:
- **Don't** use blue as a main or brand colour, or on buttons, icons, links and headings.
- **Don't** return to the printed-atlas look: no parchment, engraved labels or vintage cartography.
- **Don't** imitate NYT Games, and don't drift into corporate/SaaS dashboards.
- **Don't** add pulsing live dots, pulse halos or status lines to the interface; the moving drop and the map label carry the live state. The one breathing glow is the raindrop's own, on the map.
- **Don't** put kickers or eyebrow labels above headings.
- **Don't** use backdrop blur or glass panels over the map.
- **Don't** use Noto Sans outside the map canvas.
- **Don't** animate linearly or let the camera jump (except under reduced motion).
- **Don't** play sound before a tap, loop it after the water stops, or forget a player's mute.
