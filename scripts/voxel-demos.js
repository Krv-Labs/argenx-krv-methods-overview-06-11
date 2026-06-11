import { Heerich } from "https://cdn.jsdelivr.net/npm/heerich@0.14.0/+esm";
import { clamp, easeInOut, easeOut, lerp, mulberry32, reducedMotion } from "./utils.js";

const REDUCED = reducedMotion();
const W = 12;
const H = 9;
const D = 12;
const KEEP = { x: [5, 7], y: [3, 5], z: [5, 7] };
const CUT_T = { x: [5, 4], y: [3, 3], z: [5, 4] };
const LOST_CELLS = [[4, 4, 6], [8, 3, 5], [6, 2, 6], [5, 6, 5], [8, 5, 7], [6, 4, 4], [7, 3, 8]];

const TRUE_ROLES = [];
const TRUE_CELLS = (() => {
  const cells = [];
  const seen = new Set();
  const put = (rawX, rawY, rawZ, role) => {
    const x = Math.round(rawX);
    const y = Math.round(rawY);
    const z = Math.round(rawZ);
    if (x < 0 || x >= W || y < 0 || y >= H || z < 0 || z >= D) return;
    const key = `${x},${y},${z}`;
    if (!seen.has(key)) {
      seen.add(key);
      cells.push([x, y, z]);
      TRUE_ROLES.push(role);
    }
  };
  for (let x = 5; x <= 7; x++) {
    for (let y = 3; y <= 5; y++) {
      for (let z = 5; z <= 7; z++) {
        if (Math.abs(x - 6) + Math.abs(y - 4) + Math.abs(z - 6) <= 2) put(x, y, z, "core");
      }
    }
  }
  for (let t = 0; t <= 7; t++) put(7 + t * 0.65, 4 + t * 0.3, 7 + t * 0.6, "flare");
  [[2, 6, 3], [3, 6, 3], [2, 5, 3], [2, 6, 4], [3, 5, 2]].forEach((p) => put(...p, "satellite"));
  [[10, 2, 2], [1, 2, 9], [9, 7, 10]].forEach((p) => put(...p, "outlier"));
  return cells;
})();
const TRUE_SET = new Set(TRUE_CELLS.map((cell) => cell.join(",")));

function blockDims(s) {
  const bw = Math.round(lerp(0, W, s));
  const bh = Math.round(lerp(0, H, s));
  const bd = Math.round(lerp(0, D, s));
  const x0 = clamp(6 - Math.floor(bw / 2), 0, W - bw);
  const y0 = clamp(4 - Math.floor(bh / 2), 0, H - bh);
  const z0 = clamp(6 - Math.floor(bd / 2), 0, D - bd);
  return { x0, y0, z0, bw, bh, bd };
}

function blockStats(s) {
  const d = blockDims(s);
  const inside = ([x, y, z]) => x >= d.x0 && x < d.x0 + d.bw && y >= d.y0 && y < d.y0 + d.bh && z >= d.z0 && z < d.z0 + d.bd;
  const captured = TRUE_CELLS.filter(inside).length;
  const missed = (TRUE_CELLS.length - captured) * 7;
  const hours = Math.round((d.bw * d.bh * d.bd - captured) * 0.1);
  return { ...d, captured, missed, hours, cost: missed * 1.5 + hours };
}

const edgeCells = (lo, hi) => (x, y, z) => {
  const edge = (v, a, b) => (v === a || v === b ? 1 : 0);
  return edge(x, lo[0], hi[0]) + edge(y, lo[1], hi[1]) + edge(z, lo[2], hi[2]) >= 2;
};
const CAGE_TEST = edgeCells([0, 0, 0], [W - 1, H - 1, D - 1]);
const OPT_S = (() => {
  let best = 0;
  let bestCost = Infinity;
  for (let i = 0; i <= 80; i++) {
    const cost = blockStats(i / 80).cost;
    if (cost < bestCost) {
      bestCost = cost;
      best = i / 80;
    }
  }
  return best;
})();
const PARTIALS = (() => {
  const random = mulberry32(777);
  const out = [];
  while (out.length < 26) {
    const x = Math.floor(random() * W);
    const y = Math.floor(random() * H);
    const z = Math.floor(random() * D);
    if (TRUE_SET.has(`${x},${y},${z}`) || CAGE_TEST(x, y, z)) continue;
    if (out.some((q) => q[0] === x && q[1] === y && q[2] === z)) continue;
    out.push([x, y, z]);
  }
  return out;
})();

