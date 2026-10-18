import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { SITE_NAME } from "@/lib/site";
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
  // The site's own name and pitch; each game's page sets its own ("Slice · Daily Games").
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "Small daily puzzles about the real world. One a day, the same for everyone, a few minutes each.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${hanken.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
