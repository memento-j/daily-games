"use client";

// Downstream's sounds, synthesized with the Web Audio API: no audio files to
// license or download. Water-themed and quiet: a drip when rain lands, calm
// bubbles while the route draws, a chime at each stop, a splash at the
// sea, bubble "bloops" for buttons, a swish for the next drop, and soft mallet
// phrases for right and wrong. Muting is remembered (lib/storage).
//
// Browsers only allow audio after a user gesture; every sound here follows a
// click (or an animation a click started), so that's always satisfied.

import { track } from "@/lib/analytics";
import { getSetting, setSetting } from "@/lib/storage";

const SETTINGS = "site";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

export function isMuted(): boolean {
  return getSetting(SETTINGS, "muted", false);
}

export function setMuted(muted: boolean): void {
  setSetting(SETTINGS, "muted", muted);
  track("sound_toggled", { game: "downstream", muted });
  if (muted) ctx?.suspend().catch(() => {});
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || isMuted()) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null; // no Web Audio: play silently
  }
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** A short tone with a quick attack and an exponential fade. */
function tone(ac: AudioContext, type: OscillatorType, from: number, to: number, start: number, dur: number, peak: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(master!);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

/** One bubble: a sine that rises in pitch as it fades. */
function bubble(ac: AudioContext, from: number, to: number, start: number, dur: number, peak: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.04);
  osc.connect(gain).connect(master!);
  osc.start(start);
  osc.stop(start + dur + 0.06);
}

/** A soft mallet note (marimba-like): a sine plus a quickly fading overtone. */
function mallet(ac: AudioContext, f: number, start: number, dur: number, peak: number) {
  tone(ac, "sine", f, f, start, dur, peak);
  tone(ac, "sine", f * 4, f * 4, start, 0.06, peak * 0.35);
}

export const sound = {
  /** Rain landing on the pin. */
  drip() {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    tone(ac, "sine", 1250, 480, t, 0.16, 0.16);
    tone(ac, "sine", 2200, 900, t + 0.05, 0.08, 0.04);
  },

  /**
   * The water's journey for `ms`: a babbling brook built from bubbles. Running
   * water is mostly tiny air bubbles, each a short tone that rises in pitch as
   * it fades; a few at a time, scattered left and right, read as a calm stream.
   * They grow a little bigger (lower) and more frequent as the stretch goes on. Returns a function
   * that stops it early.
   */
  flow(ms: number): () => void {
    const ac = audio();
    if (!ac) return () => {};
    const t0 = ac.currentTime;
    const dur = ms / 1000;
    const end = t0 + dur;
    const nodes: AudioScheduledSourceNode[] = [];
    const bus = ac.createGain();
    bus.gain.setValueAtTime(0.0001, t0);
    bus.gain.exponentialRampToValueAtTime(1, t0 + 0.25);
    bus.gain.setValueAtTime(1, Math.max(t0 + 0.25, end - 0.3));
    bus.gain.exponentialRampToValueAtTime(0.0001, end + 0.2);
    bus.connect(master!);

    // The bubbles: unhurried and soft, a few at a time.
    let t = t0 + 0.08;
    while (t < end - 0.1) {
      const progress = (t - t0) / dur; // 0 at the start of this stretch, 1 at its end
      const size = 1 + progress * 1.2; // bigger bubbles, lower notes, further down
      const f = (450 + Math.random() * 700) / size;
      const life = 0.07 + Math.random() * 0.06 * size;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const pan = ac.createStereoPanner();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * (1.4 + Math.random() * 0.5), t + life);
      const peak = 0.025 + Math.random() * 0.03;
      // A soft onset (no click), then the fade.
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + life);
      pan.pan.value = Math.random() * 1.2 - 0.6;
      osc.connect(gain).connect(pan).connect(bus);
      osc.start(t);
      osc.stop(t + life + 0.02);
      nodes.push(osc);
      // Calm: about 5 a second at first, easing up to about 9 as the river grows.
      t += (0.5 + Math.random()) / (5 + progress * 4);
    }

    return () => {
      const now = ac.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), now);
      bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      for (const n of nodes) {
        try {
          n.stop(now + 0.15);
        } catch {
          // already stopped
        }
      }
    };
  },

  /** A stop on the way: a soft two-note chime. */
  chime() {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    tone(ac, "triangle", 880, 880, t, 0.5, 0.07);
    tone(ac, "triangle", 1320, 1320, t + 0.07, 0.6, 0.05);
  },

  /** Reaching the sea: a wash of filtered noise over a low thump. */
  splash() {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac);
    const low = ac.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.setValueAtTime(3200, t);
    low.frequency.exponentialRampToValueAtTime(260, t + 0.8);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    src.connect(low).connect(gain).connect(master!);
    src.start(t);
    src.stop(t + 1);
    tone(ac, "sine", 150, 70, t, 0.35, 0.18);
  },

  /** Any ordinary button: a small water "bloop", a bubble rising. */
  tap() {
    const ac = audio();
    if (!ac) return;
    bubble(ac, 420, 980, ac.currentTime, 0.07, 0.09);
  },

  /** On to the next drop: an airy upward swish, then a bubble. */
  next() {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac);
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.6;
    band.frequency.setValueAtTime(500, t);
    band.frequency.exponentialRampToValueAtTime(3800, t + 0.28);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    src.connect(band).connect(gain).connect(master!);
    src.start(t);
    src.stop(t + 0.35);
    bubble(ac, 600, 1500, t + 0.16, 0.08, 0.07);
  },

  /**
   * A correct call: three bubbles rising up a major chord, then a high mallet
   * note that rings out, like light catching the water.
   */
  right() {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => bubble(ac, f * 0.8, f, t + i * 0.07, 0.09, 0.1));
    mallet(ac, 1046.5, t + 0.21, 0.9, 0.12);
    mallet(ac, 1567.98, t + 0.24, 0.7, 0.04);
  },

  /** A wrong call: two hollow wooden notes stepping down. Soft, never a buzzer. */
  wrong() {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    mallet(ac, 293.66, t, 0.45, 0.13);
    mallet(ac, 246.94, t + 0.15, 0.6, 0.13);
  },
};
