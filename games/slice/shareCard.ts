// Slice's share card (lib/shareCard.ts draws the common parts): the board's world, a
// paper slab on the sage cutting mat, holding the day's score and one strip per round.
// Each strip is the country's whole population: the tinted part is the share the cut took,
// the coral dashed line is the cut, the ink tick is the aim. The gap between them is the
// miss, so a friend sees how close each cut was without learning a single country.

import { C, CARD_H, CARD_W, drawFooter, drawScore, drawTitle, roundRect, type Fonts } from "../../lib/shareCard";

export type CardRound = { share: number; target: number; score: number };

export function drawSliceCard(ctx: CanvasRenderingContext2D, f: Fonts, number: number, rounds: CardRound[], points: number, max: number) {
  // The mat and its grid.
  ctx.fillStyle = C.mat;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 2;
  for (let p = 60; p < Math.max(CARD_W, CARD_H); p += 60) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, CARD_H);
    ctx.moveTo(0, p);
    ctx.lineTo(CARD_W, p);
    ctx.stroke();
  }

  // The slab: terracotta side under paper, lifted off the mat.
  const sx = 72, sy = 84, sw = CARD_W - 144, sh = CARD_H - 190, r = 44;
  ctx.save();
  ctx.shadowColor = "rgba(18,26,43,0.22)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 26;
  ctx.fillStyle = C.slabSide;
  roundRect(ctx, sx, sy + 20, sw, sh, r);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = C.slab;
  roundRect(ctx, sx, sy, sw, sh, r);
  ctx.fill();
  ctx.strokeStyle = "rgba(18,26,43,0.10)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const x = sx + 72, right = sx + sw - 72;
  drawTitle(ctx, f, "Slice", number, x, right, sy + 132);
  drawScore(ctx, f, points, max, x, sy + 400);
  ctx.font = `400 34px ${f.body}`;
  ctx.fillStyle = C.inkSoft;
  ctx.fillText(`${rounds.length} countries, each cut in half by population`, x, sy + 470);

  // One strip per round, the score at its end.
  const barW = right - x - 130, barH = 62, top = sy + 536, step = 108;
  rounds.forEach((round, i) => {
    const y = top + i * step;
    const cutX = x + barW * Math.min(1, Math.max(0, round.share));
    const aimX = x + barW * round.target;
    ctx.save();
    roundRect(ctx, x, y, barW, barH, 16);
    ctx.fillStyle = "#f3ece1";
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = C.slabCounted;
    ctx.fillRect(x, y, cutX - x, barH);
    ctx.restore();
    roundRect(ctx, x, y, barW, barH, 16);
    ctx.strokeStyle = "rgba(18,26,43,0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();
    // The aim: a tick through the strip and a small notch above it.
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(aimX, y + 6);
    ctx.lineTo(aimX, y + barH - 6);
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(aimX - 9, y - 14);
    ctx.lineTo(aimX + 9, y - 14);
    ctx.lineTo(aimX, y - 3);
    ctx.closePath();
    ctx.fill();
    // The cut, dashed and a little taller than the strip, as on the board.
    ctx.strokeStyle = C.coral;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.setLineDash([13, 10]);
    ctx.beginPath();
    ctx.moveTo(cutX, y - 10);
    ctx.lineTo(cutX, y + barH + 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = "butt";
    // The round's score.
    ctx.textAlign = "right";
    ctx.font = `600 64px ${f.display}`;
    ctx.fillStyle = C.ink;
    ctx.fillText(String(round.score), right, y + barH - 6);
    ctx.textAlign = "left";
  });

  // A key under the strips: what the tick and the dashes are.
  const ky = top + rounds.length * step + 6;
  ctx.font = `400 28px ${f.body}`;
  ctx.fillStyle = C.inkFaint;
  ctx.beginPath();
  ctx.moveTo(x, ky - 18);
  ctx.lineTo(x + 18, ky - 18);
  ctx.lineTo(x + 9, ky - 7);
  ctx.closePath();
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.fillStyle = C.inkFaint;
  ctx.fillText("the aim", x + 30, ky);
  const kx = x + 30 + ctx.measureText("the aim").width + 40;
  ctx.strokeStyle = C.coral;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.setLineDash([9, 8]);
  ctx.beginPath();
  ctx.moveTo(kx + 4, ky - 30);
  ctx.lineTo(kx + 4, ky + 4);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = "butt";
  ctx.fillText("my cut", kx + 24, ky);

  drawFooter(ctx, f, "Can you cut it closer?", "/slice", x, right, sy + sh - 50);
}
