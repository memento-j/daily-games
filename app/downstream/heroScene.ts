// three.js plumbing for the homepage hero (TrackerScene): renderer, the relief
// mesh, raindrop paths, and an animation loop that pauses when off screen.
//
// Only ever imported dynamically from a useEffect, so three.js never runs
// during the build's pre-render.

import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { gradient, height, pathLength, trace, WORLD } from "./heroWorld";

export { THREE, Line2, LineGeometry, LineMaterial };

export const RELIEF = 0.14;
export const KM_PER_UNIT = 1400; // the demo world's scale, for the illustrative km readout

export const lift = (x: number, z: number, above = 0.006) => Math.max(height(x, z), 0) * RELIEF + above;
export const toPoints = (path: [number, number][], above?: number) =>
  path.flatMap(([x, z]) => [x, lift(x, z, above), z]);

/** A WebGL renderer in the container, or null when WebGL isn't available. */
export function createRenderer(container: HTMLElement, clear: string, alpha = false) {
  // Check support ourselves first: three.js logs console errors when it fails to get a context.
  if (!document.createElement("canvas").getContext("webgl2")) return null;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (!alpha) renderer.setClearColor(clear);
  renderer.domElement.className = "block h-full w-full";
  container.appendChild(renderer.domElement);
  return renderer;
}

type Palette = { land: string; landHigh: string; sea: string; shore: string; coast: string; fade: string };

const SHADE_SIZE = 512;

/**
 * Hillshade baked into a texture at a much finer grid than the mesh, so the
 * shading is crisp per pixel instead of smeared across big triangles.
 */
