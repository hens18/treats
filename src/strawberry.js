// The hero's 3D strawberry, dipped in pink candy melt with a chocolate drizzle.
// Everything is built in code (no model file), so the bundle is the only download.
// Build: `npm run build:3d` writes site/assets/strawberry3d.js, which main.js imports once the page has loaded.
import {
  ACESFilmicToneMapping, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3,
  Color, DirectionalLight, DoubleSide, Group, HemisphereLight, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial,
  MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PMREMGenerator, Quaternion, Scene,
  SphereGeometry, SplineCurve, SRGBColorSpace, TubeGeometry, Vector2, Vector3, WebGLRenderer
} from "three";

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- The berry's silhouette: radius and height from the tip (t = 0) to the top center (t = 1) ---------- */
const PROFILE = new SplineCurve([
  [0.0, -1.12], [0.11, -1.07], [0.3, -0.84], [0.5, -0.5], [0.69, -0.12], [0.82, 0.22],
  [0.875, 0.42], [0.83, 0.57], [0.66, 0.68], [0.4, 0.72], [0.16, 0.68], [0.0, 0.645]
].map(([x, y]) => new Vector2(x, y)));
const SAMPLES = PROFILE.getSpacedPoints(400);

const profileAt = t => {
  const f = clamp(t, 0, 1) * (SAMPLES.length - 1);
  const i = Math.min(SAMPLES.length - 2, Math.floor(f));
  return SAMPLES[i].clone().lerp(SAMPLES[i + 1], f - i);
};

// Lumpy, slightly flattened, like a real berry rather than a lathe-turned one.
const lump = (t, a) => 1 + (0.035 * Math.sin(3 * a + 1.3) + 0.022 * Math.sin(5 * a + 0.4 + 2.2 * t) + 0.012 * Math.sin(8 * a + 3 * t)) * smooth(0.02, 0.2, t);

const bodyAt = (t, a, out = new Vector3()) => {
  const p = profileAt(t);
  const r = p.x * lump(t, a);
  return out.set(Math.cos(a) * r, p.y, Math.sin(a) * r * 0.93);
};

const normalAt = (t, a, out = new Vector3()) => {
  const e = 0.002;
  const p0 = bodyAt(t, a), pt = bodyAt(clamp(t + e, 0, 1), a).sub(bodyAt(clamp(t - e, 0, 1), a));
  const pa = bodyAt(t, a + e).sub(bodyAt(t, a - e));
  out.crossVectors(pt, pa).normalize();
  if (out.dot(p0.setY(0)) < 0 && p0.lengthSq() > 1e-6) out.negate();
  return out;
};

// t where the side of the berry reaches height y (the side is monotonic up to the shoulder).
const tAtY = y => {
  let lo = 0, hi = 0.72;
  for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; profileAt(m).y < y ? (lo = m) : (hi = m); }
  return (lo + hi) / 2;
};

/* ---------- A grid surface (rows along t, columns around the berry) with a welded seam ---------- */
function gridSurface(rows, cols, at) {
  const pos = new Float32Array((rows + 1) * (cols + 1) * 3);
  const idx = [];
  const p = new Vector3();
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= cols; j++) {
      at(i / rows, (j % cols) / cols * TAU, j / cols, p);
      pos.set([p.x, p.y, p.z], (i * (cols + 1) + j) * 3);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j, b = a + cols + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Average normals across the seam so it doesn't show as a line.
  const n = g.attributes.normal;
  for (let i = 0; i <= rows; i++) {
    const a = i * (cols + 1), b = a + cols;
    const x = (n.getX(a) + n.getX(b)) / 2, y = (n.getY(a) + n.getY(b)) / 2, z = (n.getZ(a) + n.getZ(b)) / 2;
    const l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l);
    n.setXYZ(b, x / l, y / l, z / l);
  }
  return g;
}