function applyBaseBlock(h, cuts = { x: 0, y: 0, z: 0 }, heat = { x: 0, y: 0, z: 0 }) {
  const slab = (ax) => [Math.round(cuts[ax] * CUT_T[ax][0]), Math.round(cuts[ax] * CUT_T[ax][1])];
  const [lx, rx] = slab("x");
  const [ly, ry] = slab("y");
  const [lz, rz] = slab("z");

  h.applyGeometry({
    type: "box",
    position: [0, 0, 0],
    size: [W, H, D],
    meta: { id: "pool" },
    style: {
      default: (x, y, z) => {
        let hot = 0;
        if (heat.x > 0 && ((lx > 0 && x === lx) || (rx > 0 && x === W - 1 - rx))) hot = heat.x;
        if (heat.y > 0 && ((ly > 0 && y === ly) || (ry > 0 && y === H - 1 - ry))) hot = Math.max(hot, heat.y);
        if (heat.z > 0 && ((lz > 0 && z === lz) || (rz > 0 && z === D - 1 - rz))) hot = Math.max(hot, heat.z);
        if (hot > 0.02) {
          return { fill: `oklch(${0.72 - 0.1 * hot} ${0.05 + 0.16 * hot} 22)`, stroke: "oklch(0.48 0.14 22)", strokeWidth: 0.7 };
        }
        const l = 0.85 + (y / H) * 0.05 + (((x + z) & 1) ? 0.008 : 0);
        return { fill: `oklch(${l} 0.006 250)`, stroke: `oklch(${l * 0.5} 0.012 250)`, strokeWidth: 0.7 };
      },
    },
  });

  if (lx) h.removeGeometry({ type: "box", position: [0, 0, 0], size: [lx, H, D] });
  if (rx) h.removeGeometry({ type: "box", position: [W - rx, 0, 0], size: [rx, H, D] });
  if (ly) h.removeGeometry({ type: "box", position: [0, 0, 0], size: [W, ly, D] });
  if (ry) h.removeGeometry({ type: "box", position: [0, H - ry, 0], size: [W, ry, D] });
  if (lz) h.removeGeometry({ type: "box", position: [0, 0, 0], size: [W, H, lz] });
  if (rz) h.removeGeometry({ type: "box", position: [0, 0, D - rz], size: [W, H, rz] });
}

function applyGhostLoss(h) {
  const isCore = (x, y, z) => x >= KEEP.x[0] && x <= KEEP.x[1] && y >= KEEP.y[0] && y <= KEEP.y[1] && z >= KEEP.z[0] && z <= KEEP.z[1];
  const isLost = (x, y, z) => LOST_CELLS.some((p) => p[0] === x && p[1] === y && p[2] === z);
  h.applyGeometry({
    type: "fill",
    bounds: [[KEEP.x[0] - 1, KEEP.y[0] - 1, KEEP.z[0] - 1], [KEEP.x[1] + 2, KEEP.y[1] + 2, KEEP.z[1] + 2]],
    test: (x, y, z) => !isCore(x, y, z) && !isLost(x, y, z),
    opaque: false,
    meta: { id: "ghost" },
    style: { default: { fill: "none", stroke: "rgba(217,38,66,0.30)", strokeWidth: 0.5, strokeDasharray: "2.5 3" } },
  });
  for (const p of LOST_CELLS) {
    h.applyGeometry({
      type: "box",
      position: p,
      size: 1,
      opaque: false,
      meta: { id: "lost" },
      style: {
        default: { fill: "rgba(217,38,66,0.18)", stroke: "#d92642", strokeWidth: 0.9 },
        top: { fill: "rgba(217,38,66,0.26)", hatch: { angle: 45, period: 4, stroke: "#d92642", strokeWidth: 0.45 } },
      },
    });
  }
}

function buildCurveSvg(statsName, pointsA, pointsB, pointsTotal, activeIndex) {
  const max = Math.max(...pointsTotal, ...pointsA, ...pointsB, 1);
  const path = (arr) =>
    arr.map((value, i) => `${i ? "L" : "M"}${((i / (arr.length - 1)) * 300).toFixed(1)} ${(78 - (value / max) * 64).toFixed(1)}`).join(" ");
  const x = (activeIndex / (pointsTotal.length - 1)) * 300;
  const y = 78 - (pointsTotal[activeIndex] / max) * 64;
  return `
    <svg viewBox="0 0 300 96" preserveAspectRatio="none" aria-label="${statsName} curve">
      <line x1="0" y1="78" x2="300" y2="78" stroke="rgba(32,35,51,.22)" stroke-width="1"/>
      <path d="${path(pointsA)}" fill="none" stroke="#d92642" stroke-width="1.4" opacity=".55"/>
      <path d="${path(pointsB)}" fill="none" stroke="#4d5a72" stroke-width="1.4" opacity=".55"/>
      <path d="${path(pointsTotal)}" fill="none" stroke="#202333" stroke-width="1.8"/>
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="#202333"/>
    </svg>`;
}

function buildCaptureCurveSvg(ins, outs, activeIndex) {
  const max = Math.max(...ins, ...outs, 1);
  const path = (arr) =>
    arr.map((value, i) => `${i ? "L" : "M"}${((i / (arr.length - 1)) * 300).toFixed(1)} ${(78 - (value / max) * 64).toFixed(1)}`).join(" ");
  const x = (activeIndex / (ins.length - 1)) * 300;
  const y_in = 78 - (ins[activeIndex] / max) * 64;
  const y_out = 78 - (outs[activeIndex] / max) * 64;
  return `
    <svg viewBox="0 0 300 96" preserveAspectRatio="none" aria-label="Filter capture curve">
      <line x1="0" y1="78" x2="300" y2="78" stroke="rgba(32,35,51,.22)" stroke-width="1"/>
      <path d="${path(ins)}" fill="none" stroke="rgba(13,126,143,0.92)" stroke-width="2"/>
      <path d="${path(outs)}" fill="none" stroke="rgb(110, 114, 110)" stroke-width="1.8"/>
      <circle cx="${x.toFixed(1)}" cy="${y_in.toFixed(1)}" r="3.5" fill="rgba(13,126,143,0.92)"/>
      <circle cx="${x.toFixed(1)}" cy="${y_out.toFixed(1)}" r="3.5" fill="rgb(110, 114, 110)"/>
    </svg>`;
}

