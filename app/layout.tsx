import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import Analytics from "@/components/Analytics";
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
  // The site's address. Next.js turns relative links in metadata (preview images,
  // canonical links) into full URLs with it, which crawlers and link previews need.
  metadataBase: new URL(SITE_URL),
  // The defaults; each page sets its own title, description and preview (lib/seo.ts).
  // The template turns a page's "Slice: ..." into "Slice: ... · Pondo".
  // The icons are files in app/ (icon.svg, favicon.ico, apple-icon.png) and the web app
  // manifest is app/manifest.ts, made by scripts/brand/make_icons.py; the link-preview
  // images are app/**/opengraph-image.png, made by scripts/brand/make_og.py.
  title: { default: `${SITE_NAME} · ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
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
      <body className="flex min-h-full flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