/* ---------- Seeds: staggered rows, denser where the berry is wider ---------- */
function seedLayout(fromT, toT) {
  const seeds = [];
  const rows = 12;
  for (let k = 0; k < rows; k++) {
    const t = fromT + (toT - fromT) * (k + 0.5) / rows;
    const r = profileAt(t).x;
    const count = Math.max(5, Math.round(r * 23));
    for (let s = 0; s < count; s++) {
      const a = (s + (k % 2) * 0.5) / count * TAU + Math.sin(k * 3.7 + s) * 0.05;
      seeds.push([t + Math.sin(s * 2.3 + k) * 0.004, a]);
    }
  }
  return seeds;
}

/* ---------- A soft studio to reflect in the glaze (no HDR file to download) ---------- */
function studio(renderer) {
  const env = new Scene();
  const room = new Mesh(new BoxGeometry(10, 10, 10), new MeshBasicMaterial({ color: new Color(0.42, 0.36, 0.38), side: BackSide }));
  env.add(room);
  const panel = (w, h, color, k, x, y, z) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(k), side: DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(6, 2.2, "#ffffff", 5.5, 0, 4.9, 0.6);      // overhead softbox
  panel(2.2, 4.2, "#fff4ec", 4.2, -4.9, 1.2, 1.6); // key, left
  panel(1.8, 4, "#ff9cc6", 3.2, 4.9, 0.4, 0.8);     // pink fill, right
  panel(4, 1.4, "#ffe0c2", 2.6, 0, 1.5, -4.9);      // warm rim, behind
  const pm = new PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.035).texture;
  pm.dispose();
  return tex;
}

