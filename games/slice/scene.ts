// Slice's 3D board (plain three.js, no React; app/slice/SliceGame.tsx drives it). The country is a
// thick paper-white slab on a sage cutting mat. While drawing, the camera looks down
// at a gentle tilt and drifts a little to feel alive (the camera moves, never the
// slab, so the line stays exact); a drag on the slab draws a dashed "cut here" line
// (raycast onto the slab's top, so it's exact at any tilt). On the reveal: a pair of
// scissors snips along the line, the slab splits into its two pieces, which slide
// apart; the people rise as columns; then the player can orbit and zoom. "Show perfect
// cut" (showPerfect) slides the perfect cut at the player's angle in from their line,
// as an ink dashed line (a tester preferred it to a glass pane), with an arrow showing
// which way it moved and a "Perfect cut · 50%" label.
//
// Scoring never happens here: the board maths (games/slice) stays 2D and decides
// everything. This only shows it.

import polygonClipping, { type MultiPolygon, type Polygon as PcPolygon } from "polygon-clipping";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { centroid, dot, segmentInBox, signedArea } from "./geometry";
import { formatShare } from "./scoring";
import { sound } from "./sound";
import type { Theme } from "../../lib/theme";
import type { Line, PeoplePoint, Point, Ring, Round } from "./types";

type Draft = [Point, Point];

const WORLD = 10; // the country's longest side, in world units
const THICK = 0.42; // slab thickness
const BEVEL = 0.035;
const TOP = THICK + BEVEL; // the slab's top surface
const SPLIT = 0.6; // how far the pieces slide apart
const COLUMN_MAX = 2.2; // height of the most crowded column
const PERFECT_SECONDS = 1.1; // the perfect cut's slide from the player's line
const HANDLE_PX = 30; // touch radius around a handle
const MIN_CUT_PX = 24;
const SCISSORS_SIZE = 1.8; // big enough to read on a phone
const DASH = 0.16; // the "cut here" line: dash and gap lengths (world units)
const GAP = 0.11;

// The reveal's timing, in seconds after Cut. sound.reveal plays to the same clock.
const SNIP_EVERY = 0.2; // one snip per scissor close
const SNIPS = 6;
const T = {
  travel: SNIPS * SNIP_EVERY, // scissors cross the country
  split: SNIPS * SNIP_EVERY + 0.05, // the pieces part
  camera: [0.8, 1.7] as const, // start, duration
  rise: 1.9, // people start rising (each column ~0.8 s, staggered over ~1.2 s)
  count: 3.1, // shares count up (0.9 s)
  done: 4.0, // the camera is the player's
};

// The table in each theme (the same values as the --color-mat / --color-slab tokens in
// app/globals.css). At night the mat goes deep green-black, the slab stays paper, a
// lit object on it, and a cooler sky light stands in for the warm room.
type Palette = {
  mat: number;
  grid: [string, string]; // the mat's minor and major grid lines
  top: number;
  side: number;
  countedTop: number;
  coral: number;
  otherPeople: number;
  ink: number;
  slit: number;
  steel: number;
  sky: number;
  ground: number;
  skyLight: number; // hemisphere intensity
  sunLight: number;
};
const PALETTES: Record<Theme, Palette> = {
  light: {
    mat: 0xbccdbd,
    grid: ["rgba(255,255,255,0.22)", "rgba(255,255,255,0.5)"],
    top: 0xfffaf3,
    side: 0xe9a68c,
    countedTop: 0xffdcd2,
    coral: 0xf2545b,
    otherPeople: 0x7b8597,
    ink: 0x1d2a44,
    slit: 0x5b463c,
    steel: 0xe3e7ec,
    sky: 0xfff6ea,
    ground: 0xb9c4b3,
    skyLight: 1.5,
    sunLight: 2.4,
  },
  dark: {
    mat: 0x1d2925,
    grid: ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.13)"],
    top: 0xebe4d8,
    side: 0xc98a72,
    countedTop: 0xf4c9bd,
    coral: 0xf2545b,
    otherPeople: 0x9aa4b6,
    ink: 0x1d2a44,
    slit: 0x5b463c,
    steel: 0xd0d5dc,
    sky: 0xc9d3e6,
    ground: 0x22302b,
    skyLight: 0.95,
    sunLight: 2.1,
  },
};
// The palette colours a material can take; it keeps its role so setTheme can recolour it.
type Role = "top" | "side" | "countedTop" | "coral" | "otherPeople" | "ink" | "slit" | "steel";

type Piece = { group: THREE.Group; dir: THREE.Vector3; columns: THREE.InstancedMesh | null; heights: number[]; delays: number[]; centre: THREE.Vector3; positions: THREE.Vector3[] };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3); // ease-out cubic
const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const window01 = (t: number, start: number, length: number) => (t - start) / length;

/** Group flat rings into polygons (outer ring + its holes): rings wound like the
 *  biggest one are outer rings, the others holes of the outer ring they sit in. */
function toPolygons(rings: Ring[]): PcPolygon[] {
  const sign = Math.sign(signedArea(rings.reduce((a, b) => (Math.abs(signedArea(b)) > Math.abs(signedArea(a)) ? b : a))));
  const outers = rings.filter((r) => Math.sign(signedArea(r)) === sign);
  const polys: PcPolygon[] = outers.map((r) => [r]);
  for (const hole of rings.filter((r) => Math.sign(signedArea(r)) !== sign)) {
    const i = outers.findIndex((o) => inside(hole[0], o));
    if (i >= 0) polys[i].push(hole);
  }
  return polys;
}