export class CubeThresholdDemo {
  static id = "cube-growth";
  static title = "Cube growth and shrink";
  static kicker = "Rigid filters";
  static summary = "Tune the threshold block and watch the tradeoff between missed candidates and review burden.";
  static thumb = "thumb-grid";

  constructor(api) {
    this.api = api;
    this.stepIndex = 0;
    this.s = 0.0;
    this.h = new Heerich({ camera: { type: "isometric" }, gap: 0.07 });
  }

  mount(stageHost, controlsHost) {
    this.host = document.createElement("div");
    this.host.className = "graphic-host graphic-host--bob";
    stageHost.replaceChildren(this.host);

    this.range = document.createElement("input");
    this.range.type = "range";
    this.range.min = "0";
    this.range.max = "100";
    this.range.value = String(Math.round(this.s * 100));
    this.range.className = "range";
    this.range.addEventListener("input", () => {
      this.s = Number(this.range.value) / 100;
      this.stepIndex = 2;
      this.render();
    });
    controlsHost.replaceChildren(this.controlGroup());
    this.render();
  }

  controlGroup() {
    const group = document.createElement("div");
    group.className = "control-group";
    group.innerHTML = `
      <div class="control-row">
        <span class="control-label">Block size</span>
        <span id="cubeSizeValue" class="control-value">50%</span>
      </div>`;
    group.appendChild(this.range);
    const curve = document.createElement("div");
    curve.id = "cubeCurve";
    group.appendChild(curve);

    const tagline = document.createElement("p");
    tagline.style.cssText = "margin-top: 16px; font-size: 11px; color: var(--muted); text-align: center; font-style: italic;";
    tagline.textContent = "Whatever you choose, you lose.";
    group.appendChild(tagline);

    return group;
  }

  step(delta) {
    this.stepIndex = clamp(this.stepIndex + delta, 0, 2);
    this.render();
  }

  canStep(delta) {
    return this.stepIndex + delta >= 0 && this.stepIndex + delta <= 2;
  }

  get stepName() {
    return ["Raw block", "Sequential cuts", "Tune block"][this.stepIndex];
  }

  updateCopy(extraMetrics = {}) {
    const st = blockStats(this.s);
    
    let metrics;
    if (this.stepIndex === 2) {
      const d = blockDims(this.s);
      const inside = ([x, y, z]) => this.s > 0 && x >= d.x0 && x < d.x0 + d.bw && y >= d.y0 && y < d.y0 + d.bh && z >= d.z0 && z < d.z0 + d.bd;
      const captured_in = TRUE_CELLS.filter(inside).length;
      const real_out = PARTIALS.filter(inside).length;
      const captured_out = Math.round(real_out * 1.8);
      metrics = [
        ["Target Captured", String(captured_in)],
        ["Non-Target Captured", String(captured_out)],
        ["Targets Missed", String(TRUE_CELLS.length - captured_in)],
        ["Total Targets", String(TRUE_CELLS.length)],
      ];
    } else {
      metrics = [
        ["Missed", String(st.missed)],
        ["Review hrs", String(st.hours)],
        ["Captured cells", String(st.captured)],
        ["Block cells", String(st.bw * st.bh * st.bd)],
        ...Object.entries(extraMetrics),
      ];
    }

    this.api.updateDetails({
      kicker: "Rigid filters",
      title: ["Start with every candidate.", "Filters carve the cube.", "Why Filters Fail"][this.stepIndex],
      body: [
        "The EHR pool begins as one undifferentiated block. No patient-level shape has been used.",
        "Each threshold removes a slab before anyone can inspect whether the excluded patients belonged.",
        "A tight filter misses valid candidates. A loose filter creates overwhelming review burden. Adjust the slider to choose which failure mode dominates.",
      ][this.stepIndex],
      metrics,
      modeLabel: "Cube threshold",
      stepLabel: this.stepName,
    });
  }

  render(params = {}) {
    const cuts = params.cuts || (this.stepIndex >= 1 ? { x: 1, y: 1, z: 1 } : { x: 0, y: 0, z: 0 });
    const heat = params.heat || { x: 0, y: 0, z: 0 };
    this.h.clear();

    // Anchor bounds with invisible boxes to lock camera view extents
    this.h.applyGeometry({
      type: "box",
      position: [0, 0, 0],
      size: 1,
      opaque: false,
      style: { default: { fill: "none", stroke: "none" } }
    });
    this.h.applyGeometry({
      type: "box",
      position: [W - 1, H - 1, D - 1],
      size: 1,
      opaque: false,
      style: { default: { fill: "none", stroke: "none" } }
    });

    // Mirror fill-cage geometry for identical viewBox matching
    this.h.applyGeometry({
      type: "fill",
      bounds: [[0, 0, 0], [W, H, D]],
      test: (x, y, z) => CAGE_TEST(x, y, z),
      opaque: false,
      meta: { id: "cage" },
      style: { default: { fill: "none", stroke: "none" } },
    });

    if (this.stepIndex === 2 || params.slider) {
      this.applySliderBlock(params.s ?? this.s);
    } else {
      applyBaseBlock(this.h, cuts, heat);
      if (this.stepIndex === 1 && !params.cuts) applyGhostLoss(this.h);
    }

    this.host.innerHTML = this.h.toSVG({ padding: 46 });
    const st = blockStats(this.s);
    const sizeValue = document.querySelector("#cubeSizeValue");
    if (sizeValue) sizeValue.textContent = `${Math.round(this.s * 100)}%`;
    this.updateCurve();
    this.updateCopy(params.liveMetrics);
    return this.getSvg();
  }