function contactShadow() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(92,30,44,.42)");
  grad.addColorStop(0.5, "rgba(92,30,44,.16)");
  grad.addColorStop(1, "rgba(92,30,44,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const m = new Mesh(new PlaneGeometry(2.6, 1.3), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

/* ---------- Build the berry ---------- */
function buildBerry() {
  const berry = new Group();
  const ROWS = 200, COLS = 240;

  // Where the dip ends: a wavy line a little below the berry's widest point.
  const dipY = a => -0.06 + 0.05 * Math.sin(2 * a + 0.6) + 0.03 * Math.sin(5 * a + 1.9) + 0.012 * Math.sin(11 * a);
  const dipT = a => tAtY(dipY(a));

  const seeds = seedLayout(tAtY(0.06), 0.8).filter(([t, a]) => t > dipT(a) + 0.03);

  // Body, with a dimple and a darker ring where each seed sits.
  const body = gridSurface(ROWS, COLS, (u, a, _v, out) => bodyAt(u, a, out));
  const pos = body.attributes.position, nrm = body.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const red = new Color("#c8132f"), deep = new Color("#8f0b20"), blush = new Color("#ea5a4c"), pale = new Color("#f2b48e");
  const dim = new Float32Array(pos.count);
  const seedR = 0.034;
  for (const [st, sa] of seeds) {
    const ci = Math.round(st * ROWS), cj = Math.round(sa / TAU * COLS);
    const sp = bodyAt(st, sa);
    for (let i = ci - 5; i <= ci + 5; i++) {
      if (i < 0 || i > ROWS) continue;
      for (let jj = cj - 7; jj <= cj + 7; jj++) {
        const j = ((jj % COLS) + COLS) % COLS;
        for (const col of j === 0 ? [0, COLS] : [j]) {
          const k = i * (COLS + 1) + col;
          const d = Math.hypot(pos.getX(k) - sp.x, pos.getY(k) - sp.y, pos.getZ(k) - sp.z);
          if (d < seedR) dim[k] = Math.max(dim[k], 1 - (d / seedR) ** 2);
        }
      }
    }
  }
  const c = new Color();
  for (let k = 0; k < pos.count; k++) {
    const y = pos.getY(k);
    c.copy(red).lerp(blush, smooth(0.3, 0.6, y) * 0.55).lerp(pale, smooth(0.6, 0.71, y) * 0.5).lerp(deep, dim[k] * 0.7);
    colors.set([c.r, c.g, c.b], k * 3);
    const s = dim[k] * 0.016;
    pos.setXYZ(k, pos.getX(k) - nrm.getX(k) * s, pos.getY(k) - nrm.getY(k) * s, pos.getZ(k) - nrm.getZ(k) * s);
  }
  body.setAttribute("color", new BufferAttribute(colors, 3));
  body.computeVertexNormals();
  berry.add(new Mesh(body, new MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.22, sheen: 0.3, sheenColor: new Color("#ff8a8a")
  })));

  // Seeds, half sunk in their dimples.
  const seedGeo = new SphereGeometry(0.0175, 10, 8);
  seedGeo.scale(0.8, 1.55, 0.7);
  const seedMesh = new InstancedMesh(seedGeo, new MeshStandardMaterial({ color: "#e9c35c", roughness: 0.4, metalness: 0.05 }), seeds.length);
  const m = new Matrix4(), q = new Quaternion(), up = new Vector3(), nn = new Vector3(), tan = new Vector3(), side = new Vector3(), basis = new Matrix4();
  seeds.forEach(([t, a], i) => {
    const p = bodyAt(t, a);
    normalAt(t, a, nn);
    tan.copy(bodyAt(t + 0.004, a)).sub(bodyAt(t - 0.004, a)).normalize();
    side.crossVectors(tan, nn).normalize();
    up.crossVectors(nn, side).normalize();
    basis.makeBasis(side, up, nn);
    q.setFromRotationMatrix(basis);
    p.addScaledVector(nn, -0.002);
    m.compose(p, q, new Vector3(1, 1, 1));
    seedMesh.setMatrixAt(i, m);
  });
  berry.add(seedMesh);

  // The dip: a shell over the lower berry, thick enough to read, with a rounded lip and a bead at the tip.
  const TH = 0.04;
  const dip = gridSurface(140, COLS, (u, a, _v, out) => {
    const t = u * dipT(a);
    bodyAt(t, a, out);
    const n = normalAt(t, a, nn);
    const lip = 1 - smooth(0.9, 1, u);
    const bead = 0.05 * (1 - smooth(0, 0.07, t));
    out.addScaledVector(n, TH * (0.15 + 0.85 * Math.sqrt(lip)) + bead - (u === 1 ? 0.012 : 0));
    out.y -= bead * 0.6;
    return out;
  });
  berry.add(new Mesh(dip, new MeshPhysicalMaterial({ color: "#f48fbb", roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04 })));

  // Chocolate drizzle, zig-zagging around the dip.
  const drizzleMat = new MeshPhysicalMaterial({ color: "#4a1f0e", roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
  const drizzle = (y0, amp, waves, phase) => {
    const pts = [];
    for (let s = 0; s < 360; s++) {
      const a = s / 360 * TAU;
      const y = Math.min(dipY(a) - 0.07, y0 + amp * Math.sin(waves * a + phase));
      const t = tAtY(y);
      const p = bodyAt(t, a);
      p.addScaledVector(normalAt(t, a, nn), TH + 0.016);
      pts.push(p);
    }
    berry.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(pts, true), 720, 0.019, 8, true), drizzleMat));
  };
  drizzle(-0.28, 0.2, 7, 0.4);
  drizzle(-0.66, 0.16, 6, 2.1);

  // Strawberry crunch crumbs pressed into the lower dip.
  const crumbGeo = new IcosahedronGeometry(0.03, 0);
  const crumbs = new InstancedMesh(crumbGeo, new MeshStandardMaterial({ roughness: 0.85 }), 70);
  const tints = ["#fff3f2", "#f7a3bb", "#e5546b", "#fde2c8"].map(h => new Color(h));
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) {
    const a = rnd() * TAU, t = 0.05 + rnd() ** 1.4 * 0.22;
    const p = bodyAt(t, a).addScaledVector(normalAt(t, a, nn), TH + 0.01);
    q.setFromAxisAngle(new Vector3(rnd(), rnd(), rnd()).normalize(), rnd() * TAU);
    const k = 0.55 + rnd() * 0.9;
    m.compose(p, q, new Vector3(k, k * (0.6 + rnd() * 0.6), k));
    crumbs.setMatrixAt(i, m);
    crumbs.setColorAt(i, tints[i % tints.length]);
  }
  berry.add(crumbs);

  // Calyx: sepals radiating from the top and drooping over the shoulders, and a short stem.
  const leafMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: DoubleSide });
  const dark = new Color("#2d6b2c"), light = new Color("#6fb24a");
  const N = 9;
  for (let s = 0; s < N; s++) {
    const phi = s / N * TAU + Math.sin(s * 1.7) * 0.12;
    const L = 0.92 + 0.14 * Math.sin(s * 2.9);
    const W = 0.16 + 0.03 * Math.cos(s * 1.3);
    const U = 14, V = 6;
    const lp = new Float32Array((U + 1) * (V + 1) * 3), lc = new Float32Array((U + 1) * (V + 1) * 3);
    const dir = new Vector3(Math.cos(phi), 0, Math.sin(phi) * 0.93), across = new Vector3(-Math.sin(phi), 0, Math.cos(phi));
    for (let i = 0; i <= U; i++) {
      const u = i / U;
      const w = W * Math.sin(Math.PI * Math.pow(u, 0.62)) * (u < 0.08 ? u / 0.08 * 0.6 + 0.4 : 1);
      const d = 0.05 + u * L;
      const h = 0.725 + 0.1 * Math.sin(Math.PI * u * 0.8) - 0.36 * Math.pow(u, 2.4) + 0.03 * Math.sin(s * 4.1) * u;
      for (let j = 0; j <= V; j++) {
        const v = j / V * 2 - 1;
        const k = (i * (V + 1) + j) * 3;
        const p = dir.clone().multiplyScalar(d).addScaledVector(across, v * w);
        p.y = h + 0.05 * v * v * (0.3 + u) + 0.02 * Math.sin(u * 9 + s) * v;
        lp.set([p.x, p.y, p.z], k);
        const cc = dark.clone().lerp(light, u * 0.8 + Math.abs(v) * 0.15);
        lc.set([cc.r, cc.g, cc.b], k);
      }
    }
    const li = [];
    for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) {
      const a = i * (V + 1) + j, b = a + V + 1;
      li.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(lp, 3));
    g.setAttribute("color", new BufferAttribute(lc, 3));
    g.setIndex(li);
    g.computeVertexNormals();
    berry.add(new Mesh(g, leafMat));
  }
  const stem = new TubeGeometry(new CatmullRomCurve3([
    new Vector3(0, 0.66, 0), new Vector3(0.015, 0.8, 0.01), new Vector3(0.05, 0.93, 0.03), new Vector3(0.1, 1.0, 0.05)
  ]), 24, 0.038, 10, false);
  berry.add(new Mesh(stem, new MeshStandardMaterial({ color: "#4e8a36", roughness: 0.6 })));
  const cap = new Mesh(new SphereGeometry(0.038, 12, 8), new MeshStandardMaterial({ color: "#5f9a40", roughness: 0.6 }));
  cap.position.set(0.1, 1.0, 0.05);
  berry.add(cap);

  return berry;
}

