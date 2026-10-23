// Downstream's share card (lib/shareCard.ts draws the common parts): a white card
// floating on the sea, holding the day's score and the five raindrops. Each drop fills
// with coral as far as it scored (4 points: full; called at the last stop: a quarter);
// a wrong guess leaves it empty with a cross, no guess leaves a dashed outline. No seas,
// no places: a friend sees how early each one was called, never where the water went.

import { C, CARD_H, CARD_W, drawFooter, drawScore, drawTitle, roundRect, type Fonts } from "../../lib/shareCard";

export type CardDrop = { points: number; max: number; guessed: boolean };

// The raindrop of the site's drop icons, on a 24-unit grid (x 5.5-18.5, y 2.5-21).
const DROP = "M12 2.5c3.2 4.3 6.5 8.4 6.5 12a6.5 6.5 0 0 1-13 0c0-3.6 3.3-7.7 6.5-12Z";

export function drawDownstreamCard(ctx: CanvasRenderingContext2D, f: Fonts, number: number, drops: CardDrop[], points: number, max: number) {
  // The sea, with a few slow swells.
  ctx.fillStyle = C.sea;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 3;
  for (let y = 40; y < CARD_H + 40; y += 70) {
    ctx.beginPath();
    for (let x = -20; x <= CARD_W + 20; x += 10) {
      const wy = y + Math.sin(x / 70 + y / 50) * 9;
      if (x === -20) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }

  // The card.
  const sx = 72, sy = 84, sw = CARD_W - 144, sh = CARD_H - 170, r = 44;
  ctx.save();
  ctx.shadowColor = "rgba(18,26,43,0.24)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 28;
  ctx.fillStyle = C.card;
  roundRect(ctx, sx, sy, sw, sh, r);
  ctx.fill();
  ctx.restore();

  const x = sx + 72, right = sx + sw - 72;
  drawTitle(ctx, f, "Downstream", number, x, right, sy + 132);
  drawScore(ctx, f, points, max, x, sy + 400);
  ctx.font = `400 34px ${f.body}`;
  ctx.fillStyle = C.inkSoft;
  ctx.fillText(`${drops.length} raindrops. Which sea does each one reach?`, x, sy + 470);

  // The drops, evenly across the card.
  const path = new Path2D(DROP);
  const scale = 10.4, dropH = 18.5 * scale, slot = (right - x) / drops.length;
  const top = sy + 580;
  drops.forEach((d, i) => {
    const cx = x + slot * (i + 0.5);
    ctx.save();
    ctx.translate(cx - 12 * scale, top - 2.5 * scale);
    ctx.scale(scale, scale);
    if (d.points > 0) {
      // Filled from the bottom to the share of points, with a gentle surface.
      ctx.save();
      ctx.clip(path);
      const level = 21 - 18.5 * (d.points / d.max);
      ctx.fillStyle = C.coral;
      ctx.beginPath();
      ctx.moveTo(4, 22);
      ctx.lineTo(4, level);
      ctx.bezierCurveTo(8, level - 1.1, 11, level + 1.1, 14, level);
      ctx.bezierCurveTo(16, level - 0.8, 18, level + 0.6, 20, level);
      ctx.lineTo(20, 22);
      ctx.closePath();
      ctx.fill();
      // The shine of the site's drop icon.
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(9, 15.5);
      ctx.bezierCurveTo(9, 17, 10, 18.1, 11.5, 18.3);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = C.coral;
      ctx.lineWidth = 0.6;
      ctx.stroke(path);
    } else {
      ctx.strokeStyle = "rgba(18,26,43,0.28)";
      ctx.lineWidth = 0.55;
      if (!d.guessed) ctx.setLineDash([1.4, 1.1]);
      ctx.stroke(path);
      ctx.setLineDash([]);
      if (d.guessed) {
        // Guessed wrong: a cross where the water would be.
        ctx.strokeStyle = C.coralDeep;
        ctx.lineWidth = 1.1;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(10, 12.5);
        ctx.lineTo(14, 16.5);
        ctx.moveTo(14, 12.5);
        ctx.lineTo(10, 16.5);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Its points underneath.
    ctx.textAlign = "center";
    ctx.font = `600 52px ${f.display}`;
    ctx.fillStyle = d.points > 0 ? C.ink : C.inkFaint;
    ctx.fillText(d.points > 0 ? `+${d.points}` : d.guessed ? "0" : "–", cx, top + dropH + 74);
    ctx.textAlign = "left";
  });

  // A key: what a full drop means.
  ctx.font = `400 28px ${f.body}`;
  ctx.fillStyle = C.inkFaint;
  ctx.fillText("The sooner the right sea is called, the fuller the drop.", x, top + dropH + 148);

  drawFooter(ctx, f, "Where does your rain end up?", "/downstream", x, right, sy + sh - 56);
}