  applySliderBlock(s) {
    const d = blockDims(s);
    const inside = (x, y, z) => s > 0 && x >= d.x0 && x < d.x0 + d.bw && y >= d.y0 && y < d.y0 + d.bh && z >= d.z0 && z < d.z0 + d.bd;

    // 1. Draw the completely opaque filter box
    if (s > 0) {
      this.h.applyGeometry({
        type: "box",
        position: [d.x0, d.y0, d.z0],
        size: [d.bw, d.bh, d.bd],
        opaque: true,
        meta: { id: "filter-cage" },
        style: {
          default: { fill: "rgba(217, 38, 66, 1.000)", stroke: "#820a1a", strokeWidth: 0.6 }
        }
      });
    }

    // 2. Draw IN Patients (Consensus cells)
    for (let i = 0; i < TRUE_CELLS.length; i++) {
      const [x, y, z] = TRUE_CELLS[i];
      const role = TRUE_ROLES[i];
      const strong = role === "core";
      const isInside = inside(x, y, z);
      
      const activeColor = strong ? "rgba(13,126,143,0.92)" : "rgba(13,126,143,0.66)";
      const isBlue = !isInside;

      const fill = isBlue ? activeColor : "rgba(215, 217, 218, 1.000)";
      const stroke = isBlue ? "#0a5f6d" : "rgb(110, 114, 110)";

      const style = {
        default: { fill, stroke, strokeWidth: 0.8 },
        top: { fill, hatch: { angle: 45, period: 3.6, stroke: isBlue ? "#f4f1e9" : "#d8dbda", strokeWidth: 0.5 } },
      };
      if (strong) {
        style.left = { fill, hatch: { angle: 135, period: 3.6, stroke: isBlue ? "#f4f1e9" : "#d8dbda", strokeWidth: 0.5 } };
      }
      this.h.applyGeometry({ type: "box", position: [x, y, z], size: 1, meta: { id: "in-patient" }, style });
    }

    // 3. Draw OUT Patients (Partials/shimmers)
    for (const q of PARTIALS) {
      const [x, y, z] = q;
      // OUT patients always stay gray! Both inside and outside the filter box!
      const fill = "rgba(215, 217, 218, 1.000)";
      const stroke = "rgb(110, 114, 110)";

      const style = {
        default: { fill, stroke, strokeWidth: 0.8 },
        top: { fill, hatch: { angle: 45, period: 3.6, stroke: "#d8dbda", strokeWidth: 0.5 } },
        left: { fill, hatch: { angle: 135, period: 3.6, stroke: "#d8dbda", strokeWidth: 0.5 } },
      };
      this.h.applyGeometry({ type: "box", position: [x, y, z], size: 1, meta: { id: "out-patient" }, style });
    }
  }

  updateCurve() {
    const curve = document.querySelector("#cubeCurve");
    if (!curve) return;

    if (this.stepIndex === 2) {
      const ins = [];
      const outs = [];
      for (let i = 0; i < 81; i++) {
        const d = blockDims(i / 80);
        const inside = ([x, y, z]) => i > 0 && x >= d.x0 && x < d.x0 + d.bw && y >= d.y0 && y < d.y0 + d.bh && z >= d.z0 && z < d.z0 + d.bd;
        const real_out = PARTIALS.filter(inside).length;
        ins.push(TRUE_CELLS.filter(inside).length);
        outs.push(Math.round(real_out * 1.8));
      }
      curve.innerHTML = buildCaptureCurveSvg(ins, outs, Math.round(this.s * 80));
    } else {
      const misses = [];
      const hours = [];
      const totals = [];
      for (let i = 0; i < 81; i++) {
        const stats = blockStats(i / 80);
        misses.push(stats.missed * 1.5);
        hours.push(stats.hours);
        totals.push(stats.cost);
      }
      curve.innerHTML = buildCurveSvg("Cube cost", misses, hours, totals, Math.round(this.s * 80));
    }
  }

  async play() {
    const start = performance.now();
    const duration = REDUCED ? 40 : 2200;
    this.stepIndex = 1;
    const tick = (now) => {
      const elapsed = now - start;
      const axes = ["x", "y", "z"];
      const cuts = { x: 0, y: 0, z: 0 };
      const heat = { x: 0, y: 0, z: 0 };
      axes.forEach((axis, index) => {
        const t = clamp((elapsed - index * 520) / 760, 0, 1);
        cuts[axis] = easeInOut(t);
        heat[axis] = t > 0 && t < 1 ? 1 : 0;
      });
      this.render({ cuts, heat, liveMetrics: { Cutting: axes.find((axis) => heat[axis]) || "done" } });
      if (elapsed < duration) requestAnimationFrame(tick);
      else {
        applyGhostLoss(this.h);
        this.render();
      }
    };
    requestAnimationFrame(tick);
  }

  async renderFrame(t, duration) {
    const phase = t / duration;
    this.stepIndex = 2;
    const s = phase < 0.5 ? lerp(0.14, 0.86, easeInOut(phase / 0.5)) : lerp(0.86, 0.38, easeInOut((phase - 0.5) / 0.5));
    this.s = s;
    if (this.range) this.range.value = String(Math.round(s * 100));
    return this.render({ slider: true, s });
  }

  getSvg() {
    return this.host?.querySelector("svg") || null;
  }
}

const ROLE_CARD = { core: "core", flare: "flare", satellite: "satellite", outlier: "outlier" };

