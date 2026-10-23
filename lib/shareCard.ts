"use client";

// The picture that goes with a shared result: a 1080x1350 card drawn on a canvas in the
// browser (no server, no library), in the site's fonts. Each game draws its own card
// (games/<game>/shareCard.ts) from the pieces here. A card never shows answers: only the
// puzzle number, the score and how each round went. It is always drawn in the light
// theme: it leaves the site, so it shouldn't depend on the sender's dark mode.
//
// The card is drawn ahead of time (useShareCard), not when Share is pressed: phones only
// open the share sheet straight from a tap, and drawing first would lose that tap.

import { useEffect, useState } from "react";

export const CARD_W = 1080;
export const CARD_H = 1350;

// The light theme's tokens (app/globals.css), fixed: see above.
export const C = {
  ink: "#121a2b",
  inkSoft: "#4a5468",
  inkFaint: "#5f6a7d",
  coral: "#f2545b",
  coralDeep: "#c0303a",
  coralSoft: "#fde8e8",
  card: "#ffffff",
  line: "#e3e7ee",
  sea: "#d3e4f3",
  drop: "#155eef",
  mat: "#bccdbd",
  slab: "#fffaf3",
  slabSide: "#e9a68c",
  slabCounted: "#ffdcd2",
};

export type Fonts = { display: string; body: string };

/** The site's two faces as next/font named them, loaded before drawing. */
async function loadFonts(): Promise<Fonts> {
  const style = getComputedStyle(document.body);
  const display = style.getPropertyValue("--font-bricolage").trim() || "Helvetica Neue, Arial, sans-serif";
  const body = style.getPropertyValue("--font-hanken").trim() || "Helvetica Neue, Arial, sans-serif";
  await Promise.all([
    document.fonts.load(`600 100px ${display}`),
    document.fonts.load(`400 30px ${body}`),
    document.fonts.load(`700 30px ${body}`),
  ]).catch(() => {});
  return { display, body };
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Letter spacing where the browser supports it on a canvas (newer Chrome and Safari). */
export function tracking(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

/** Pondo's mark (components/Peeker.tsx, a 48-unit drawing) with its horizon, `size` wide. */
export function drawPeeker(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 48, size / 48);
  ctx.fillStyle = C.coral;
  ctx.fill(new Path2D("M5 34a19 19 0 0 1 38 0Z"));
  ctx.fillStyle = "#fff";
  for (const cx of [17.5, 30.5]) {
    ctx.beginPath();
    ctx.arc(cx, 24.5, 4.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#1d2533";
  for (const cx of [19.2, 32.2]) {
    ctx.beginPath();
    ctx.arc(cx, 23.2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = C.ink;
  roundRect(ctx, 1, 33.5, 46, 3.6, 1.8);
  ctx.fill();
  ctx.restore();
}

/** "Slice." with the coral full stop, and the puzzle number on the right. */
export function drawTitle(ctx: CanvasRenderingContext2D, f: Fonts, game: string, number: number, x: number, right: number, y: number) {
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `600 76px ${f.display}`;
  tracking(ctx, -2);
  ctx.fillStyle = C.ink;
  ctx.fillText(game, x, y);
  ctx.fillStyle = C.coral;
  ctx.fillText(".", x + ctx.measureText(game).width, y);
  tracking(ctx, 0);
  ctx.textAlign = "right";
  ctx.font = `600 34px ${f.body}`;
  ctx.fillStyle = C.inkFaint;
  ctx.fillText(`No. ${number}`, right, y);
  ctx.textAlign = "left";
}

/** The day's score, huge, with its "/400" after it. */
export function drawScore(ctx: CanvasRenderingContext2D, f: Fonts, points: number, max: number, x: number, y: number) {
  ctx.textAlign = "left";
  ctx.font = `600 250px ${f.display}`;
  tracking(ctx, -10);
  ctx.fillStyle = C.ink;
  const text = String(points);
  ctx.fillText(text, x - 8, y);
  const w = ctx.measureText(text).width;
  ctx.font = `600 76px ${f.display}`;
  tracking(ctx, -2);
  ctx.fillStyle = C.inkFaint;
  ctx.fillText(`/${max}`, x + w + 6, y);
  tracking(ctx, 0);
}

/** A hairline, the Peeker, a question to the friend, and where to play. */
export function drawFooter(ctx: CanvasRenderingContext2D, f: Fonts, question: string, path: string, x: number, right: number, y: number) {
  ctx.fillStyle = "rgba(18,26,43,0.10)";
  ctx.fillRect(x, y - 126, right - x, 2);
  drawPeeker(ctx, x, y - 82, 92);
  const tx = x + 118;
  ctx.textAlign = "left";
  ctx.font = `600 44px ${f.display}`;
  tracking(ctx, -1);
  ctx.fillStyle = C.ink;
  ctx.fillText(question, tx, y - 44);
  tracking(ctx, 0);
  ctx.font = `700 32px ${f.body}`;
  ctx.fillStyle = C.coralDeep;
  ctx.fillText(`pondo.games${path}`, tx, y + 4);
}

export type Draw = (ctx: CanvasRenderingContext2D, fonts: Fonts) => void;

async function render(draw: Draw, name: string): Promise<File | null> {
  const fonts = await loadFonts();
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  draw(ctx, fonts);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob ? new File([blob], name, { type: "image/png" }) : null;
}

export type ShareCard = { file: File; url: string } | null;

/**
 * The card as a file (to share) and an address (to show it), drawn once the inputs
 * settle. `key` names what's on it: the card is redrawn only when it changes.
 */
export function useShareCard(key: string, name: string, draw: Draw): ShareCard {
  const [card, setCard] = useState<ShareCard>(null);
  useEffect(() => {
    let live = true;
    let url = "";
    render(draw, name)
      .then((file) => {
        if (!live || !file) return;
        url = URL.createObjectURL(file);
        setCard({ file, url });
      })
      .catch(() => {}); // no card: Share still sends the text
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
    // The key stands for everything drawn; `draw` is a new function every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, name]);
  return card;
}
