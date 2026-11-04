"use client";

// Every new page starts at the top. Next.js's links mostly do this themselves, but by design
// they keep the scroll position when they judge the new page to be in view, and a player saw
// /slice/ open part-way down after scrolling the homepage (2026-11-03). So this makes sure, on
// every move to another page. Back and forward are left alone: they should return to where
// the player was. Renders nothing; in the root layout.

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const plain = (path: string) => path.replace(/\/$/, "");

export default function ScrollToTop() {
  const pathname = usePathname();
  const last = useRef(pathname);
  const goingBack = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      if (plain(location.pathname) !== plain(last.current)) goingBack.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (pathname === last.current) return; // the first load: the browser's own business
    last.current = pathname;
    const back = goingBack.current;
    goingBack.current = false;
    if (!back && !location.hash) window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