export class ScanConsensusDemo {
  static id = "scan-consensus";
  static title = "Non-destructive scans";
  static kicker = "Pulsar scan";
  static summary = "Scan planes read the intact pool, consensus cells light up, and the discovered shape lifts out.";
  static thumb = "thumb-scan";

  constructor(api) {
    this.api = api;
    this.stepIndex = 0;
    this.h = new Heerich({ camera: { type: "orthographic", angle: 45, pitch: 35.264 }, gap: 0.07 });
    this.state = { plane: null, lit: 0, partialA: 0, redBox: false, lift: 0 };
    this.singularScaffold = false;
    this.solidGrayPartials = false;
  }

  mount(stageHost, controlsHost) {
    this.host = document.createElement("div");
    this.host.className = "graphic-host graphic-host--bob";
    stageHost.replaceChildren(this.host);
    const group = document.createElement("div");
    group.className = "control-group";
    group.innerHTML = `
      <div class="control-row"><span class="control-label">Read mode</span><span class="control-value">Non-destructive</span></div>
      <div class="choice-row">
        <button class="choice-button" data-scan-step="0" type="button">Scan</button>
        <button class="choice-button" data-scan-step="1" type="button">Consensus</button>
        <button class="choice-button" data-scan-step="2" type="button">Compare</button>
        <button class="choice-button" data-scan-step="3" type="button">Lift</button>
      </div>`;
    controlsHost.replaceChildren(group);
    group.querySelectorAll("[data-scan-step]").forEach((button) => {
      button.addEventListener("click", () => {
        this.stepIndex = Number(button.dataset.scanStep);
        this.render();
      });
    });
    this.render();
  }

  step(delta) {
    this.stepIndex = clamp(this.stepIndex + delta, 0, 3);
    this.render();
  }

  canStep(delta) {
    return this.stepIndex + delta >= 0 && this.stepIndex + delta <= 3;
  }

  get stepName() {
    return ["Scan", "Consensus", "Compare", "Lift"][this.stepIndex];
  }

  updateCopy() {
    this.api.updateDetails({
      kicker: "Pulsar scan",
      title: [
        "Thinking outside the box.",
        "Agreement becomes structure.",
        "The best threshold box still clips the shape.",
        "The cohort separates from the pool.",
      ][this.stepIndex],
      body: [
        "Instead of removing records, independent passes read the full pool and leave it intact.",
        "Cells light up where views agree. One-view noise is allowed to fade instead of becoming an exclusion rule.",
        "The red frame is the optimal threshold block from the prior demo. It still misses part of the discovered cohort.",
        "The shape lifts out as a traceable candidate set while the original pool remains available.",
      ][this.stepIndex],
      metrics: [
        ["Consensus cells", String(TRUE_CELLS.length)],
        ["Cells destroyed", "0"],
        ["Missed by box", "42"],
        ["Views", "3"],
      ],
      modeLabel: "Scan consensus",
      stepLabel: this.stepName,
    });
    document.querySelectorAll("[data-scan-step]").forEach((button) => button.classList.toggle("is-active", Number(button.dataset.scanStep) === this.stepIndex));
  }