function inside([x, y]: Point, ring: Ring): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The half-plane on the line's positive side, as a huge quad. */
function halfPlane(line: Line): PcPolygon {
  const [nx, ny] = line.normal;
  const o = line.offset;
  const B = 1e5;
  const p: Point = [nx * o, ny * o];
  const d: Point = [-ny, nx];
  return [
    [
      [p[0] + d[0] * B, p[1] + d[1] * B],
      [p[0] + d[0] * B + nx * B, p[1] + d[1] * B + ny * B],
      [p[0] - d[0] * B + nx * B, p[1] - d[1] * B + ny * B],
      [p[0] - d[0] * B, p[1] - d[1] * B],
      [p[0] + d[0] * B, p[1] + d[1] * B],
    ],
  ];
}

/** A self-healing cutting mat: sage with a faint white grid, every fifth line stronger. */
function matTexture(p: Palette, anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  g.fillStyle = `#${p.mat.toString(16).padStart(6, "0")}`;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i <= 10; i++) {
    const at = (i / 10) * size;
    const major = i % 5 === 0;
    g.strokeStyle = major ? p.grid[1] : p.grid[0];
    g.lineWidth = major ? 3 : 1.5;
    g.beginPath();
    g.moveTo(at, 0);
    g.lineTo(at, size);
    g.moveTo(0, at);
    g.lineTo(size, at);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40); // 200-unit mat, a 5-unit tile with lines every half unit
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export class SliceScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  private controls: OrbitControls;
  private raf = 0;
  private container: HTMLElement;
  private onDraft: (draft: Draft | null) => void;
  private labels: HTMLElement[];
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private disposables: { dispose(): void }[] = [];
  private palette: Palette;
  private sky: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private mat: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;

  // The current round, and how its board coordinates map onto the table.
  private round: Round | null = null;
  private s = 1;
  private c: Point = [500, 500];
  private min: Point = [0, 0]; // the board's frame (outline + margin)
  private max: Point = [1000, 1000];
  private bmin: Point = [0, 0]; // the outline's own bounds
  private bmax: Point = [1000, 1000];
  private polygons: PcPolygon[] = [];
  private slab: THREE.Group | null = null;

  // Drawing
  private phase: "draw" | "reveal" = "draw";
  private draft: Draft | null = null;
  private dragging: 0 | 1 | null = null;
  private draftGroup = new THREE.Group();
  private dashes: THREE.InstancedMesh; // the drawn part of the line
  private trail: THREE.InstancedMesh; // the line carried on across the board
  private drawnDashes = 0;
  private lastTick = 0;
  private handles: THREE.Group[] = [];
  private topPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP);
  private raycaster = new THREE.Raycaster();

  // Camera: the drawing view drifts gently (and leans towards a hovering mouse).
  private drawView = { radius: 20, polar: 0.42, azimuth: 0 };
  private revealView = { radius: 22, polar: 0.95, azimuth: 0.55 };
  private cameraFrom = { radius: 20, polar: 0.42, azimuth: 0 };
  private drift = 1; // 0 while a finger is down
  private insets = { top: 0, bottom: 0 };
  private hover = new THREE.Vector2();
  private hoverAim = new THREE.Vector2();

  // Reveal
  // When the reveal / perfect cut started (performance.now() ms), or null before. Not -1:
  // an instant start is now - 10 s, which is negative right after a page load.
  private revealStart: number | null = null;
  private pieces: Piece[] = [];
  private scissors: THREE.Group;
  private scissorHalves: THREE.Group[] = [];
  private slit: THREE.Mesh;
  private cutFrom = new THREE.Vector3();
  private cutTo = new THREE.Vector3();
  private cutSpan: [Point, Point] | null = null;
  // The perfect cut, shown on request: a dashed line, an arrow, a label.
  private perfect: THREE.Group | null = null;
  private arrow: THREE.Group | null = null;
  private perfectFrom = 0; // world offsets along the cut's normal
  private perfectTo = 0;
  private arrowFrom = 0;
  private perfectDir = new THREE.Vector3();
  private perfectAlong = new THREE.Vector3();
  private perfectStart: number | null = null;
  private perfectLabel: HTMLElement;
  private perfectLen = 0;
  private target = 0.5;
  private shares: [number, number] = [0, 0];
  private onRevealDone: (() => void) | null = null;
  private revealDone = false;

  constructor(container: HTMLElement, labels: HTMLElement[], perfectLabel: HTMLElement, onDraft: (draft: Draft | null) => void, theme: Theme = "light") {
    this.palette = PALETTES[theme];
    this.container = container;
    this.labels = labels;
    this.perfectLabel = perfectLabel;
    this.onDraft = onDraft;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // r186 dropped PCFSoftShadowMap; radius softens instead
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(this.palette.mat);
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.style.display = "block";
    container.appendChild(this.renderer.domElement);
    this.scene.fog = new THREE.Fog(this.palette.mat, 40, 110); // the mat fades out at the horizon

    // A warm room: soft sky light and one sun with a soft shadow on the mat.
    this.sky = new THREE.HemisphereLight(this.palette.sky, this.palette.ground, this.palette.skyLight);
    this.scene.add(this.sky);
    const sun = new THREE.DirectionalLight(0xffffff, this.palette.sunLight);
    this.sun = sun;
    sun.position.set(-7, 16, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
    this.scene.add(sun);
    this.mat = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ map: matTexture(this.palette, this.renderer.capabilities.getMaxAnisotropy()), roughness: 0.95 }),
    );
    this.mat.rotation.x = -Math.PI / 2;
    this.mat.receiveShadow = true;
    this.scene.add(this.mat);

    // The "cut here" line: coral dashes between the handles, fainter ones across the board.
    const dashGeo = new THREE.BoxGeometry(1, 0.025, 1);
    this.dashes = new THREE.InstancedMesh(dashGeo, this.tint(new THREE.MeshBasicMaterial(), "coral"), 400);
    this.trail = new THREE.InstancedMesh(dashGeo, this.tint(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4 }), "coral"), 400);
    this.dashes.count = this.trail.count = 0;
    this.draftGroup.add(this.trail, this.dashes);
    for (let i = 0; i < 2; i++) {
      const handle = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 32), this.tint(new THREE.MeshBasicMaterial(), "coral"));
      const dotMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      handle.add(ring, dotMesh);
      this.handles.push(handle);
      this.draftGroup.add(handle);
    }
    this.draftGroup.visible = false;
    this.scene.add(this.draftGroup);

    this.slit = new THREE.Mesh(new THREE.BoxGeometry(1, 0.02, 1), this.tint(new THREE.MeshBasicMaterial(), "slit"));
    this.slit.visible = false;
    this.scene.add(this.slit);
    this.scissors = this.makeScissors();
    this.scene.add(this.scissors);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = 0.15;
    this.controls.maxPolarAngle = 1.35;
    this.controls.autoRotateSpeed = 0.6;
    this.controls.addEventListener("start", () => (this.controls.autoRotate = false));

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.down);
    el.addEventListener("pointermove", this.move);
    el.addEventListener("pointerup", this.up);
    el.addEventListener("pointercancel", this.up);
    el.addEventListener("pointerleave", () => this.hoverAim.set(0, 0));

    this.resize();
    new ResizeObserver(() => this.resize()).observe(container);
    this.loop();
  }

  /** Give a material its palette colour, and remember the role for setTheme. */
  private tint<M extends THREE.MeshBasicMaterial | THREE.MeshStandardMaterial>(material: M, role: Role): M {
    material.userData.role = role;
    material.color.set(this.palette[role]);
    return material;
  }

  /** Light or dark: recolour the mat, the lights and every tinted material in place, so
   *  a round in progress (or a reveal on screen) just changes its lighting. */
  setTheme(theme: Theme) {
    const p = PALETTES[theme];
    if (p === this.palette) return;
    this.palette = p;
    this.renderer.setClearColor(p.mat);
    (this.scene.fog as THREE.Fog).color.set(p.mat);
    this.mat.material.map?.dispose();
    this.mat.material.map = matTexture(p, this.renderer.capabilities.getMaxAnisotropy());
    this.mat.material.needsUpdate = true;
    this.sky.color.set(p.sky);
    this.sky.groundColor.set(p.ground);
    this.sky.intensity = p.skyLight;
    this.sun.intensity = p.sunLight;
    this.scene.traverse((object) => {
      const material = (object as THREE.Mesh).material;
      for (const m of Array.isArray(material) ? material : material ? [material] : []) {
        const role = m.userData.role as Role | undefined;
        if (role) (m as THREE.MeshBasicMaterial).color.set(p[role]);
      }
    });
  }

  /** Paper scissors: two steel blades on a pivot with coral handles. Local +x is
   *  where the tips point; each half opens around the pivot (y axis). */
  private makeScissors(): THREE.Group {
    const steel = this.tint(new THREE.MeshStandardMaterial({ metalness: 0.85, roughness: 0.25 }), "steel");
    const grip = this.tint(new THREE.MeshStandardMaterial({ roughness: 0.45 }), "coral");
    const blade = new THREE.Shape([new THREE.Vector2(0, -0.06), new THREE.Vector2(1.05, 0), new THREE.Vector2(0, 0.06)]);
    const bladeGeo = new THREE.ExtrudeGeometry(blade, { depth: 0.025, bevelEnabled: false });
    bladeGeo.rotateX(-Math.PI / 2);
    const shankGeo = new THREE.BoxGeometry(0.28, 0.025, 0.05);
    const ringGeo = new THREE.TorusGeometry(0.13, 0.035, 10, 28);
    ringGeo.rotateX(Math.PI / 2);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 16), steel);
    const scissors = new THREE.Group();
    for (const side of [1, -1]) {
      const half = new THREE.Group();
      const b = new THREE.Mesh(bladeGeo, steel);
      b.position.y = side > 0 ? 0.0 : 0.026;
      const shank = new THREE.Mesh(shankGeo, steel);
      shank.position.set(-0.14, b.position.y, side * 0.04);
      shank.rotation.y = side * 0.35;
      const ring = new THREE.Mesh(ringGeo, grip);
      ring.position.set(-0.36, b.position.y, side * 0.14);
      for (const m of [b, shank, ring]) m.castShadow = true;
      half.add(b, shank, ring);
      this.scissorHalves.push(half);
      scissors.add(half);
    }
    scissors.add(screw);
    scissors.visible = false;
    this.disposables.push(steel, grip, bladeGeo, shankGeo, ringGeo);
    return scissors;
  }

  // --- Mapping between the board (0..1000, y down) and the table (x, z) ---

  private toWorld([bx, by]: Point, y = TOP): THREE.Vector3 {
    return new THREE.Vector3((bx - this.c[0]) * this.s, y, (by - this.c[1]) * this.s);
  }

  private toBoard(v: THREE.Vector3): Point {
    return [v.x / this.s + this.c[0], v.z / this.s + this.c[1]];
  }

  /** A line's offset measured on the table (world units, from the table's centre). */
  private worldOffset(line: Line): number {
    return this.s * (line.offset - dot(this.c, line.normal));
  }

  // --- Building the country ---

  setRound(round: Round) {
    this.clearReveal();
    if (this.slab) this.scene.remove(this.slab);
    this.round = round;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const r of round.outline)
      for (const [x, y] of r) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    this.c = [(x0 + x1) / 2, (y0 + y1) / 2];
    this.s = WORLD / Math.max(x1 - x0, y1 - y0);
    const pad = Math.max(x1 - x0, y1 - y0) * 0.08;
    this.bmin = [x0, y0];
    this.bmax = [x1, y1];
    this.min = [x0 - pad, y0 - pad];
    this.max = [x1 + pad, y1 + pad];
    this.polygons = toPolygons(round.outline);
    this.slab = this.extrude(this.polygons, "top");
    this.scene.add(this.slab);
    this.fitViews();
    this.phase = "draw";
    this.setDraft(null);
  }

  private extrude(polys: PcPolygon[], topRole: Role): THREE.Group {
    const shapes: THREE.Shape[] = [];
    for (const poly of polys) {
      const ring = (r: Point[]) => {
        const pts = r.map(([bx, by]) => new THREE.Vector2((bx - this.c[0]) * this.s, -(by - this.c[1]) * this.s));
        if (pts.length > 1 && pts[0].equals(pts[pts.length - 1])) pts.pop();
        return pts;
      };
      const shape = new THREE.Shape(ring(poly[0] as Point[]));
      for (const hole of poly.slice(1)) shape.holes.push(new THREE.Path(ring(hole as Point[])));
      shapes.push(shape);
    }
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: THICK - BEVEL,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: 0.025,
      bevelSegments: 2,
      curveSegments: 1,
    });
    geo.rotateX(-Math.PI / 2); // shape (x, y) lies flat as table (x, -z); extrusion points up
    geo.translate(0, BEVEL, 0);
    geo.computeVertexNormals();
    const top = this.tint(new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 }), topRole);
    const side = this.tint(new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 }), "side");
    this.disposables.push(geo, top, side);
    const mesh = new THREE.Mesh(geo, [top, side]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const group = new THREE.Group();
    group.add(mesh);
    return group;
  }

  /** Camera distances that fit the country into the free band between the interface
   *  at the top and the card at the bottom (`insets`), for the drawing view and the reveal. */
  private fitViews() {
    const w = (this.max[0] - this.min[0]) * this.s;
    const h = (this.max[1] - this.min[1]) * this.s;
    const aspect = this.camera.aspect || 1;
    const screenH = this.container.clientHeight || 1;
    const free = Math.max(0.3, (screenH - this.insets.top - this.insets.bottom) / screenH);
    const v = Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * free); // the band's half-angle
    const hor = Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * aspect);
    // Drawing: seen from the south at a gentle tilt, the board's depth looks shorter by cos(tilt).
    this.drawView.radius = Math.max(w / 2 / Math.tan(hor), (h * Math.cos(this.drawView.polar)) / 2 / Math.tan(v) + TOP) * 1.08;
    // The reveal swings round to any side, so fit the country's whole diagonal (a
    // circle around it) rather than its width or depth.
    const r = Math.hypot(w, h) / 2;
    // 0.8: let the circle's corners crop a little; the country itself still fits.
    this.revealView.radius = ((r + SPLIT / 2) / Math.sin(Math.min(v, hor))) * 0.8 + COLUMN_MAX * 0.25; // + the pieces' spread
    // Orbiting after the reveal: zoom in close enough to read a city's column, out far
    // enough to see the whole country with room around it, never further either way.
    this.controls.minDistance = this.revealView.radius * 0.3;
    this.controls.maxDistance = this.revealView.radius * 1.3;
    // The mat fades into the distance, but never the country, even fully zoomed out.
    const fog = this.scene.fog as THREE.Fog;
    fog.near = this.controls.maxDistance + WORLD;
    fog.far = fog.near + 70;
  }

  private setCamera(view: { radius: number; polar: number; azimuth: number }) {
    const p = new THREE.Vector3().setFromSphericalCoords(view.radius, view.polar, view.azimuth);
    this.camera.position.copy(p);
    this.camera.lookAt(0, TOP * 0.5, 0);
    this.controls.target.set(0, TOP * 0.5, 0);
  }

  /** The drawing view, drifting slowly so the slab feels like an object on a table,
   *  and leaning a touch towards a hovering mouse. Calm while a finger is down. */
  private driftCamera(now: number) {
    const t = now / 1000;
    this.drift += ((this.dragging === null && !this.reduced ? 1 : 0) - this.drift) * 0.08;
    this.hover.lerp(this.hoverAim, 0.05);
    this.setCamera({
      radius: this.drawView.radius,
      polar: this.drawView.polar + (0.03 * Math.sin(t * 0.31 + 1) + 0.04 * this.hover.y) * this.drift,
      azimuth: this.drawView.azimuth + (0.06 * Math.sin(t * 0.43) + 0.07 * this.hover.x) * this.drift,
    });
  }

  /** Screen space covered by the interface (px): the country is framed between them. */
  setInsets(insets: { top: number; bottom: number }) {
    if (insets.top === this.insets.top && insets.bottom === this.insets.bottom) return;
    this.insets = insets;
    this.resize();
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    // Centre the picture in the free band rather than the screen: shift the view so the
    // camera's centre lands halfway between the top interface and the bottom card.
    const shift = (this.insets.top - this.insets.bottom) / 2;
    if (shift) this.camera.setViewOffset(w, h, 0, -shift, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    if (this.round) this.fitViews();
  }

  // --- Drawing the cut ---

  private boardPoint(e: PointerEvent): Point | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.topPlane, hit)) return null;
    const [bx, by] = this.toBoard(hit);
    return [Math.min(this.max[0], Math.max(this.min[0], bx)), Math.min(this.max[1], Math.max(this.min[1], by))];
  }

  private screenOf(p: Point): THREE.Vector2 {
    const v = this.toWorld(p).project(this.camera);
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((v.x + 1) / 2) * r.width, ((1 - v.y) / 2) * r.height);
  }

  private down = (e: PointerEvent) => {
    sound.wake();
    if (this.phase !== "draw") return;
    const p = this.boardPoint(e);
    if (!p) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    const at = new THREE.Vector2(e.clientX - r.left, e.clientY - r.top);
    const near = this.draft?.findIndex((h) => this.screenOf(h).distanceTo(at) < HANDLE_PX) ?? -1;
    if (this.draft && near >= 0) {
      this.dragging = near as 0 | 1;
      sound.grab();
    } else {
      this.dragging = 1;
      this.drawnDashes = 0;
      this.setDraft([p, p]);
    }
    this.renderer.domElement.setPointerCapture(e.pointerId);
  };

  private move = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && this.dragging === null) {
      const r = this.renderer.domElement.getBoundingClientRect();
      this.hoverAim.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    }
    if (this.phase !== "draw" || this.dragging === null || !this.draft) return;
    const p = this.boardPoint(e);
    if (!p) return;
    this.setDraft(this.dragging === 0 ? [p, this.draft[1]] : [this.draft[0], p]);
  };

  private up = () => {
    if (this.dragging === null) return;
    this.dragging = null;
    if (this.draft && this.screenOf(this.draft[0]).distanceTo(this.screenOf(this.draft[1])) < MIN_CUT_PX) this.setDraft(null);
  };

  private setDraft(draft: Draft | null) {
    this.draft = draft;
    this.onDraft(draft);
    const long = draft && Math.hypot(draft[1][0] - draft[0][0], draft[1][1] - draft[0][1]) > 1e-6;
    this.draftGroup.visible = !!long;
    for (const h of this.handles) h.visible = true;
    if (!draft || !long) {
      this.dashes.count = this.trail.count = 0;
      return;
    }
    const [a, b] = draft;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const normal: Point = [-dy / len, dx / len];
    const span = segmentInBox({ normal, offset: dot(a, normal) }, this.min, this.max);
    const wa = this.toWorld(a, TOP + 0.02);
    const n = this.layDashes(this.dashes, wa, this.toWorld(b, TOP + 0.02), wa, 0.075);
    if (span) this.layDashes(this.trail, this.toWorld(span[0], TOP + 0.012), this.toWorld(span[1], TOP + 0.012), wa, 0.05);
    this.handles[0].position.copy(this.toWorld(a, TOP + 0.04));
    this.handles[1].position.copy(this.toWorld(b, TOP + 0.04));
    // A ratchet tick for each new dash while drawing, like paper being scored.
    const now = performance.now();
    if (this.dragging !== null && n !== this.drawnDashes && now - this.lastTick > 28) {
      sound.tick();
      this.lastTick = now;
    }
    this.drawnDashes = n;
  }

  /** Dashes from `a` to `b`, the pattern anchored at `anchor` so it never crawls while
   *  an end is dragged. Returns how many were laid. */
  private layDashes(mesh: THREE.InstancedMesh, a: THREE.Vector3, b: THREE.Vector3, anchor: THREE.Vector3, width: number): number {
    const dir = b.clone().sub(a);
    const len = dir.length();
    if (len < 1e-6) {
      mesh.count = 0;
      return 0;
    }
    dir.divideScalar(len);
    const period = DASH + GAP;
    const phase = anchor.clone().sub(a).dot(dir);
    let start = phase - Math.ceil(phase / period) * period;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(dir.z, dir.x));
    let n = 0;
    for (; start < len && n < mesh.instanceMatrix.count; start += period) {
      const s0 = Math.max(start, 0);
      const s1 = Math.min(start + DASH, len);
      if (s1 - s0 < 0.01) continue;
      const mid = a.clone().addScaledVector(dir, (s0 + s1) / 2);
      m.compose(mid, q, new THREE.Vector3(s1 - s0, 1, width));
      mesh.setMatrixAt(n++, m);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    return n;
  }

  getDraft(): Draft | null {
    return this.draft;
  }

  // --- The reveal ---

  /** Play the cut. `instant` jumps to the finished state in silence (a round seen again
   *  from the day's summary, or a resumed game). */
  reveal(line: Line, perfect: Line, positiveShare: number, positiveCounts: boolean, tier: number, onDone: () => void, instant = false) {
    if (!this.round) return;
    this.phase = "reveal";
    this.dragging = null;
    this.onRevealDone = onDone;
    this.revealDone = false;
    this.shares = [positiveShare, 1 - positiveShare];
    // Swing from where the drift left the camera; a board shown straight into a reveal
    // (a resumed game) has never placed it, so start from the drawing view.
    const placed = this.camera.position.lengthSq() > 1e-6;
    this.cameraFrom = placed
      ? {
          radius: this.drawView.radius,
          polar: Math.acos(this.camera.position.y / this.camera.position.length()),
          azimuth: Math.atan2(this.camera.position.x, this.camera.position.z),
        }
      : { ...this.drawView };
    // Swing round to look along the cut (a little to one side), so the gap between the
    // pieces faces the camera; of the cut's two ends, the one nearer the current view.
    let az = Math.atan2(-line.normal[1], line.normal[0]) + 0.8;
    const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(wrap(az - this.cameraFrom.azimuth)) > Math.PI / 2) az += Math.PI;
    this.revealView.azimuth = this.cameraFrom.azimuth + wrap(az - this.cameraFrom.azimuth);
    this.revealView.polar = 0.95;

    // The scissors cross the country along the line (its chord through the outline's box).
    this.cutSpan = segmentInBox(line, this.bmin, this.bmax);
    if (this.cutSpan) {
      this.cutFrom = this.toWorld(this.cutSpan[0], TOP);
      this.cutTo = this.toWorld(this.cutSpan[1], TOP);
      this.scissors.rotation.set(0, -Math.atan2(this.cutTo.z - this.cutFrom.z, this.cutTo.x - this.cutFrom.x), 0);
    }
    this.dashes.count = 0;
    for (const h of this.handles) h.visible = false;

    // The two pieces, each its own slab, with the people standing on it.
    const n = new THREE.Vector3(line.normal[0], 0, line.normal[1]);
    const sides = [line, { normal: [-line.normal[0], -line.normal[1]] as Point, offset: -line.offset }];
    const points = this.round.mode === "population" ? (this.round.points ?? []) : [];
    const heaviest = points.reduce((m, p) => Math.max(m, p[2]), 1);
    const footprint = Math.min(0.12, Math.max(0.04, (WORLD / Math.sqrt(Math.max(points.length, 1))) * 0.4));
    this.pieces = sides.map((side, i) => {
      let polys: MultiPolygon = [];
      try {
        polys = polygonClipping.intersection(this.polygons, halfPlane(side));
      } catch {
        polys = [];
      }
      const counted = (i === 0) === positiveCounts;
      const group = this.extrude(polys, counted ? "countedTop" : "top");
      const mine = points.filter((p) => p[0] * side.normal[0] + p[1] * side.normal[1] > side.offset);
      const piece: Piece = { group, dir: i === 0 ? n.clone() : n.clone().negate(), columns: null, heights: [], delays: [], centre: new THREE.Vector3(), positions: [] };
      if (mine.length) piece.columns = this.columns(mine, heaviest, footprint, counted ? "coral" : "otherPeople", piece);
      const rings = polys.flatMap((poly) => poly) as Ring[];
      const c = centroid(rings) ?? [this.c[0], this.c[1]];
      piece.centre = this.toWorld(c, TOP);
      this.scene.add(group);
      group.visible = false;
      return piece;
    });

    this.target = this.round.target;
    this.buildPerfect(line, perfect, n);

    // Instant (already seen) and reduced motion both start at the finished state; instant
    // is silent, reduced motion plays only the closing sound.
    this.revealStart = performance.now() - (instant || this.reduced ? 10_000 : 0);
    if (this.reduced && !instant) {
      sound.reveal({ snips: 0, snipEvery: 0, split: 0, rise: 0, riseFor: 0, people: false, done: 0.1, tier });
    } else if (!instant) {
      sound.reveal({ snips: SNIPS, snipEvery: SNIP_EVERY, split: T.split, rise: T.rise, riseFor: 1.6, people: points.length > 0, done: T.done - 0.3, tier });
    }
  }

  /** The perfect cut at the player's angle, hidden until showPerfect: ink dashes on the
   *  slab like the player's "cut here" line, plus an arrow from the player's cut. It
   *  rides with whichever piece it falls in, so its far offset allows for the split. */
  private buildPerfect(line: Line, perfect: Line, n: THREE.Vector3) {
    const span = segmentInBox(perfect, this.bmin, this.bmax);
    if (!span) return;
    const len = this.toWorld(span[0]).distanceTo(this.toWorld(span[1]));
    this.perfectLen = len;
    const group = new THREE.Group();
    group.rotation.y = -Math.atan2(span[1][1] - span[0][1], span[1][0] - span[0][0]);
    const dashGeo = new THREE.BoxGeometry(1, 0.025, 1);
    const dashMat = this.tint(new THREE.MeshBasicMaterial(), "ink");
    const dashes = new THREE.InstancedMesh(dashGeo, dashMat, 400);
    const a = new THREE.Vector3(-len / 2, TOP + 0.015, 0);
    this.layDashes(dashes, a, new THREE.Vector3(len / 2, TOP + 0.015, 0), a, 0.07);
    group.add(dashes);
    this.disposables.push(dashGeo, dashMat);

    // Its path: from the player's line to the perfect one, along the cut's normal. Its
    // position is a point along the line (the middle of its span) plus an offset along n.
    this.perfectDir = n.clone();
    const mid = this.toWorld([(span[0][0] + span[1][0]) / 2, (span[0][1] + span[1][1]) / 2], 0);
    this.perfectAlong = mid.clone().sub(n.clone().multiplyScalar(mid.dot(n)));
    this.perfectFrom = this.worldOffset(line);
    const pw = this.worldOffset(perfect);
    const side = pw > this.perfectFrom ? 1 : -1;
    this.perfectTo = pw + (side * SPLIT) / 2;
    this.arrowFrom = this.perfectFrom + (side * SPLIT) / 2; // the edge of that piece

    // The arrow: flat on the slab, pointing from the player's cut to the perfect one.
    if (Math.abs(this.perfectTo - this.arrowFrom) > 0.25) {
      const inkMat = this.tint(new THREE.MeshBasicMaterial(), "ink");
      const shaftGeo = new THREE.BoxGeometry(1, 0.03, 0.07);
      shaftGeo.translate(0.5, 0, 0); // grows from its start
      const headGeo = new THREE.ConeGeometry(0.14, 0.3, 3);
      headGeo.rotateZ(-Math.PI / 2); // point along +x
      headGeo.rotateX(Math.PI / 2); // lie flat
      this.disposables.push(inkMat, shaftGeo, headGeo);
      const arrow = new THREE.Group();
      const shaft = new THREE.Mesh(shaftGeo, inkMat);
      const head = new THREE.Mesh(headGeo, inkMat);
      shaft.name = "shaft";
      head.name = "head";
      arrow.add(shaft, head);
      arrow.rotation.y = -Math.atan2(n.z * side, n.x * side);
      arrow.visible = false;
      this.arrow = arrow;
      this.scene.add(arrow);
    }

    group.visible = false;
    this.perfect = group;
    this.scene.add(group);
  }

  /** "Show perfect cut": slide it in from the player's line, with the arrow and label.
   *  `instant` puts it in place silently (the day's summary). */
  showPerfect(instant = false) {
    if (!this.perfect || this.perfectStart !== null) return;
    this.perfectStart = performance.now() - (this.reduced || instant ? 10_000 : 0);
    if (!instant) sound.perfect();
  }

  private animatePerfect(now: number) {
    if (!this.perfect || this.perfectStart === null) return;
    const started = this.perfectStart;
    const k = easeInOut((now - started) / 1000 / PERFECT_SECONDS);
    const off = THREE.MathUtils.lerp(this.perfectFrom, this.perfectTo, k);
    this.perfect.visible = true;
    this.perfect.position.copy(this.perfectAlong).addScaledVector(this.perfectDir, off);
    if (this.arrow) {
      // The arrow grows behind the moving cut, from the edge of the player's piece.
      const from = this.arrowFrom;
      const to = THREE.MathUtils.lerp(from, this.perfectTo, k) - Math.sign(this.perfectTo - from) * 0.12;
      const length = Math.abs(to - from);
      this.arrow.visible = length > 0.2;
      this.arrow.position.copy(this.perfectAlong).addScaledVector(this.perfectDir, from).setY(TOP + 0.03);
      const shaft = this.arrow.getObjectByName("shaft")!;
      const head = this.arrow.getObjectByName("head")!;
      shaft.scale.x = Math.max(0.001, length - 0.25);
      head.position.x = Math.max(0.001, length - 0.15);
    }
    // The label floats above the perfect cut, at whichever spot along it (middle or
    // towards either end) sits furthest from the two pieces' labels on screen.
    const along = new THREE.Vector3(1, 0, 0).applyQuaternion(this.perfect.quaternion);
    const y = TOP + 0.45;
    const others = this.labels.map((el) => el.getBoundingClientRect());
    const box = this.renderer.domElement.getBoundingClientRect();
    let best: THREE.Vector2 | null = null;
    let bestGap = -1;
    for (const f of [0, -0.35, 0.35]) {
      const v = this.perfect.position.clone().addScaledVector(along, f * this.perfectLen).setY(y).project(this.camera);
      const at = new THREE.Vector2(((v.x + 1) / 2) * box.width, ((1 - v.y) / 2) * box.height);
      if (at.x < 60 || at.x > box.width - 60 || at.y < 0 || at.y > box.height) continue; // keep it on screen
      const gap = Math.min(...others.map((o) => Math.hypot(at.x - (o.left + o.width / 2 - box.left), at.y - (o.top + o.height / 2 - box.top))));
      if (gap > bestGap) {
        bestGap = gap;
        best = at;
      }
    }
    if (best) {
      // A short perfect line (narrow Chile) can leave every spot near a piece's label:
      // step upwards until the two no longer overlap.
      const w = this.perfectLabel.offsetWidth / 2 + 6;
      const h = this.perfectLabel.offsetHeight / 2 + 6;
      const hits = () =>
        others.some((o) => {
          const cx = o.left + o.width / 2 - box.left;
          const cy = o.top + o.height / 2 - box.top;
          return Math.abs(best!.x - cx) < w + o.width / 2 && Math.abs(best!.y - cy) < h + o.height / 2;
        });
      for (let i = 0; i < 30 && hits(); i++) best.y -= 4;
      this.perfectLabel.style.transform = `translate(-50%, -50%) translate(${best.x}px, ${best.y}px)`;
    }
    this.perfectLabel.style.opacity = String(ease((now - started) / 1000 / PERFECT_SECONDS - 0.4));
    this.perfectLabel.textContent = `Perfect cut · ${formatShare(this.target)}`;
  }

  private columns(points: PeoplePoint[], heaviest: number, footprint: number, role: Role, piece: Piece): THREE.InstancedMesh {
    const geo = new THREE.BoxGeometry(footprint, 1, footprint);
    geo.translate(0, 0.5, 0);
    const mat = this.tint(new THREE.MeshStandardMaterial({ roughness: 0.55 }), role);
    this.disposables.push(geo, mat);
    const mesh = new THREE.InstancedMesh(geo, mat, points.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const m = new THREE.Matrix4();
    points.forEach((p, i) => {
      const pos = this.toWorld([p[0], p[1]], TOP);
      piece.positions.push(pos);
      piece.heights.push(Math.max(0.015, (p[2] / heaviest) * COLUMN_MAX));
      // Columns rise from the busiest outwards: big ones first.
      piece.delays.push((1 - Math.sqrt(p[2] / heaviest)) * 0.9 + Math.random() * 0.3);
      m.compose(pos, new THREE.Quaternion(), new THREE.Vector3(1, 0.0001, 1));
      mesh.setMatrixAt(i, m);
    });
    piece.group.add(mesh);
    return mesh;
  }

  private animateReveal(now: number) {
    if (this.revealStart === null) return;
    const t = (now - this.revealStart) / 1000;

    // Once the reveal has played, the camera is the player's: stop placing it (and
    // re-posing every column) each frame. Only the labels keep following the view.
    if (!this.revealDone) {
      // 0 - 1.2 s: the scissors snip along the line, leaving a slit; the dashes ahead remain.
      const travel = clamp01(t / T.travel);
      const at = this.cutFrom.clone().lerp(this.cutTo, travel);
      const lift = ease(window01(t, T.travel, 0.35));
      this.scissors.visible = !!this.cutSpan && t < T.travel + 0.35;
      this.scissors.position.copy(at).setY(TOP + 0.12 + lift * 1.4);
      this.scissors.scale.setScalar(SCISSORS_SIZE * (1 - lift * 0.6));
      const open = 0.5 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / SNIP_EVERY)) * (1 - lift);
      this.scissorHalves[0].rotation.y = open / 2;
      this.scissorHalves[1].rotation.y = -open / 2;
      if (this.cutSpan && t < T.split) {
        this.slit.visible = travel > 0.01;
        const a = this.cutFrom.clone().setY(TOP + 0.006);
        const b = at.clone().setY(TOP + 0.006);
        this.slit.position.copy(a).add(b).multiplyScalar(0.5);
        this.slit.rotation.set(0, -Math.atan2(b.z - a.z, b.x - a.x), 0);
        this.slit.scale.set(Math.max(a.distanceTo(b), 1e-4), 1, 0.03);
        this.layDashes(this.trail, at.clone().setY(TOP + 0.012), this.cutTo.clone().setY(TOP + 0.012), this.cutFrom, 0.05);
      } else {
        this.slit.visible = false;
        this.draftGroup.visible = false;
      }

      // 1.25 s: the slab becomes two pieces, which slide apart.
      const split = t >= T.split;
      if (this.slab) this.slab.visible = !split;
      const apart = ease(window01(t, T.split, 0.8));
      for (const piece of this.pieces) {
        piece.group.visible = split;
        piece.group.position.copy(piece.dir).multiplyScalar((SPLIT / 2) * apart);
      }
      // The camera swings round to a three-quarter view.
      const cam = easeInOut(window01(t, T.camera[0], T.camera[1]));
      this.setCamera({
        radius: THREE.MathUtils.lerp(this.cameraFrom.radius, this.revealView.radius, cam),
        polar: THREE.MathUtils.lerp(this.cameraFrom.polar, this.revealView.polar, cam),
        azimuth: THREE.MathUtils.lerp(this.cameraFrom.azimuth, this.revealView.azimuth, cam),
      });
      // The people rise.
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      for (const piece of this.pieces) {
        if (!piece.columns) continue;
        piece.positions.forEach((pos, i) => {
          const k = ease(window01(t, T.rise + piece.delays[i], 0.8));
          m.compose(pos, q, new THREE.Vector3(1, Math.max(0.0001, piece.heights[i] * k), 1));
          piece.columns!.setMatrixAt(i, m);
        });
        piece.columns.instanceMatrix.needsUpdate = true;
      }
    }
    // Each piece's share counts up above it.
    const count = ease(window01(t, T.count, 0.9));
    this.labels.forEach((el, i) => {
      const piece = this.pieces[i];
      if (!piece) return;
      const pos = piece.centre.clone().add(piece.group.position);
      pos.y = TOP + 0.5;
      const v = pos.project(this.camera);
      const r = this.renderer.domElement.getBoundingClientRect();
      el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px)`;
      el.style.opacity = String(count);
      el.textContent = `${(this.shares[i] * 100 * count).toFixed(1)}%`;
    });
    // Hand the camera to the player.
    if (t >= T.done && !this.revealDone) {
      this.revealDone = true;
      this.controls.enabled = true;
      this.controls.autoRotate = !this.reduced;
      this.onRevealDone?.();
    }
  }

  private clearReveal() {
    for (const piece of this.pieces) this.scene.remove(piece.group);
    this.pieces = [];
    if (this.perfect) this.scene.remove(this.perfect);
    if (this.arrow) this.scene.remove(this.arrow);
    this.perfect = null;
    this.arrow = null;
    this.perfectStart = null;
    this.perfectLabel.style.opacity = "0";
    this.scissors.visible = false;
    this.slit.visible = false;
    this.revealStart = null;
    this.controls.enabled = false;
    this.controls.autoRotate = false;
    for (const el of this.labels) el.style.opacity = "0";
    if (this.slab) this.slab.visible = true;
  }

  /** Called once, after the first frame that shows a country (the page then drops its
   *  loading state: the scene being created isn't the same as something on screen). */
  onShown: (() => void) | null = null;

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    if (document.hidden) return;
    const now = performance.now();
    if (this.phase === "draw" && this.round) this.driftCamera(now);
    this.animateReveal(now);
    this.animatePerfect(now);
    if (this.controls.enabled) this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.round && this.onShown) {
      const shown = this.onShown;
      this.onShown = null;
      shown();
    }
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.controls.dispose();
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss(); // browsers allow ~16 WebGL contexts; don't leak this one
    this.renderer.domElement.remove();
  }
}
