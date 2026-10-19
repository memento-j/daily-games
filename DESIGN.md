---
name: Downstream
description: A live delivery tracker for a raindrop, over a pale relief map.
colors:
  coral: "#f2545b"
  coral-deep: "#c0303a"
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
  score-suffix:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 600
  result-compact:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "26px"
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
  action:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 700
  action-strong:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 700
  step-title:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  body:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.375
    fontFeature: "tnum"
  action-secondary:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  sea-button:
    fontFamily: "Hanken Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px (12.5px on phones)"
    fontWeight: 700
    lineHeight: 1.15
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
    fontSize: "11-18px by zoom (result lettering 17px, answer 20px)"
    fontWeight: 400
    letterSpacing: "0.12em"
rounded:
  pill: "9999px"
  card: "28px"
  card-lg: "30px"
  sheet: "26px"
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
  lock-in-button:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.card}"
    typography: "{typography.action-strong}"
    rounded: "{rounded.pill}"
    height: "56px"
    width: "100%"
  lock-in-slot:
    textColor: "{colors.ink-faint}"
    typography: "{typography.action-secondary}"
    rounded: "{rounded.pill}"
    height: "56px"
    width: "100%"
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
  sound-toggle-muted:
    textColor: "{colors.ink-faint}"
  sea-button:
    backgroundColor: "{colors.card}"
    textColor: "{colors.coral-deep}"
    typography: "{typography.sea-button}"
    rounded: "{rounded.pill}"
    padding: "8px 16px (6px 10px on phones)"
  sea-button-hover:
    backgroundColor: "{colors.coral-soft}"
  sea-button-picked:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.card}"
  hide-seas-toggle:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 12px 6px 10px"
  result-reached:
    backgroundColor: "{colors.drop}"
    textColor: "{colors.card}"
    rounded: "{rounded.tile}"
    padding: "12px 16px"
  result-your-pick:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.coral-deep}"
    rounded: "{rounded.tile}"
    padding: "12px 16px"
  drop-token-correct:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "28px"
  drop-token-wrong:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.coral-deep}"
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
  points-chip:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.coral-deep}"
    rounded: "{rounded.pill}"
    padding: "6px 14px 6px 12px"
  first-time-hint:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    padding: "16px"
  summary-drop-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    padding: "12px 16px"
  summary-drop-row-selected:
    backgroundColor: "{colors.shore}"
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
  phone-bar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "16px 16px 28px"
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

Scope: recorded from the site homepage (`/`, the games list), Downstream's former front page (the 3D tracker; deleted 2026-10-18, when `/downstream` became the game itself) and the game screen (`/downstream`: on desktop a control column beside Downstream's own MapLibre map, on phones the map as the whole board under a bottom bar). The seas are chosen on the map itself, as sea buttons, in both layouts. The game screen is built from shared pieces in `games/downstream/ui.tsx` and `games/downstream/SeaButtons.tsx`; new game states should reuse them.

**Key Characteristics:**
- Pale relief map (or plain pale land) as ground; white cards float above it.
- Coral is the brand, the raindrop and the player's actions; drop-blue belongs to water only.
- Bricolage Grotesque for display and headings; Hanken Grotesk with tabular figures for everything else.
- Everything rounded: pills, 16px tiles and 26-30px cards and sheets, no hard corners on floating surfaces.
- Motion has mass: eased flow, a camera that travels with the drop, gentle lifts; reduced motion gets a finished still frame.

## Colors

Cool, quiet map neutrals with exactly two saturated voices: warm coral for the brand, the drop and the player, cold drop-blue for water.

### Primary
- **Signal Coral** (coral): the brand colour and the raindrop. The Play pill, the Lock in button, the Next button and the Share button, the raindrop at the head of the water (with its 32% glow) and the game map's pin, the hollow origin ring where it fell, the ripple ring at each stop, the active step chip, the 60% ring of a resting sea button, correct drop tokens, the full points-at-stake segments, the dotted timeline thread (at 35%), the full stop after every title, headline and result line, the homepage drop mark and the mini-map's drop and pin; also text selection. White text on a coral fill is only allowed large and bold (19px bold, about 3.4:1); small figures on coral are set in ink (5.1:1), as on correct drop tokens.
- **Deep Coral** (coral-deep): hover and pressed state of the coral buttons (about 5.6:1 with white), a picked sea button's fill (white name, 5.6:1), coral text on white and on coral-soft (4.8:1): the game card's "Play" and "See results" cues and status line, "Done today", the back link, Hide seas and preview chips on hover, the sound toggle's speaker while sound is on, the resting sea buttons' names and their number badges, the points in "+3", the stake number, the "Your pick" row and a wrong drop token's cross, the current drop token's number, the first-time hint's "Got it"; on the result map, a wrong pick's lettering and the faded options; and the focus ring.
- **Coral Blush** (coral-soft): resting background of the step icon chips, the points-at-stake panel and the Done-today panel (at 60%), the phone's "Worth N pts" chip, the first-time hint (at 70%), a sea button's hover and number badge, a wrong drop token, and the "Your pick" result row; the quiet tint behind coral.

