import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

// next/font downloads these at build time and serves them from our own domain,
// so there's no request to Google when a player visits.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // The site's own name and pitch; each game's page sets its own ("Slice · Pondo").
  // The icons are files in app/ (icon.svg, favicon.ico, apple-icon.png) and the web app
  // manifest is app/manifest.ts, all made by scripts/brand/make_icons.py.
  title: { default: `${SITE_NAME} · ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: "Quick daily puzzles that are easy to start and hard to put down. A new one in every game each day, the same for everyone.",
  applicationName: SITE_NAME,
  appleWebApp: { title: SITE_NAME },
};

// The browser's own chrome (address bar on phones) matches the page, light or dark.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0ec" },
    { media: "(prefers-color-scheme: dark)", color: "#10151c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The pages are built ahead of time with the light theme, but a player may want
    // dark. THEME_SCRIPT runs while the browser reads <head>, before anything is
    // painted, and sets <html data-theme>. React then finds an attribute it didn't
    // render; suppressHydrationWarning tells it that's expected (for this element's own
    // attributes only), instead of treating it as a mismatch.
    <html lang="en" data-theme="light" className={`${bricolage.variable} ${hanken.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
