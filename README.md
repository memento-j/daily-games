# Pondo

Small daily puzzles: a new one in every game each day, the same for everyone. Planned home: pondo.gg.

- **Slice** (`/slice`): cut a real country with one straight line to split its land or its population.
- **Downstream** (`/downstream`): a raindrop lands somewhere on Earth; guess which sea it reaches.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests (Vitest)
npm run build    # static site in out/
```

The site is a static export (Next.js), deployed to Cloudflare by `.github/workflows/deploy.yml` on every push to `master`. Puzzles are generated offline by the Python pipelines in `scripts/` and served from `public/data/`. Icons are made from the Peeker drawing by `python scripts/brand/make_icons.py`, and the link-preview cards by `python scripts/brand/make_og.py`.

## The scores API

In dev the site talks to a local backend at localhost:8080 (run `docker compose up -d` in the pondo-api repo). Production builds use https://api.pondo.games.

Project notes for contributors (and AI assistants) live in `AGENTS.md`; the design system in `DESIGN.md`.