### Secondary
- **Drop Blue** (drop): water and nothing else. The route on the game map (26px blurred glow at 22% under a 6px core), the two splash rings at the sea, the destination ring, the mini-map route, the answer sea's name on the result map, the "Reached" result row, and in the day summary the number of the drop whose route the map is replaying.

### Neutral
- **Slate Ink** (ink): titles, step titles, figures on coral tokens, the picked sea's name in the phone lock-in prompt, map city dots and names. At 25% it sets the ghost numbers of coming-soon slots; at 20% the Lock-in slot's dashed outline; at 12-15% dashed placeholder borders and the secondary-pill ring; at 8% a no-guess drop token; at 6% the summary's resting drop-number badges.
- **Soft Slate** (ink-soft): leads, step lines, the question line and fact line, the phone prompt, the share preview line, the "Your drops" heading, closing notes, the hint body, Hide seas, the Done-today countdown, the map hint pill, country names on the game map (at 75%).
- **Faint Slate** (ink-faint): metadata (puzzle number and date, game facts, "of 5", "· stop n of 3"), the Lock-in slot's "Pick a sea on the map", the desktop keys line, the emoji legend, the summary's per-drop notes, stat labels, the streak note, the homepage countdown, the sound toggle while muted, upcoming tokens, footer, attribution, scrollbar thumb. About 5.5:1 on white, 4.7:1 on land.
- **Card White** (card): cards, the control column, the phone bar, sea buttons (at 95%), pills, map labels, marker rings, and the flowing current on the route (at 80%).
- **Hairline** (line): dividers inside cards and the day summary, resting rings on stat tiles, tokens and chips, the phone sheet grabber.
- **Pale Land** (land) / **Land Rise** (land-high): page ground and the low/high ends of the terrain shader; land is also the game map's background and a summary row's hover.
- **Still Sea** (sea): the flat sea, the game map's water, the renderer clear colour, the `html` background, the no-WebGL ground and the mini-map's sea.
- **Shore Band** (shore): the lighter band where sea meets land; the selected row in the day summary's drop list.
- **Coastline** (coast): the thin coast stroke in the terrain shader, the mini-map and the game map (0.8px at 70%).
- **Faint River** (river): thin background rivers on the game map and the mini-map, never the tracked route.
- **Border Grey** (map-border): dashed country borders on the game map only.
- **Water Ink** (water-label): map lettering only, for the tiles' own ocean and sea names. The four option seas are never lettered in it: while guessing they are the sea buttons (coral-deep on white), and on the result map they are lettered in Deep Coral, the answer in drop-blue (user, 2026-10-16: the option names were getting drowned out by city and country names).

### Named Rules
**The Water Is Blue Rule.** Drop-blue and its map inks are strictly water: routes, rivers, background sea names, the destination sea's ring, the splash rings at the sea and, once a drop is decided, the "Reached" row and the map name of the sea it reached; in the day summary, the number of the drop whose water the map is showing. The four option seas, while still a choice, are the player's and so coral. The raindrop itself, where it fell, its ripple at each stop, step icons and anything the player acts on are coral. Never use blue for buttons, links, icons, headings or brand surfaces; the "Reached" row is a statement of water, not an action.

**The One Coral Action Rule.** One solid coral button per screen. While guessing there is none until a sea is picked (the sea buttons are the choice and Let it flow is white); a pick brings the coral Lock in, the only one; on a result the Next button is the only one; on the day summary, and on the front page once today is done, Share is the only one (See your results is white). A picked sea button fills coral as a selection, not as a second action. Coral elsewhere marks the drop, the player's progress and the brand's full stop; it never fills a second action or decorates a surface.

## Typography

**Display Font:** Bricolage Grotesque, optical-size axis enabled (with Helvetica Neue, Arial)
**Body Font:** Hanken Grotesk (with Helvetica Neue, Arial)
**Map Label Font:** Noto Sans (Italic, Regular, Bold), map lettering only

**Character:** Bricolage brings a quirky, characterful grotesque for titles and headings; Hanken is a calm, neutral UI face. Both are self-hosted through next/font. Tabular figures are on site-wide. Map labels are drawn by MapLibre from glyphs the tile host serves, and OpenFreeMap serves only Noto Sans; that is an intentional constraint, not a third voice to reuse in the interface.

