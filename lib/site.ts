// Site-wide constants.

// The site's name (chosen 2026-10-19). Its mark is the Peeker (components/Peeker.tsx).
// Change the name here and it updates everywhere.
export const SITE_NAME = "Pondo";
export const SITE_TAGLINE = "Small daily puzzles";
// What Google shows under the homepage's title: under ~160 characters, naming both games.
export const SITE_DESCRIPTION =
  "Two free daily geography games. Slice: cut a country's population in half with one line. Downstream: guess which sea a raindrop reaches.";

// Where the site lives (the Worker's custom domain, wrangler.jsonc). Link previews, the
// sitemap and canonical links all need full addresses, so they're built from this.
export const SITE_URL = "https://pondo.games";

// Where players reach us (Contact, Privacy). Forward it to a real inbox with Cloudflare
// Email Routing once the domain is connected.
export const CONTACT_EMAIL = "hello@pondo.games";