  render(overrides = {}) {
    const st = {
      singularScaffold: this.singularScaffold,
      solidGrayPartials: this.solidGrayPartials,
      ...this.baseStateForStep(),
      ...overrides
    };
    if (st.singularScaffold) {
      st.hideCage = true;
    }
    this.state = st;
    const h = this.h;
    h.clear();

    if (st.camera) {
      h.setCamera({ type: "orthographic", ...st.camera });
    } else {
      h.setCamera({ type: "orthographic", angle: 45, pitch: 35.264 });
    }

    // Anchor bounds with invisible boxes to lock camera view extents
    h.applyGeometry({
      type: "box",
      position: [0, 0, 0],
      size: 1,
      opaque: false,
      style: { default: { fill: "none", stroke: "none" } }
    });
    h.applyGeometry({
      type: "box",
      position: [W - 1, H - 1, D - 1],
      size: 1,
      opaque: false,
      style: { default: { fill: "none", stroke: "none" } }
    });
    const off = -Math.round(st.lift * 9);
    const liftSet = off > 0 ? new Set(TRUE_CELLS.map(([x, y, z]) => `${x},${y + off},${z}`)) : TRUE_SET;

    if (st.singularScaffold) {
      h.applyGeometry({
        type: "box",
        position: [0, 0, 0],
        size: [W, H, D],
        opaque: false,
        meta: { id: "scaffold-outline" },
        style: {
          default: st.hideCage
            ? { fill: "none", stroke: "none" }
            : { fill: "none", stroke: "rgba(32,35,51,0.20)", strokeWidth: 0.5 }
        }
      });
    } else {
      h.applyGeometry({
        type: "fill",
        bounds: [[0, 0, 0], [W, H, D]],
        test: (x, y, z) => CAGE_TEST(x, y, z) && !liftSet.has(`${x},${y},${z}`),
        opaque: false,
        meta: { id: "cage" },
        style: {
          default: st.hideCage
            ? { fill: "none", stroke: "none" }
            : { fill: "rgba(32,35,51,0.025)", stroke: "rgba(32,35,51,0.20)", strokeWidth: 0.5 }
        },
      });
    }

    const n = Math.round(st.lit * TRUE_CELLS.length);
    for (let i = 0; i < n; i++) {
      let [x, y, z] = TRUE_CELLS[i];
      const role = TRUE_ROLES[i];
      const strong = role === "core";
      
      let fill, stroke;
      if (st.slide1Revealed !== undefined) {
        const t = st.slide1Revealed;
        const targetFill = strong ? [13, 126, 143, 0.92] : [13, 126, 143, 0.66];
        const r_fill = Math.round(215 + (targetFill[0] - 215) * t);
        const g_fill = Math.round(217 + (targetFill[1] - 217) * t);
        const b_fill = Math.round(218 + (targetFill[2] - 218) * t);
        const a_fill = (1.0 + (targetFill[3] - 1.0) * t).toFixed(3);
        fill = `rgba(${r_fill}, ${g_fill}, ${b_fill}, ${a_fill})`;

        const r_stroke = Math.round(110 + (10 - 110) * t);
        const g_stroke = Math.round(114 + (95 - 114) * t);
        const b_stroke = Math.round(110 + (109 - 110) * t);
        stroke = `rgb(${r_stroke}, ${g_stroke}, ${b_stroke})`;
      } else {
        fill = strong ? "rgba(13,126,143,0.92)" : "rgba(13,126,143,0.66)";
        stroke = "#0a5f6d";
      }

      let scale = 1.0;
      if (st.dismorphProgress !== undefined && st.dismorphProgress > 0) {
        const p = st.dismorphProgress;
        
        // 1. Position offsets (drifting / splitting)
        if (role === "flare") {
          x += (x - 6) * 0.45 * p;
          z += (z - 6) * 0.45 * p;
        } else if (role === "satellite") {
          x += (x - 2.5) * 0.3 * p;
          z += (z - 3.2) * 0.3 * p;
        }
        
        // 2. Scale adjustments (holes appearing & shrinking)
        if (role === "core") {
          const distToCenter = Math.sqrt((x - 6) ** 2 + (z - 6) ** 2);
          if (distToCenter < 1.2) {
            scale = Math.max(0, 1 - p * 2.2);
          }
        } else if (role === "satellite") {
          scale = Math.max(0.1, 1 - p * 0.7);
        } else if (role === "outlier") {
          scale = Math.max(0, 1 - p);
        }
      }

      if (scale <= 0.05) continue; // Skip rendering fully dissolved cells!

      const style = {
        default: { fill, stroke, strokeWidth: 0.8 },
        top: { fill, hatch: { angle: 45, period: 3.6, stroke: "#f4f1e9", strokeWidth: 0.5 } },
      };
      if (strong) style.left = { fill, hatch: { angle: 135, period: 3.6, stroke: "#f4f1e9", strokeWidth: 0.5 } };
      
      const geo = { type: "box", position: [x, y + off, z], size: 1, meta: { id: ROLE_CARD[role] }, style };
      if (scale < 0.999) {
        geo.scale = [scale, scale, scale];
        geo.scaleOrigin = [0.5, 0.5, 0.5];
      }
      h.applyGeometry(geo);
    }

    if (st.partialA > 0.03) {
      const pCount = st.partialCount !== undefined ? st.partialCount : PARTIALS.length;
      for (let i = 0; i < pCount; i++) {
        const q = PARTIALS[i];
        let fill, stroke, style;
        if (st.slide1Revealed !== undefined || st.solidGrayPartials) {
          fill = "rgba(215, 217, 218, 1.000)";
          stroke = "rgb(110, 114, 110)";
          style = {
            default: { fill, stroke, strokeWidth: 0.8 },
            top: { fill, hatch: { angle: 45, period: 3.6, stroke: "#f4f1e9", strokeWidth: 0.5 } },
            left: { fill, hatch: { angle: 135, period: 3.6, stroke: "#f4f1e9", strokeWidth: 0.5 } },
          };
          h.applyGeometry({
            type: "box",
            position: q,
            size: 1,
            meta: { id: "partial" },
            style,
          });
        } else {
          const a1 = (0.15 * st.partialA).toFixed(3);
          const a2 = (0.45 * st.partialA).toFixed(3);
          fill = `rgba(13,126,143,${a1})`;
          stroke = `rgba(13,126,143,${a2})`;
          h.applyGeometry({
            type: "box",
            position: q,
            size: 1,
            opaque: false,
            meta: { id: "partial" },
            style: { default: { fill, stroke, strokeWidth: 0.5, strokeDasharray: "2 2.5" } },
          });
        }
      }
    }

    if (st.plane) {
      const { ax, i, fill, stroke } = st.plane;
      const lo = ax === "x" ? [i, 0, 0] : ax === "y" ? [0, i, 0] : [0, 0, i];
      const sz = ax === "x" ? [1, H, D] : ax === "y" ? [W, 1, D] : [W, H, 1];
      h.applyGeometry({
        type: "fill",
        bounds: [lo, [lo[0] + sz[0], lo[1] + sz[1], lo[2] + sz[2]]],
        test: (x, y, z) => !CAGE_TEST(x, y, z),
        meta: { id: "plane" },
        style: { default: { fill, stroke, strokeWidth: 0.7 } },
      });
    }

    if (st.redBox) {
      const d = blockDims(OPT_S);
      const lo = [d.x0, d.y0, d.z0];
      const hi = [d.x0 + d.bw - 1, d.y0 + d.bh - 1, d.z0 + d.bd - 1];
      const inEdge = edgeCells(lo, hi);
      
      for (let x = lo[0]; x <= hi[0]; x++) {
        for (let y = lo[1]; y <= hi[1]; y++) {
          for (let z = lo[2]; z <= hi[2]; z++) {
            if (inEdge(x, y, z) && !TRUE_SET.has(`${x},${y},${z}`) && !CAGE_TEST(x, y, z)) {
              h.applyGeometry({
                type: "box",
                position: [x, y, z],
                size: 1,
                opaque: false,
                meta: { id: "redbox-cube" },
                style: {
                  default: {
                    fill: "rgba(180, 24, 46, 0.52)",
                    stroke: "rgba(130, 10, 26, 0.92)",
                    strokeWidth: 0.45
                  },
                  top: {
                    fill: "rgba(180, 24, 46, 0.58)",
                    hatch: { angle: 45, period: 4, stroke: "rgba(255, 255, 255, 0.25)", strokeWidth: 0.45 }
                  },
                  left: {
                    fill: "rgba(180, 24, 46, 0.58)",
                    hatch: { angle: 135, period: 4, stroke: "rgba(255, 255, 255, 0.25)", strokeWidth: 0.45 }
                  }
                }
              });
            }
          }
        }
      }
    }

    this.host.innerHTML = h.toSVG({ padding: 46 });

    if (st.drawBubbles) {
      const svg = this.host.querySelector("svg");
      if (svg) {
        this.drawGroupOutlines(svg);
      }
    }

    this.updateCopy();
    return this.getSvg();
  }