### Hierarchy
- **Display hero** (600, clamp(44px, 7.4vw, 72px), line-height 0.95, -0.045em, max 13ch, balanced): the site homepage headline, ending in a coral full stop.
- **Display** (600, 56px; 66px on desktop; line-height 0.92; -0.04em): a game's wordmark on its front page, ending in a coral full stop; also the day's score in the day summary (56px).
- **Title** (600, 34px, -0.035em, Bricolage): a game's name on its homepage card, coral full stop; the stake number in the points meter (coral-deep, its "pts" at 16px).
- **Result** (600, 30px, -0.03em, Bricolage): the result line after a drop on desktop ("Right. +3" with a coral full stop and coral-deep points; "Not this time."; "Here's where it goes."), and the notice card's heading.
- **Score suffix** (600, 28px, Bricolage): the "/ 20" after the summary's big score (ink-faint), the Done-today score on the front page (ink, its "/ max" at 16px ink-faint), and the coming-soon slot's ghost number.
- **Result compact** (600, 26px, -0.03em, Bricolage): the same result line, one step down, in the phone game's bottom bar.
- **Stat** (600, 24px, line-height 1, -0.02em, Bricolage): the figures in the day summary's stats grid.
- **Headline** (600, 22px, -0.02em, Bricolage): section headings ("The games", "How a round works"), the game's drop counter ("Drop 2" with "of 5" in ink-faint) and the day summary's heading ("Done for today" with a coral full stop).
- **Countdown** (600, 20px, -0.02em, Bricolage): "New drops in 5h 12m" in the day summary. Elsewhere the countdown takes the surrounding meta size (14px; semibold ink-soft in the Done-today panel, ink-faint on the homepage card).
- **Body lead** (400, 18px, snug): the pitch under a display line (17px inside the game card).
- **Action** (700, 19px): the Play, Next and Share labels.
- **Action strong** (700, 17px): reserved; the Lock in label now uses the 19px action step (white on coral needs 19px bold).
- **Step title** (600, 16px): timeline step titles.
- **Body** (400, 15px, snug): step lines, coming-soon copy, the question line, the phone prompt, closing lines, the first-time hint (its first line semibold ink, the rest ink-soft; 14px in the phone bubble); the fact line under a result is 16px on desktop, 15px on phones.
- **Action secondary** (600, 15px): the white pill labels (Let it flow with its "· stop n of 3" in ink-faint, Change, secondary Share, See your results) and the Lock-in slot's placeholder.
- **Sea button** (700, 15px on desktop, 12.5px on phones, line-height 1.15): the sea names on the map's sea buttons; their number badges are 11px bold.
- **Meta** (400-600, 14px): puzzle number and date, game facts, the homepage card's status lines, the share preview line, the "Your drops" heading, the summary's per-drop notes, the stake caption and "Worth N pts" (semibold, coral-deep; the phone chip's number is 17px Bricolage), "Not sure? Let it flow first".
- **Label** (500-700, 12px): map pills, the back link, the puzzle-number pill, Hide seas, drop token figures, stat labels (semibold ink-faint), the streak note, the desktop keys line and "Press N…", the emoji legend, the destination label; the uppercase wide-tracked state word in a result row ("Reached", "Your pick").
- **Credit** (400, 11-12px, ink-faint): data attribution and the site footer line.
- **Map label** (Noto Sans Italic, 0.12-0.18em tracking, white halo): water names in Water Ink at 11-18px by zoom and class (oceans biggest). Option seas appear on the map only once a drop is decided (while guessing, the sea buttons letter them): Noto Sans Bold, upright, 17px with a 2.6px white halo; the answer in drop-blue at 20px, swelling to 26px and settling back over 900ms; a wrong pick in solid Deep Coral; untouched options in Deep Coral at 30%. Country names Noto Sans Bold, uppercase, 10-14px, ink-soft at 75%; city names Noto Sans Regular (capitals Bold) 11-14px in ink beside a ringed ink dot.

### Named Rules
**The Tabular Figures Rule.** Any figure that changes (km, puzzle number, date, points, stats, the countdown) uses tabular figures, which are on site-wide. The live distance lives in the map's destination label ("Western Sea · 60 km to go", then "Reached the Western Sea"), never as a status line in the card.

**The Site Fonts Rule.** Interface text is Bricolage or Hanken only. Noto Sans appears solely inside the MapLibre canvas, because it is the only glyph set the tile host serves.

## Layout

**Site homepage (`/`):** a single centred column, max 760px, 20px side padding (32px from 640px), on pale land. Header row (the Peeker mark and the site name "Pondo." left, date right), headline block about 8svh below, then "The games" as a one-column list with 12px gaps, a closing note, and a footer line pushed to the bottom of the viewport. It scrolls naturally; no map.




**Game screen (`/downstream`), desktop (from 1024px):** split screen in one viewport (`100svh`, overflow hidden): a fixed 440px white control column on the left (32px padding, scrolls internally if it must) and the map filling the rest. The seas are picked only on the map: four sea buttons at the seas' positions, each with a 1-4 number badge in option order; "Hide seas" sits at the map's bottom-left and the sound toggle at its top-right (24px in). The column holds everything else, always in the same place. Column order: top bar (back link left; puzzle-number pill right), 32px, drop counter with the five drop tokens on the same row, 24px, the first-time hint on a player's very first drop (then 24px), the points-at-stake meter, 20px, the question line ("Which sea does this raindrop reach?"), 12px, the Lock-in slot, 12px, Let it flow, 16px, the keys line ("Keys: 1–4 pick · Enter lock in · Space let it flow"). The Lock-in slot is the same height whether empty or filled, so picking never moves a button. On a result, from 24px below the counter, at 16px gaps: the result line and fact, the result rows, the Next button and "Press N for the next drop". After the fifth drop the day summary takes the column, its blocks 20px apart, and the map replays the selected drop. The ad slot sits at the column's foot (pushed down with `margin-top: auto`, 32px above).

**Keyboard (desktop):** 1-4 pick a sea (again to un-pick), Enter locks in the pick (when nothing else is focused, or on the picked sea itself), Space lets it flow, N goes on. A pick persists while the water flows and is cleared by the next drop.

**Game screen, phones:** the map fills the screen (100svh) and nothing scrolls while playing. Floating over it: the top bar (back link, puzzle pill, 48px sound button) 12px from the edges; "Hide seas" at top-left under the back link (62px from the top); the four option seas as sea buttons at their map positions, kept between 118px from the top and 34px above the bottom bar. A white bottom bar (26px top radius, upward shadow) holds the drop tokens and the "Worth N pts" chip (four draining coral bars), then a one-line prompt ("Pick the sea this raindrop reaches.") and Let it flow. After a pick it becomes the lock-in step: "Lock in X?", a white Change pill beside a coral Lock in, and a text button "Not sure? Let it flow first · stop n of 3" that keeps the pick. On a result the chip gives way to "Drop n of 5", then the 26px result line, the fact, "You said X." when wrong, and Next. The bar's contents rise in (260ms) when they change. The first-time tip is a white bubble at 104px from the top; the sea buttons start below its measured height while it shows. The day summary scrolls as a page under a sticky 34svh map (min 230px) that replays the selected drop, with the summary in a 26px-radius sheet overlapping it by 24px.

**Sea buttons:** white/95 pills with a 1.5px coral/60 ring and a small shadow, centred on each sea's label point and kept inside the map's free band. Phones: 12.5px bold coral-deep, 6px x 10px padding, max 124px wide; an invisible ::after extends the touch area 8px sideways and 12px up and down (at least 44px tall); buttons that would overlap are nudged down 34px. Desktop: 15px, 8px x 16px padding, max 176px wide, a 20px coral-soft number badge before the name; overlaps nudge 44px. Hover takes the coral-soft fill. Picked: coral fill, white text, 2px white ring, 110% scale, above the others (the badge turns white/25). Transitions 300ms `cubic-bezier(0.22, 1, 0.36, 1)`; press scales to 95%. Hidden: no buttons and no option names on the map; hiding clears a pick.

**The framing rule for the game map:** the camera always fits the pin plus all four option seas' label points (plus any route drawn), with the layout's padding (desktop 100px top and bottom, 120px sides; phones 100 top, 240 bottom, 70 sides), max zoom 6, so the choices are on screen while the player decides. At an intermediate stop it settles 35% of the way toward the revealed stretch and up to 0.7 zoom closer, so each stop visibly shows something; at the sea it settles on the full framing. Mid-reveal it leans in and travels with the drop.

## Elevation & Depth

Two layers: the relief (or plain land) as ground, and white surfaces floating over it with one soft, diffuse shadow. On the game map, depth comes from the coast line and water colour, not from interface effects or terrain shading. No blur, no glass. The raindrop's glow and the route's glow are map paint inside the canvas, not interface shadows.

### Shadow Vocabulary
- **Card lift** (`box-shadow: 0 18px 50px -18px rgb(18 26 43 / 0.28), 0 3px 10px -4px rgb(18 26 43 / 0.12)`): the notice card, the game card at rest, every map pill, the back link, puzzle-number pill, Hide seas and sound toggle, the phone first-time bubble, the destination label, the phone summary sheet.
- **Card lift raised** (`box-shadow: 0 24px 60px -20px rgb(18 26 43 / 0.32), 0 3px 10px -4px rgb(18 26 43 / 0.12)`): a linked card on hover, together with a 2px rise.
- **Column edge** (`box-shadow: 8px 0 30px -18px rgb(18 26 43 / 0.3)`): the desktop control column, a soft diffuse falloff onto the map.
- **Bar lift** (`box-shadow: 0 -12px 40px -16px rgb(18 26 43 / 0.35)`): the phone game's bottom bar, casting upward onto the map.
- **Sea button lift** (`box-shadow: 0 3px 10px -3px rgb(18 26 43 / 0.35)`): sea buttons on the map, so they read as pressable over busy ground.
- **Pin lift** (`box-shadow: 0 2px 8px rgb(18 26 43 / 0.35)`): the coral pin on the game map.
- **Coral glow** (`box-shadow: 0 10px 24px -10px rgb(217 61 70 / 0.75)`): only under the coral buttons (Play, Lock in, Next, primary Share).

### Named Rules
**The No Glass Rule.** Map overlays are solid white with the card shadow; never backdrop blur or translucent panels (the 95% white of sea buttons, Hide seas and the phone tip is the limit).

## Shapes

Everything the player touches or reads is rounded. Pills (fully round) for the coral buttons, the white secondary pills, the Lock-in slot, sea buttons and their number badges, map pills, Hide seas, the back link, the sound toggle, labels, drop tokens, the Worth chip, preview chips and step chips; 16px corners for the result rows, the stake meter, the first-time hint and phone tip, the Done-today panel, stat tiles, the day-summary list and the ad slot; 26px top corners for the phone game bar and summary sheet; 28px for the game card, coming-soon slots and the front page's phone sheet; 30px for the desktop tracker and notice cards; 18px for the mini-map tile. The desktop control column is a full-height panel with square edges, the one unrounded surface, because it is the screen's frame rather than a floating card. Placeholders are drawn, not filled: a 2px dashed border at ink 12-15% for slots, a 1px dashed ink/20 outline for the Lock-in slot. The timeline thread is a 2px dotted coral line at 35%. Map markers are round discs: the game map's pin is an 18px coral disc with a 3px white ring while it is the raindrop and turns into a hollow coral ring (white fill, coral border) once the water flows; the raindrop at the head of the water is a coral disc (8.5px radius, 3px white stroke). Ripples are thin open rings, never filled. Interface icons are inline 20px-grid SVG line icons (1.8 stroke, round caps and joins; arrows, check, cross and share at 2-2.6) rendered at 12-24px; the speaker in the sound toggle has a filled body with stroked waves (or a stroked cross when muted); the Hide seas eye is struck through while the seas show. The site's drop mark is a filled coral raindrop silhouette.

## Components

### Buttons
- **Shape:** full pill, full column, bar or card width.
- **Primary (Play, Next, Share):** coral, 56px tall, white 19px bold label with a trailing arrow icon (Share leads with an upload icon instead); coral glow beneath. On the game screen it appears on a result ("Next drop", "See today's results", which takes focus) and on the day summary (Share).
- **Lock in:** the coral button that confirms a pick. Desktop: in the Lock-in slot, 56px, "Lock in X" (truncating) then "· N pts" at white/80 and a check icon, rising in when it appears. Phones: 48px beside Change, "Lock in" with a check, focused when it appears. Its label is 19px bold, meeting the white-on-coral floor in Colors.
- **Lock-in slot (desktop):** before a pick, a 56px dashed ink/20 pill reading "Pick a sea on the map" in 15px semibold ink-faint, the exact footprint of the Lock in button, so nothing moves.
- **Hover / Focus:** background deepens to coral-deep over 200ms ease-out; arrow nudges 2px right; pressed scales to 0.98. Focus ring (site-wide) is a 3px coral-deep outline, 3px offset, 6px radius.
- **Secondary (Let it flow, Change, See your results, secondary Share):** white pill, 48px tall, ink/15 ring, 15px semibold ink label; the ring darkens to ink/35 on hover. Let it flow adds "· stop n of 3" in ink-faint and a down arrow that nudges 2px down on hover, and presses to 0.99; at the last stop it reads "Show me where it goes · no points" without the arrow.
- **Text button (phones):** "Not sure? Let it flow first · stop n of 3", 14px semibold ink-soft (the stop in ink-faint), at least 44px tall, darkening to ink on hover; shown under the lock-in step while stops remain.
- **Share feedback:** on phones the system share sheet opens; elsewhere the text is copied and the label reads "Copied. Paste it anywhere" (or "Couldn't copy") for 2.2s, announced politely, then returns to "Share your result".

### Button cursor
- Every enabled button (and `role="button"`) shows the hand cursor (global rule in `app/globals.css`); disabled buttons keep the arrow.

### Sound toggle
- A 48px round white button with card lift: at the game map's top-right corner on desktop (24px in), at the right end of the floating top bar on phones. A 24px speaker icon: coral-deep with waves when sound is on, ink-faint with a cross when muted; scales to 105% on hover and 95% when pressed. `aria-pressed` is true while sound is on; the label says what a press will do ("Turn sound off"). The choice is remembered site-wide.

### Sea buttons (signature, game screen)
- The four option seas as buttons on the map, where each sea is (see Layout for sizes and placement). Tap or click to pick; the same one again un-picks it; a pick is only a guess once it is locked in. `aria-pressed` marks the pick; the group is labelled with the question; tab order follows the 1-4 badges.
- **Hide seas / Show seas:** a white/95 pill with card lift, 12px semibold ink-soft with an eye icon, coral-deep on hover; a plain action (no pressed state). Hiding removes the buttons and the option names, to see the whole map.

### Result rows
- After a drop is decided, the seas collapse to rows, 16px radius, 12px x 16px, 15px: the sea reached in a drop-blue row (uppercase "Reached" at 85% white, the name semibold white) and, only if the pick was wrong, a coral-soft row ("Your pick", coral-deep). On phones the bar carries "You said X." instead, the map does the rest.

### Drop tokens
- Five 28px round tokens, 6px gaps, 12px bold figures, beside the drop counter (in the phone bar, beside the Worth chip). **Correct:** coral with "+N" in ink. **Wrong:** coral-soft with a small coral-deep cross. **No guess:** ink/8 with an en dash in ink-faint. **Current:** white, 2px coral ring, coral-deep number. **Upcoming:** white, hairline ring, ink-faint number. Each carries a screen-reader label ("Drop 2: 3 points", "wrong", "no guess", "now", "to come").

### First-time hint
- Desktop: shown once, on a player's very first drop, above the stake meter: a coral-soft (70%) note, 16px radius, 16px padding, `role="note"`. A semibold 15px ink first line ("First time? Here's the idea."), one ink-soft paragraph that names Lock in and Let it flow in semibold ink, and a 14px semibold underlined "Got it" in coral-deep. It also goes away on the first Lock in or flow.
- Phones: a white/95 bubble with card lift, 16px radius, 14px padding, under the top bar: a semibold ink question, two ink-soft lines, and a 32px close cross (ink-faint, coral-deep on hover).

### Points-at-stake meter
- Desktop: a coral-soft (60%) panel, 16px radius, 16px padding. A 14px semibold coral-deep caption ("A correct call now is worth") on the baseline with a 34px Bricolage coral-deep number and "pts". Below, four 8px pill segments: the points still available are solid coral, spent ones coral/20, draining one per stop with a 500ms colour transition.
- Phones: folded into a coral-soft pill, "Worth N pts" beside four 6px x 14px bars draining the same way.

### Result line
- A Bricolage line in a status region (30px desktop, 26px phones): "Right." with a coral full stop and the points ("+3") in coral-deep, or "Not this time.", or "Here's where it goes." if the player let it flow to the end; then the fact line in ink-soft. When the nearest sea to the pin is not the answer, the fact leads with the surprise: "The Black Sea is the nearest sea, but this water travels 2,140 km to the Mediterranean Sea." Otherwise the puzzle's plain distance fact.

### Day summary
- After the fifth drop (desktop column; phone sheet), blocks 20px apart: the heading "Done for today." (22px Bricolage, coral full stop) over the score in 56px Bricolage with "/ max" at 28px ink-faint. Then the coral Share button (the screen's one coral action), 8px, "Shares as <squares> N/20, never the answers." in 14px ink-soft (the squares semibold ink), and the square legend in 12px ink-faint ("🟩 4 · 🟦 3 · 🟨 2 · 🟧 1 · 🟥 wrong · ⬜ no guess"). Then "Your drops · pick one to see its route" (14px semibold ink-soft) over a white 16px-radius list with hairline ring and dividers: each row a button with a 24px drop-number badge (ink/6 and ink-soft; drop-blue and white when selected), the answer in semibold, a 14px ink-faint note ("2,140 km · called before it flowed", "· called at stop n", "· you said X", "· no guess") and the points right-aligned (coral-deep "+N", or "0" in ink-faint). The selected row takes the shore fill, others land on hover; the map opens on the day's most surprising drop. Then a 4-up stats grid (Streak, Best, Played, Avg points), each a white 16px-radius tile with a hairline ring, a 24px Bricolage figure over a 12px semibold ink-faint label, 8px gaps; a 12px ink-faint note that the streak forgives one missed day a week; the countdown in 20px Bricolage. The preview chips follow in preview mode.

### Done-today panel (game front page)
- Replaces the Play pill once today's puzzle is finished. A coral-soft (60%) panel, 16px radius, 16px padding: "Done today · N-day streak" (streak shown from 2 days) in semibold coral-deep on the baseline with the score in 28px Bricolage ink and "/ max" at 16px ink-faint; below, the day's share squares at 20px with 0.15em tracking (the same squares the share text carries, labelled for screen readers); then the countdown in 14px semibold ink-soft. Under the panel, 16px: the coral Share button and the white See your results pill.

### Countdown
- "New drops in 5h 12m" (then "12m", then "under a minute"): the time to the player's next local midnight, ticking every 15s. Browser-only: empty at build time and on first render, so it never mismatches. It takes its size and colour from where it sits.

### Cards / Containers
- **Control column (game screen, desktop):** card white, 440px fixed, column-edge shadow.
- **Phone game bar:** card white, 26px top corners, bar-lift shadow, 16px sides and top, at least 28px (or the safe area + 20px) below.
- **Notice card:** the game screen's loading, launches-soon and missing-puzzle states: a 460px max card with 30px radius, 32px padding and card lift, centred on pale land; the top bar, then a 30px Bricolage line ending in a coral full stop and one ink-soft line. Calm and honest, never an error.
- **Game card (homepage):** the whole card is the link. White, 28px radius, card-lift, 20px padding (28px from 640px); text column (title, 17px lead "Pick the sea it reaches.", then a 14px status) beside the mini-map. The status reads, in order of what is true: three stacked lines, "Done today · 14/20" and "See results →" in semibold coral-deep, then the countdown in ink-faint; or "Keep your N-day streak going" in semibold coral-deep; or the game facts in ink-faint separated by middots; the last two end in a coral-deep "Play" with arrow. Hover: rises 2px and takes card-lift raised over 175ms ease-out; the arrow nudges 2px.
- **Coming-soon slot:** no fill, 2px dashed ink/12 border, 28px radius, 16px x 20-28px padding; a ghost number ("No. 2", 28px Bricolage at ink/25) and one honest 15px line in ink-faint.
- **Ad slot:** a reserved space at the foot of the control column, below every control. It renders nothing unless `NEXT_PUBLIC_SHOW_AD_SLOTS=1`; then it is a drawn placeholder, min 100px tall, 16px radius, 2px dashed ink/15 border, "Ad space" in 12px ink-faint. Ads never interrupt play.

### Chips
- **Preview chips:** 40px round white chips with a hairline ring and a 14px bold puzzle number; hover turns the ring coral and the number coral-deep. Under a 14px ink-faint line, in the notice card and the preview day summary.

### Navigation
- **Site header (homepage):** the Peeker mark (32px; `components/Peeker.tsx`) plus "Pondo" with a coral full stop in Bricolage 18px semibold left, today's date and puzzle number in 14px ink-faint right. Plain, no bar or background.
- **Back link:** white pill with card-lift, 12px semibold name after a back arrow; on the game screen it reads "Downstream." (coral full stop) and links to the homepage, `/`. Hover turns the text coral-deep and nudges the arrow 2px left.
- **Game top bar:** the back link left, a white puzzle-number pill right ("No. 4" or "Preview 4", 12px semibold ink-soft, card lift). In the column on desktop; floating over the map on phones, with the sound toggle at its right end.

### Map pills
- White, pill-shaped, card-lift shadow, 12px text, no blur. Used for the interaction hint (medium ink-soft) and the destination label that tracks the route's end on the map (semibold ink, 4px x 10px), which carries the remaining distance.

### Mini-map (signature, homepage)
- An authored SVG tile (150x104, 112px wide on phones): sea, land, coast stroke, faint rivers, a drop-blue route that draws itself in, and a coral drop that runs along it via CSS `offset-path` to a blue-ringed destination, from a coral-ringed pin. 5s loop on `cubic-bezier(0.65, 0, 0.35, 1)`. Reduced motion: the finished state (route drawn, drop at the sea).

### Game map (signature, game screen)
- Downstream's own MapLibre style on OpenFreeMap vector tiles, pale land background, sea-coloured water, faint rivers in Faint River (0.6px at z4, 2px at z10) that are hidden while the player guesses and fade in over 900ms once the drop is decided (the river network would give the answer away), a 0.8px coast line, dashed Border Grey country borders, near-white ice. No terrain shading, parks, roads or POIs (removed for speed, 2026-10-16). Labels as in the Map label role: water names first, then countries, then city dots and names.
- **Locked while guessing:** no pan, zoom or keyboard, and the canvas leaves the Tab order (tabIndex -1); it unlocks once the drop is decided.
- **Overlays:** the pin (18px coral disc, 3px white ring, pin lift) that becomes a hollow coral ring, "where it fell", as soon as water leaves it (400ms colour ease); the route in drop-blue as a 26px glow at 22% (blur 9) under a 6px core, with a white current (2.4px at 80%) flowing along it, above every layer; the raindrop at the head of the water, a coral disc with a white stroke inside a soft coral glow (24px radius, 32%) that breathes ±6px, gone once it reaches the sea; the four option seas, lettered from the puzzle file's `seaLabels` on the result (the tiles' own copies filtered out so none appears twice): the answer drop-blue and swelling, a wrong pick solid coral-deep, the rest at 30%.
- **Motion:** a new drop's pin lands with a 700ms fall and bounce (`cubic-bezier(0.22, 1.2, 0.36, 1)`) while the camera frames the pin and the four seas (1.2s). Each reveal grows the route by distance (Turf slice) with cubic in-out easing over 1.6-3.2s per stop (longer stretches flow longer; up to 4.2s to the sea), the raindrop leading. The camera settles towards that stop's framing (see the framing rule) in the first 30% while leaning in and travelling with the drop on a sine curve (+0.8 to +1.4 zoom, more for short stretches), so it lands exactly on the framing. The current's dash pattern steps every 55ms. A coral ripple ring opens at each stop and two blue rings at the sea (1.1s, eased out). Reduced motion: no camera travel, ripples, current, breathing or landing; the camera and line jump to each finished stage. No rotation or pitch.

### Screen-reader layer (game screen)
- A visually hidden h1 names the puzzle and drop ("Downstream No. 4, drop 2 of 5"; ": today's results" on the summary). A polite live region describes what the map shows: at a new drop, each option sea's rough distance and compass direction from the pin; at each stop, how far the water has come and which way.

### Sound (game screen)
- Synthesized in the browser with Web Audio, no audio files: a drip when rain lands on the pin, calm bubbles for exactly as long as the route draws (about 5 a second, easing to 9, growing slightly lower as the stream becomes a river), a two-note chime at each stop, a splash at the sea, a bubble "bloop" for ordinary buttons (picking a sea, Hide seas, Let it flow, Change, Got it, Share, turning sound on), an upward swish for Next, three rising bubbles and a ringing mallet note for a right call, and two hollow wooden notes stepping down for a wrong one. Every sound follows a player's tap or key. Mute is the big round button on the map and is remembered.

## Dark mode

The same world at night, not a different one. The device's setting decides unless the player flips the sun/moon toggle (round 36px card button with card lift, in the homepage header and both games' top bars). Roles keep their meaning: ink is now the light text (#e9edf3) and card the dark surface (#1b222d) over a blue-black land (#10151c); coral stays the brand and the player's actions (coral text lightens to #ff7d83, filled coral under small white text deepens to coral-strong #d93d46); drop-blue stays water. Slice's table becomes a deep green-black cutting mat with the paper slab still light on it, a lit object; Downstream's map becomes a night map (blue-black land, deeper sea, light labels on dark halos, a brighter route). Every pairing keeps the light theme's contrast floor (body 13.6:1, faint text 5.6:1). Tokens: `:root[data-theme="dark"]` in `app/globals.css`.

## Do's and Don'ts

### Do:
- **Do** make the raindrop and the player's actions coral: the drop, where it fell, step icons, the sea buttons, the Play, Lock in, Next and Share buttons, correct tokens, the full stop.
- **Do** keep drop-blue for water: routes, rivers, sea names, the splash at the sea and the sea a drop reached.
- **Do** keep one solid coral button per screen; white text on coral at 19px bold or larger only, ink for small figures on coral.
- **Do** float interface on solid white surfaces with the card-lift shadow and pill, 16px or 26-30px corners.
- **Do** fit a game's front page and game screen in one desktop viewport, keeping the route clear of the interface; let phones scroll with the interface as a sheet below the map, except while playing, when the map is the board and nothing scrolls.
- **Do** choose the sea on the map and confirm it with Lock in; keep every other control in a fixed place, with a same-size placeholder where a control is still to come.
- **Do** keep the four option seas visible and in frame whenever a drop is on screen (as sea buttons while guessing, as lettering on the result).
- **Do** put live figures on the map or in the stake meter, set in tabular figures.
- **Do** ease every movement with mass, and show the finished state under prefers-reduced-motion.
- **Do** make the reveal the show: the raindrop leads the water, the camera travels with it and settles a little closer at each stop, and each stop and the sea get a ripple.
- **Do** keep sound quiet and short, synthesized, tied to what the water is doing; a wrong call is soft falling notes, never a buzzer; muting persists.
- **Do** lead the result with the surprise when the nearest sea is not where the water goes.
- **Do** describe the map in words for screen readers: each sea's distance and direction, each stop's progress.
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
- **Don't** let the player pan or zoom the map while guessing; it would give the answer away.
- **Don't** play sound before a tap, loop it after the water stops, or forget a player's mute.
