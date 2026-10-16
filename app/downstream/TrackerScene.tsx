"use client";

// The Downstream front page's hero: a raindrop tracked to the sea like a
// delivery. A clean hillshaded relief with faint rivers; the planned route dotted
// ahead and the travelled part in drop-blue (water is blue); the raindrop itself
// and the spot it fell on in coral (the drop is the player's); the destination
// labelled with the distance still to go. The camera keeps the whole route in
// the open space beside the card. Tap or click the land to follow a new raindrop.

import { useEffect, useRef } from "react";

export type TrackerStatus = {
  phase: "flowing" | "arrived";
  km: number;
  kmLeft: number;
  sea: string;
  progress: number; // 0..1 along the route
};

const WATER = "#155eef";
const CORAL = "#f2545b";
const TAP_SLOP_PX = 6; // a pointer that moves further than this is a scroll, not a tap

type Props = {
  onStatus: (status: TrackerStatus) => void;
  onReady: (ok: boolean) => void; // false when WebGL isn't available
  clearLeft: number; // px on the left covered by the card; the route is framed in the space to its right
};

export default function TrackerScene({ onStatus, onReady, clearLeft }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // The animation loop reads the latest props through refs, kept in sync after each render.
  const props = useRef({ onStatus, onReady, clearLeft });
  useEffect(() => {
    props.current = { onStatus, onReady, clearLeft };
  });

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let cleanup = () => {};
    let disposed = false;

    (async () => {
      const S = await import("./heroScene");
      const { findRivers } = await import("./heroWorld");
      if (disposed) return;
      const { THREE, Line2, LineGeometry, LineMaterial } = S;
      const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const renderer = S.createRenderer(container, "#d3e4f3");
      if (!renderer) {
        props.current.onReady(false);
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 20);
      const terrain = S.buildTerrain({
        land: "#eef0ec",
        landHigh: "#d9ded6",
        sea: "#d3e4f3",
        shore: "#e6f0f9",
        coast: "#8fa7bf",
        fade: "#d3e4f3",
      });
      scene.add(terrain);

      const riverMat = new LineMaterial({ color: "#a9c9ea", linewidth: 1.3 });
      for (const path of findRivers(30)) {
        const g = new LineGeometry();
        g.setPositions(S.toPoints(path));
        scene.add(new Line2(g, riverMat));
      }

      // The tracked drop: a dotted planned route ahead, glow + core behind.
      const planMat = new LineMaterial({ color: WATER, linewidth: 3.5, transparent: true, opacity: 0.5, dashed: true, dashSize: 0.05, gapSize: 0.035 });
      const glowMat = new LineMaterial({ color: WATER, linewidth: 14, transparent: true, opacity: 0.16, depthWrite: false });
      const coreMat = new LineMaterial({ color: WATER, linewidth: 4.5 });
      const plan = new Line2(new LineGeometry(), planMat);
      const glow = new Line2(new LineGeometry(), glowMat);
      const core = new Line2(new LineGeometry(), coreMat);
      scene.add(plan, glow, core);

      const textures: import("three").Texture[] = [];
      const disc = (fill: string, ring: string | null, size: number) => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const x = c.getContext("2d")!;
        x.beginPath();
        x.arc(64, 64, ring ? 44 : 60, 0, Math.PI * 2);
        x.fillStyle = fill;
        x.fill();
        if (ring) {
          x.lineWidth = 16;
          x.strokeStyle = ring;
          x.stroke();
        }
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        textures.push(t);
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
        s.scale.setScalar(size);
        s.renderOrder = 2;
        return s;
      };
      const marker = disc(CORAL, "#ffffff", 0.075);
      const origin = disc("#ffffff", CORAL, 0.042);
      const destination = disc("#ffffff", WATER, 0.055);
      scene.add(origin, destination, marker);

      // The destination's name and the distance still to go, on the map by its marker.
      const label = document.createElement("span");
      label.className =
        "pointer-events-none absolute top-0 left-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-ink shadow-card will-change-transform";
      container.appendChild(label);

      let path: [number, number][] = [];
      let points: number[] = [];
      let km = 0;
      let sea = "";
      let startedAt = 0;
      let duration = 8;
      let arrivedAt = -1;
      const routeCenter = new THREE.Vector3();
      let routeRadius = 0.4;
      const focus = new THREE.Vector3();
      let distance = 1.6;
      let lastStatus = 0;

      function begin(p: [number, number][], now: number) {
        path = p;
        points = S.toPoints(p, 0.008);
        km = S.routeKm(p);
        sea = p[p.length - 1][0] < 0 ? "Western Sea" : "Gulf of Rain";
        duration = 5 + km / 450;
        startedAt = reduceMotion ? now - duration * 1000 : now;
        arrivedAt = -1;
        plan.geometry.dispose();
        plan.geometry = new LineGeometry();
        plan.geometry.setPositions(points);
        plan.computeLineDistances();
        origin.position.set(points[0], points[1], points[2]);
        const end = points.length - 3;
        destination.position.set(points[end], points[end + 1], points[end + 2]);
        // Frame the whole route: its centre and how far it spreads.
        const xs = p.map((q) => q[0]);
        const zs = p.map((q) => q[1]);
        routeCenter.set((Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2);
        routeRadius = Math.max(0.25, Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2);
      }

      function setTravelled(t: number) {
        const n = Math.max(2, Math.ceil(t * (path.length - 1)) + 1);
        const slice = points.slice(0, n * 3);
        const [hx, hz] = S.pointAt(path, t);
        slice.splice(slice.length - 3, 3, hx, S.lift(hx, hz, 0.008), hz);
        for (const line of [glow, core]) {
          line.geometry.dispose();
          line.geometry = new LineGeometry();
          line.geometry.setPositions(slice);
        }
        marker.position.set(hx, S.lift(hx, hz, 0.012), hz);
      }

      const first = S.randomDropPath();
      if (first) begin(first, performance.now());
      focus.copy(routeCenter);

      // A tap is a press and release in (nearly) the same spot; a drag is a scroll.
      let press: { x: number; y: number } | null = null;
      const onPointerDown = (e: PointerEvent) => {
        press = { x: e.clientX, y: e.clientY };
      };
      const onPointerUp = (e: PointerEvent) => {
        if (!press || Math.hypot(e.clientX - press.x, e.clientY - press.y) > TAP_SLOP_PX) return;
        press = null;
        const hit = S.pickPoint(e, renderer, camera, terrain);
        const p = hit && S.dropPathFrom(hit.x, hit.z);
        if (!p) return;
        begin(p, performance.now());
        if (reduceMotion) loop.redraw();
      };
      const canvas = renderer.domElement;
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointerup", onPointerUp);

      const projected = new THREE.Vector3();
      let w = 1;
      let h = 1;
      const loop = S.runLoop({
        container,
        renderer,
        camera,
        reduceMotion,
        onResize: (cw, ch) => {
          w = cw;
          h = ch;
          for (const m of [riverMat, planMat, glowMat, coreMat]) m.resolution.set(cw, ch);
        },
        onFrame: (now, dt) => {
          if (!path.length) return;
          const raw = Math.min((now - startedAt) / (duration * 1000), 1);
          const t = S.flowEase(raw);
          setTravelled(t);
          if (raw >= 1 && arrivedAt < 0) arrivedAt = now;
          if (arrivedAt > 0 && now - arrivedAt > 3000 && !reduceMotion) {
            const next = S.randomDropPath();
            if (next) begin(next, now);
          }
          // Keep the whole route in view in the space beside the card, leaning a little
          // towards the drop; ease, don't jump.
          const inset = Math.min(props.current.clearLeft, w * 0.6);
          const openAspect = (w - inset) / h;
          const portrait = w / h < 0.8;
          const narrow = openAspect < 1.1 ? 1.1 / openAspect : 1;
          const wantDistance = Math.min(2.8, Math.max(1.15, 0.85 + routeRadius * (portrait ? 3.2 : 2.4) * narrow));
          const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 1.4);
          focus.lerp(new THREE.Vector3().lerpVectors(routeCenter, marker.position, 0.3), k);
          distance += (wantDistance - distance) * k;
          camera.fov = portrait ? 46 : 34;
          // Looking down steeply and slightly landward keeps the open sea to a strip.
          camera.position.set(focus.x + 0.12, focus.y + distance * 0.82, focus.z + distance * 0.52);
          camera.lookAt(focus.x, 0, focus.z + 0.08);
          // Centre the view on the open area right of the card (no inset: the whole frame).
          if (inset > 0) camera.setViewOffset(w, h, -inset / 2, 0, w, h);
          else camera.clearViewOffset();
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);

          // Destination label, just above its marker.
          projected.copy(destination.position).project(camera);
          const lx = (projected.x * 0.5 + 0.5) * w;
          const ly = (-projected.y * 0.5 + 0.5) * h;
          label.style.transform = `translate(${(lx - label.offsetWidth / 2).toFixed(1)}px, ${(ly - label.offsetHeight - 14).toFixed(1)}px)`;

          if (now - lastStatus > 120) {
            lastStatus = now;
            const kmLeft = Math.round((km * (1 - t)) / 10) * 10;
            label.textContent = raw >= 1 ? `Reached the ${sea}` : `${sea} · ${kmLeft.toLocaleString()} km to go`;
            props.current.onStatus({
              phase: raw >= 1 ? "arrived" : "flowing",
              km,
              kmLeft,
              sea,
              progress: t,
            });
          }
        },
      });
      props.current.onReady(true);

      cleanup = () => {
        loop.dispose();
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointerup", onPointerUp);
        label.remove();
        textures.forEach((t) => t.dispose());
        S.disposeAll(scene, renderer);
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={ref} className="absolute inset-0 overflow-hidden" aria-hidden="true" />;
}