/* ---------- Mount into the hero ---------- */
export function mount(host, opts = {}) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: !!opts.snapshot });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  scene.environment = studio(renderer);
  scene.environmentIntensity = 0.9;
  const key = new DirectionalLight("#ffffff", 2);
  key.position.set(-2.5, 3.5, 3);
  scene.add(key, new HemisphereLight("#fff3f6", "#7a3b4a", 0.5));

  const camera = new PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0.9, 6.3);
  camera.lookAt(0, -0.05, 0);

  const stage = new Group();       // bob and pointer tilt
  const spin = new Group();        // turntable
  const berry = buildBerry();
  berry.rotation.z = -0.22;
  berry.rotation.x = 0.1;
  spin.add(berry);
  stage.add(spin);
  scene.add(stage);
  const shadow = contactShadow();
  shadow.position.y = -1.32;
  scene.add(shadow);

  const canvas = renderer.domElement;
  canvas.className = "berry3d__canvas";
  canvas.setAttribute("aria-hidden", "true"); // the host carries the description
  host.append(canvas);

  const size = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  size();
  const ro = new ResizeObserver(size);
  ro.observe(host);

  /* Motion: a slow turn and bob; drag spins it with a little momentum; the pointer tips it toward you. */
  const AUTO = 0.45;
  let vel = AUTO, tiltX = 0, tiltTarget = 0, leanTarget = 0, lean = 0, drag = null, raf = 0, last = performance.now(), t0 = last, visible = true;

  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const still = reduced.matches;
    if (!drag) {
      vel += ((still ? 0 : AUTO) - vel) * (1 - Math.exp(-dt * 1.6));
      tiltTarget *= Math.exp(-dt * 2);
    }
    spin.rotation.y += vel * dt;
    tiltX += (tiltTarget - tiltX) * (1 - Math.exp(-dt * 6));
    lean += (leanTarget - lean) * (1 - Math.exp(-dt * 4));
    stage.rotation.x = tiltX;
    stage.rotation.z = lean;
    stage.position.y = still ? 0 : Math.sin((now - t0) / 1000 * 1.3) * 0.045;
    shadow.scale.setScalar(1 - stage.position.y * 0.8);
    renderer.render(scene, camera);
    if (!host.classList.contains("is-live")) host.classList.add("is-live");
    const settled = still && !drag && Math.abs(vel) < 0.002 && Math.abs(tiltTarget - tiltX) < 0.001 && Math.abs(leanTarget - lean) < 0.001;
    raf = visible && !document.hidden && !settled ? requestAnimationFrame(frame) : 0;
  };
  const wake = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  canvas.addEventListener("pointerdown", e => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, lt: e.timeStamp, moved: false };
    wake();
  });
  canvas.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    if (e.pointerType === "mouse" && !drag) {
      leanTarget = -((e.clientX - r.left) / r.width - 0.5) * 0.18;
      tiltTarget = ((e.clientY - r.top) / r.height - 0.5) * 0.22;
      wake();
    }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // a vertical swipe scrolls the page
      if (Math.abs(dx) < 6) return;
      drag.moved = true;
      try { canvas.setPointerCapture(drag.id); } catch (_) {}
      host.classList.add("is-dragging");
    }
    const dtm = Math.max(1, e.timeStamp - drag.lt);
    const step = (e.clientX - drag.lx) / r.width * Math.PI * 1.6;
    spin.rotation.y += step;
    vel = 0.7 * (step / dtm * 1000) + 0.3 * vel;
    tiltTarget = clamp(dy / r.height * 0.8, -0.35, 0.35);
    drag.lx = e.clientX;
    drag.lt = e.timeStamp;
  });
  const end = e => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    vel = clamp(vel, -9, 9);
    drag = null;
    host.classList.remove("is-dragging");
    wake();
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { leanTarget = 0; if (!drag) tiltTarget = 0; wake(); } });

  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; wake(); });
  io.observe(host);
  document.addEventListener("visibilitychange", wake);
  reduced.addEventListener("change", wake);

  renderer.render(scene, camera);
  wake();

  return {
    snapshot: () => { renderer.render(scene, camera); return canvas.toDataURL("image/png"); },
    setTurn: a => { spin.rotation.y = a; vel = 0; },
    destroy: () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); renderer.dispose(); canvas.remove(); }
  };
}