  drawGroupOutlines(svg) {
    const isUnmelt = this.state && this.state.unmelt;
    // 1. Add the gooey filter defs to the SVG
    const defs = `
      <defs>
        <filter id="gooey-melt" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
          <!-- 1. Blur the source blocks slightly (to 4 or from 4 to 0 depending on unmelt) -->
          <feGaussianBlur in="SourceGraphic" stdDeviation="${isUnmelt ? 4 : 0}" result="blur">
            <animate attributeName="stdDeviation" 
                     from="${isUnmelt ? 4 : 0}" 
                     to="${isUnmelt ? 0 : 4}" 
                     dur="1.2s" begin="0.2s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4, 0, 0.2, 1" />
          </feGaussianBlur>
          
          <!-- 2. High-contrast threshold and smooth color transition to brand purple (#9c27b8) -->
          <feColorMatrix in="blur" mode="matrix" 
                         values="${isUnmelt ? "0 0 0 0 0.612  0 0 0 0 0.153  0 0 0 0 0.722  0 0 0 50 -10" : "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 50 -10"}" result="goo">
            <animate attributeName="values"
                     from="${isUnmelt ? "0 0 0 0 0.612  0 0 0 0 0.153  0 0 0 0 0.722  0 0 0 50 -10" : "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 50 -10"}"
                     to="${isUnmelt ? "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 50 -10" : "0 0 0 0 0.612  0 0 0 0 0.153  0 0 0 0 0.722  0 0 0 50 -10"}"
                     dur="1.2s" begin="0.2s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4, 0, 0.2, 1" />
          </feColorMatrix>
          
          <!-- 3. Dilate the sharp fills slightly outward by 1.0px to form the outline base -->
          <feMorphology in="goo" operator="dilate" radius="1.0" result="dilated" />
          
          <!-- 4. Subtract the original goo from the dilated shape to leave ONLY a thin 1.0px outline ring -->
          <feComposite in="dilated" in2="goo" operator="out" result="rawOutline" />
          
          <!-- 5. Recolor outline ring to #6e1b82 (dark purple) and animate its fade-in after melting is done -->
          <feColorMatrix in="rawOutline" mode="matrix" result="coloredOutline"
                         values="${isUnmelt ? "0 0 0 0 0.431  0 0 0 0 0.106  0 0 0 0 0.510  0 0 0 1 0" : "0 0 0 0 0.431  0 0 0 0 0.106  0 0 0 0 0.510  0 0 0 0 0"}">
            <animate attributeName="values"
                     from="${isUnmelt ? "0 0 0 0 0.431  0 0 0 0 0.106  0 0 0 0 0.510  0 0 0 1 0" : "0 0 0 0 0.431  0 0 0 0 0.106  0 0 0 0 0.510  0 0 0 0 0"}"
                     to="${isUnmelt ? "0 0 0 0 0.431  0 0 0 0 0.106  0 0 0 0 0.510  0 0 0 0 0" : "0 0 0 0 0.431  0 0 0 0 0.106  0 0 0 0 0.510  0 0 0 1 0"}"
                     dur="0.6s" begin="${isUnmelt ? "0.0s" : "1.4s"}" fill="freeze" />
          </feColorMatrix>
          
          <!-- 6. Composite the 1px outline ring OVER the solid purple goo fill -->
          <feComposite in="coloredOutline" in2="goo" operator="over" />
        </filter>
      </defs>
    `;
    svg.insertAdjacentHTML("afterbegin", defs);

    // 2. Wrap all targets in a single group that has the gooey filter applied
    const targets = svg.querySelectorAll('[data-id="core"], [data-id="flare"], [data-id="satellite"], [data-id="outlier"]');
    if (targets.length > 0) {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("filter", "url(#gooey-melt)");
      
      const firstTarget = targets[0];
      const parent = firstTarget.parentNode;
      parent.insertBefore(group, firstTarget);
      
      for (const t of targets) {
        group.appendChild(t);
      }
    }
  }