function hillshadeTexture() {
  const data = new Uint8Array(SHADE_SIZE * SHADE_SIZE);
  const light = new THREE.Vector3(-0.55, 0.75, -0.4).normalize();
  const n = new THREE.Vector3();
  for (let j = 0; j < SHADE_SIZE; j++) {
    const z = WORLD.minZ + ((j + 0.5) / SHADE_SIZE) * (WORLD.maxZ - WORLD.minZ);
    for (let i = 0; i < SHADE_SIZE; i++) {
      const x = WORLD.minX + ((i + 0.5) / SHADE_SIZE) * (WORLD.maxX - WORLD.minX);
      const [gx, gz] = gradient(x, z);
      n.set(-gx * 2.2, 1, -gz * 2.2).normalize();
      data[j * SHADE_SIZE + i] = Math.round(255 * Math.min(1, Math.max(0, n.dot(light) * 1.35 - 0.2)));
    }
  }
  const texture = new THREE.DataTexture(data, SHADE_SIZE, SHADE_SIZE, THREE.RedFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** The demo world as a hillshaded relief mesh (modern map style: clean shading, faint contours). */
export function buildTerrain(palette: Palette, segments = 260) {
  const width = WORLD.maxX - WORLD.minX;
  const depth = WORLD.maxZ - WORLD.minZ;
  const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate((WORLD.minX + WORLD.maxX) / 2, 0, (WORLD.minZ + WORLD.maxZ) / 2);
  const pos = geometry.attributes.position;
  const heights = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const h = height(pos.getX(i), pos.getZ(i));
    heights[i] = h;
    pos.setY(i, Math.max(h, 0) * RELIEF);
  }
  geometry.setAttribute("aHeight", new THREE.BufferAttribute(heights, 1));

  const c = (hex: string) => new THREE.Color(hex);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uLand: { value: c(palette.land) },
      uLandHigh: { value: c(palette.landHigh) },
      uSea: { value: c(palette.sea) },
      uShore: { value: c(palette.shore) },
      uCoast: { value: c(palette.coast) },
      uFade: { value: c(palette.fade) },
      uShade: { value: hillshadeTexture() },
      uMin: { value: new THREE.Vector2(WORLD.minX, WORLD.minZ) },
      uSize: { value: new THREE.Vector2(width, depth) },
    },
    vertexShader: /* glsl */ `
      attribute float aHeight;
      varying float vH;
      varying vec2 vXZ;
      void main() {
        vH = aHeight; vXZ = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLand, uLandHigh, uSea, uShore, uCoast, uFade;
      uniform sampler2D uShade;
      uniform vec2 uMin, uSize;
      varying float vH;
      varying vec2 vXZ;
      void main() {
        vec3 col;
        if (vH < 0.0) {
          col = mix(uShore, uSea, smoothstep(0.0, 0.08, -vH));
        } else {
          col = mix(uLand, uLandHigh, smoothstep(0.1, 0.9, vH));
          float shade = texture2D(uShade, (vXZ - uMin) / uSize).r;
          col *= mix(0.66, 1.08, shade);
          // Faint contour every 0.08 of height, crisp at any zoom.
          float level = vH / 0.08;
          float contour = 1.0 - smoothstep(0.0, fwidth(level) * 1.2, abs(fract(level + 0.5) - 0.5));
          col = mix(col, uCoast, contour * 0.22);
        }
        float aa = fwidth(vH);
        col = mix(col, uCoast, (1.0 - smoothstep(0.0, aa * 1.4, abs(vH))) * 0.5);
        // Dissolve into the open sea well before the edge of the world, wherever the camera looks.
        vec2 edge = min(vXZ - uMin, uMin + uSize - vXZ);
        col = mix(col, uFade, 1.0 - smoothstep(0.0, 0.9, min(edge.x, edge.y)));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(geometry, material);
}

/** A random raindrop on high ground that really reaches the sea, or null. */
export function randomDropPath(): [number, number][] | null {
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = WORLD.minX + 0.5 + Math.random() * (WORLD.maxX - WORLD.minX - 1);
    const z = -0.5 + Math.random() * 1.5;
    if (height(x, z) < 0.35) continue;
    const t = trace(x, z);
    if (t.reachedSea && t.path.length > 60) return t.path;
  }
  return null;
}

export function dropPathFrom(x: number, z: number): [number, number][] | null {
  if (height(x, z) <= 0) return null;
  const t = trace(x, z);
  return t.reachedSea && t.path.length > 2 ? t.path : null;
}

export const routeKm = (path: [number, number][]) => Math.round((pathLength(path) * KM_PER_UNIT) / 10) * 10;

/** Ease along the route with some mass: a slow start, steady flow, and a gentle arrival. */
export const flowEase = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Point on a path at fraction t (0..1), interpolated. */
export function pointAt(path: [number, number][], t: number): [number, number] {
  const f = Math.min(Math.max(t, 0), 1) * (path.length - 1);
  const i = Math.floor(f);
  const j = Math.min(i + 1, path.length - 1);
  const k = f - i;
  return [path[i][0] + (path[j][0] - path[i][0]) * k, path[i][1] + (path[j][1] - path[i][1]) * k];
}

/**
 * Animation loop that pauses off screen and when the tab is hidden, resizes with
 * its container, and with reduced motion renders once (and on resize) only.
 */
export function runLoop(opts: {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  reduceMotion: boolean;
  onResize?: (w: number, h: number) => void;
  onFrame: (now: number, dt: number) => void;
}) {
  const { container, renderer, camera, reduceMotion, onResize, onFrame } = opts;
  let frame = 0;
  let running = false;
  let last = performance.now();
  const draw = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    onFrame(now, dt);
  };
  const tick = (now: number) => {
    draw(now);
    frame = requestAnimationFrame(tick);
  };
  const start = () => {
    if (running || reduceMotion) return;
    running = true;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(frame);
  };
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    onResize?.(w, h);
    camera.updateProjectionMatrix();
    if (reduceMotion) draw(performance.now());
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const visibility = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
  visibility.observe(container);
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVisibility);
  resize();
  if (reduceMotion) draw(performance.now());

  return {
    redraw: () => draw(performance.now()),
    dispose: () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

/** Dispose everything in a scene, then the renderer. */
export function disposeAll(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.traverse((obj) => {
    const o = obj as THREE.Mesh;
    o.geometry?.dispose();
    const m = o.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m?.dispose();
  });
  renderer.dispose();
  renderer.domElement.remove();
}

/** Raycast a pointer event onto a mesh; returns the world point or null. */
export function pickPoint(event: PointerEvent, renderer: THREE.WebGLRenderer, camera: THREE.Camera, target: THREE.Object3D) {
  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(target)[0]?.point ?? null;
}
