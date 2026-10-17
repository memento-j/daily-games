# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Casual daily-puzzle players with no geography expertise, mostly on phones. They play a short (2-5 minute) puzzle once a day, the same puzzle as everyone else, and share their result, in the spirit of Wordle.

## Product Purpose

A website hosting short daily browser games under one brand. Each game has one puzzle per day, identical for every player, with a shareable result. Success at launch is measured by day-2 and day-7 return rates; monetization (Google AdSense) comes later.

The first game is **Downstream**: a raindrop lands at a pin on the world map and the player guesses which sea or ocean the water ends up in, while the route is revealed in stages. Earlier correct guesses score more. More games are added only once Downstream proves itself.

## Positioning

Downstream's puzzles are real hydrology: every route is traced from a global river dataset (HydroRIVERS) to its actual outlet, so surprising answers (water from Minnesota reaching the Gulf of Mexico rather than nearby Hudson Bay) are true facts about the world, not trivia. Surprise is the payoff, not a punishment.

## Operating Context

- One puzzle per day, computed in the browser from the player's local date; nothing is stored server-side.
- 5 drops per day, one of each difficulty, in a mixed order (seeded per puzzle) so the hard one can come at any point. One guess per drop; the route reveals in 3 stops; points 4/3/2/1 by how early the correct guess is locked in, 0 for wrong or no guess.
- Results are shared as text: puzzle number plus one emoji per drop, never the answers.
- Static site (Next.js static export), hosted on a static host. No accounts, backend or database.

## Capabilities and Constraints

- Puzzles are precomputed offline by a Python pipeline and fetched at runtime; never bundled.
- Maps use MapLibre GL with free vector tiles (OpenFreeMap); no API keys. No terrain shading on the game map (removed for speed).
- AdSense readiness later requires real HTML content: homepage with game descriptions, how-to-play per game, About, Privacy, Contact. Ads must never interrupt play.
- Undecided: the site/brand name (use a clearly marked placeholder), launch date, final scoring after playtest.

## Brand Commitments

- Game name: "Downstream".
- Site name: not decided yet.
- Sits in the daily-games genre (short, friendly, one obvious Play), but must look like its own thing, not a copy of NYT Games (user, 2026-10-16: "lets not copy the nyt style i feel that's too obvious, we should still be somewhat unique"). Not corporate/SaaS.
- The homepage leads with Downstream while it is the only game.

## Evidence on Hand

- 10 generated puzzles in `public/data/downstream/` (real routes, answers, distances, difficulty).
- No testimonials, player counts, press or stats exist. Do not fabricate any.

## Product Principles

- One short daily ritual, the same for everyone: respect the player's time.
- Anyone can play: no geography knowledge needed; the map gives the clues.
- The world is the puzzle: real routes and true surprises over invented trivia.
- Mobile first.

## Accessibility & Inclusion

Standard good practice: respect `prefers-reduced-motion` (including any animated backgrounds), readable contrast, full keyboard access. No formal standard required.
