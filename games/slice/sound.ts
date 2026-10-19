// Slice's synthesized sounds (Web Audio, no files), in the
// spirit of Downstream's games/downstream/sound.ts: everything follows a tap or a
// drag, and the whole reveal is scheduled on the audio clock the moment you cut, so
// it stays in step with the animation.

import { track } from "@/lib/analytics";
import { getSetting, setSetting } from "@/lib/storage";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

export function isMuted(): boolean {
  return getSetting<boolean>("slice", "muted", false);
}

export function setMuted(muted: boolean) {
  setSetting("slice", "muted", muted);
  track("sound_toggled", { game: "slice", muted });
}

/** The audio context, created and resumed on the first gesture (browsers require one). */
function audio(): AudioContext | null {
  if (typeof window === "undefined" || isMuted()) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** A filtered noise burst: paper, metal edges, rustle. */
function hiss(at: number, dur: number, freq: number, q: number, peak: number, type: BiquadFilterType = "bandpass") {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + Math.min(0.006, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(at, Math.random() * 0.5, dur + 0.05);
}

/** A short pitched note with a quick decay. */
function note(at: number, freq: number, dur: number, peak: number, type: OscillatorType = "sine", glideTo?: number) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/** One scissor snip: a bright metal-on-paper "shk" with a tiny ring of the blades. */
function snipAt(at: number) {
  hiss(at, 0.05, 4200, 1.4, 0.32);
  hiss(at + 0.004, 0.09, 1800, 0.9, 0.12);
  note(at, 3150 + Math.random() * 250, 0.05, 0.03, "triangle");
}

export const sound = {
  /** Wake the audio on the first touch, so the first real sound isn't lost. */
  wake() {
    audio();
  },

  /** A tiny ratchet tick as each new dash of the cut line appears. */
  tick() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    note(t, 1900 + Math.random() * 200, 0.025, 0.035, "triangle");
    hiss(t, 0.02, 6000, 2, 0.04);
  },

  /** Picking up one end of the line. */
  grab() {
    const c = audio();
    if (!c) return;
    note(c.currentTime, 660, 0.06, 0.08, "sine", 880);
  },

  /** The whole reveal, scheduled now on the audio clock (offsets in seconds, matching
   *  scene.ts): snips along the line, the pieces parting, the people rising, and
   *  a closing phrase for how good the cut was. */
  reveal({ snips, snipEvery, split, rise, riseFor, people, done, tier: band }: {
    snips: number;
    snipEvery: number;
    split: number;
    rise: number;
    riseFor: number;
    people: boolean;
    done: number;
    tier: number; // the score band (scoring.ts bandOf): 0 best .. 3 way off
  }) {
    const c = audio();
    if (!c) return;
    const t0 = c.currentTime + 0.02;
    for (let i = 0; i < snips; i++) snipAt(t0 + i * snipEvery + Math.random() * 0.012);

    // The pieces part: a soft wooden knock on the mat and a paper slide.
    note(t0 + split, 150, 0.22, 0.22, "sine", 70);
    hiss(t0 + split, 0.08, 900, 0.7, 0.12);
    hiss(t0 + split + 0.05, 0.55, 700, 0.6, 0.05, "lowpass");

    // The people rise: soft wooden plinks climbing in pitch, thicker at first.
    if (people) {
      const n = 26;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1);
        const at = t0 + rise + Math.pow(k, 1.6) * riseFor;
        note(at, 520 + k * 900 + Math.random() * 120, 0.09, 0.05 * (1 - k * 0.5), "triangle");
      }
    }

    // How it went: a bright rising pair for a good cut, a soft falling pair otherwise.
    const good = band <= 1;
    const pair = good ? [784, 1175] : band === 2 ? [698, 784] : [440, 349];
    note(t0 + done, pair[0], 0.35, 0.09, "triangle");
    note(t0 + done + 0.13, pair[1], good ? 0.6 : 0.45, 0.09, "triangle");
  },

  /** "Show perfect cut": a breath of air as it slides, and a glassy chime as it lands. */
  perfect() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    hiss(t, 0.9, 2400, 0.5, 0.035);
    note(t + 0.85, 1318, 1.1, 0.045);
    note(t + 0.85, 1976, 0.9, 0.025);
  },

  /** A new question: a people round chimes bright and upward, a land round low and
   *  woody, so the ear hears which kind it is before the eye has read it. */
  announce(mode: "area" | "population") {
    // Before any tap the browser holds audio back and would play this late, on the
    // first tap: skip it then (the badge and highlight still show).
    if (!navigator.userActivation?.hasBeenActive) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + 0.25; // as the highlight sweeps in
    if (mode === "population") {
      note(t, 784, 0.18, 0.07, "triangle");
      note(t + 0.11, 1175, 0.35, 0.07, "triangle");
      note(t + 0.11, 2350, 0.25, 0.015);
    } else {
      note(t, 392, 0.22, 0.09, "triangle", 380);
      note(t + 0.13, 294, 0.4, 0.09, "triangle", 290);
    }
  },

  /** Ordinary buttons. */
  tap() {
    const c = audio();
    if (!c) return;
    note(c.currentTime, 520, 0.08, 0.07, "sine", 780);
  },
};