  toggle3D() {
    if (!this.singularScaffold) return;
    const is3D = this.state.camera && this.state.camera.pitch < 80;
    const targetAngle = is3D ? 0 : 45;
    const targetPitch = is3D ? 89.9 : 35.264;

    const startAngle = this.state.camera ? this.state.camera.angle : 0;
    const startPitch = this.state.camera ? this.state.camera.pitch : 89.9;

    const start = performance.now();
    const duration = 1200;
    const tick = (now) => {
      const t = easeInOut(clamp((now - start) / duration, 0, 1));
      const angle = lerp(startAngle, targetAngle, t);
      const pitch = lerp(startPitch, targetPitch, t);
      this.render({ plane: null, lit: 1, partialA: 0, partialCount: 0, camera: { angle, pitch }, drawBubbles: true });
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        const btn = document.querySelector("#btnToggle3D");
        if (btn) {
          btn.textContent = is3D ? "Rotate to 3D View" : "Rotate to 2D View";
        }
      }
    };
    requestAnimationFrame(tick);
  }

  baseStateForStep() {
    if (this.stepIndex === 0) {
      if (this.singularScaffold) {
        return { plane: null, lit: 1, partialA: 1, redBox: false, lift: 0, hideCage: true };
      }
      return { plane: null, lit: 0, partialA: 0, redBox: false, lift: 0 };
    }
    if (this.stepIndex === 1) return { plane: null, lit: 1, partialA: 1, redBox: false, lift: 0 };
    if (this.stepIndex === 2) {
      if (this.singularScaffold) {
        return {
          plane: null,
          lit: 1,
          partialA: 0,
          redBox: false,
          camera: { angle: 0, pitch: 85 },
          drawBubbles: true
        };
      }
      return { plane: null, lit: 1, partialA: 0, redBox: true, lift: 0 };
    }
    return { plane: null, lit: 1, partialA: 0, redBox: false, lift: 1 };
  }

  async play() {
    const start = performance.now();
    const duration = REDUCED ? 80 : 4200;
    const tick = (now) => {
      const phase = clamp((now - start) / duration, 0, 1);
      this.renderFrame(phase * duration, duration);
      if (phase < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async renderFrame(t, duration) {
    const phase = t / duration;
    if (this.singularScaffold) {
      if (this.stepIndex === 0) {
        // Slide 3 Animation: Sweep -> Disappear -> Rotate 2D & Melt
        if (phase < 0.4) {
          // Phase 1: Sweep (0.0 -> 0.4)
          const u = phase / 0.4;
          const axes = [
            { ax: "x", n: W, fill: "rgba(156,39,184,0.34)", stroke: "#6e1b82" },
            { ax: "y", n: H, fill: "rgba(156,39,184,0.34)", stroke: "#6e1b82" },
            { ax: "z", n: D, fill: "rgba(156,39,184,0.34)", stroke: "#6e1b82" },
          ];
          const current = axes[Math.min(2, Math.floor(u * 3))];
          const local = (u * 3) % 1;
          const plane = { ...current, i: Math.min(current.n - 1, Math.floor(local * current.n)) };
          return this.render({ plane, lit: 1, partialA: 1 });
        } else if (phase < 0.7) {
          // Phase 2: Non-targets disappear one by one (0.4 -> 0.7)
          const u = (phase - 0.4) / 0.3;
          const pCount = Math.round((1 - u) * PARTIALS.length);
          return this.render({ plane: null, lit: 1, partialA: pCount > 0 ? 1 : 0, partialCount: pCount });
        } else {
          // Phase 3: Camera rotation to 2D flat view and gooey melt (0.7 -> 1.0)
          const u = (phase - 0.7) / 0.3;
          const t_rot = easeInOut(u);
          const angle = lerp(45, 0, t_rot);
          const pitch = lerp(35.264, 85, t_rot);
          const drawBubbles = phase >= 0.99;
          return this.render({ plane: null, lit: 1, partialA: 0, partialCount: 0, camera: { angle, pitch }, drawBubbles });
        }
      } else if (this.stepIndex === 2) {
        // Slide 4 Animation: Stay in flat 2D view and smoothly dismorph the manifold
        return this.render({ plane: null, lit: 1, partialA: 0, redBox: false, camera: { angle: 0, pitch: 85 }, drawBubbles: true, dismorphProgress: phase });
      }
    }

    if (phase < 0.3) {
      this.stepIndex = 0;
      const u = phase / 0.3;
      const axes = [
        { ax: "x", n: W, fill: "rgba(156,39,184,0.34)", stroke: "#6e1b82" },
        { ax: "y", n: H, fill: "rgba(156,39,184,0.34)", stroke: "#6e1b82" },
        { ax: "z", n: D, fill: "rgba(156,39,184,0.34)", stroke: "#6e1b82" },
      ];
      const current = axes[Math.min(2, Math.floor(u * 3))];
      const local = (u * 3) % 1;
      return this.render({ plane: { ...current, i: Math.min(current.n - 1, Math.floor(local * current.n)) } });
    }
    if (phase < 0.62) {
      this.stepIndex = 1;
      if (this.singularScaffold) {
        return this.render({ lit: 1, partialA: 1 });
      }
      const u = easeOut((phase - 0.3) / 0.32);
      return this.render({ lit: u, partialA: Math.min(1, u * 1.35) });
    }
    if (phase < 0.78) {
      this.stepIndex = 2;
      return this.render();
    }
    this.stepIndex = 3;
    return this.render({ lift: easeInOut((phase - 0.78) / 0.22) });
  }

  getSvg() {
    return this.host?.querySelector("svg") || null;
  }
}
