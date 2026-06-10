import { clamp, easeInOut, lerp, mulberry32, svgEl } from "./utils.js";

const W = 14;
const H = 6;
const D = 14;
const VIEW = { w: 900, h: 620, pad: 72 };
const CELL = 28;
const PATIENTS = [[7,1,2,"T","c"],[8,1,2,"T","c"],[8,1,3,"T","c"],[9,2,3,"T","c"],[9,1,4,"T","c"],[10,2,4,"T","c"],[10,1,5,"T","c"],[11,2,5,"T","c"],[11,2,6,"T","c"],[11,2,7,"T","c"],[11,2,8,"T","c"],[11,2,9,"T","c"],[10,1,10,"T","c"],[9,2,10,"T","c"],[9,1,11,"T","c"],[8,1,11,"T","c"],[7,1,11,"T","c"],[6,2,11,"T","c"],[5,1,11,"T","c"],[5,2,10,"T","c"],[4,1,10,"T","c"],[4,2,9,"T","c"],[3,1,9,"T","c"],[3,1,8,"T","c"],[3,1,7,"T","c"],[2,1,7,"T","c"],[2,1,6,"T","c"],[9,1,5,"T","c"],[10,1,6,"T","c"],[10,2,7,"T","c"],[10,1,8,"T","c"],[8,2,10,"T","c"],[7,2,10,"T","c"],[6,1,10,"T","c"],[5,1,9,"T","c"],[11,1,10,"T","c"],[13,1,9,"T","s"],[13,1,10,"T","s"],[13,1,11,"T","s"],[6,2,6,"D","d"],[6,2,7,"D","d"],[6,2,8,"D","d"],[7,3,6,"D","d"],[7,3,7,"D","d"],[7,3,8,"D","d"],[8,2,6,"D","d"],[8,2,7,"D","d"],[8,3,8,"D","d"],[1,3,10,"B","c"],[1,2,11,"B","c"],[2,3,11,"B","c"],[0,2,11,"B","c"],[0,3,12,"B","c"],[1,3,12,"B","c"],[2,2,12,"B","c"],[3,2,12,"B","c"],[2,3,13,"B","c"],[11,4,1,"C","c"],[12,4,1,"C","c"],[13,3,1,"C","c"],[11,4,2,"C","c"],[12,4,2,"C","c"],[13,4,2,"C","c"],[12,4,3,"C","c"],[13,4,3,"C","c"],[1,1,1,"S","s"],[5,4,4,"S","s"],[4,3,5,"S","s"],[0,4,8,"S","s"],[5,2,13,"S","s"],[9,2,13,"S","s"],[12,1,11,"S","s"],[13,3,5,"S","s"],[12,1,9,"S","s"],[12,2,10,"S","s"]]
  .map(([x, y, z, co, role], pid) => ({ x, y, z, co, role, pid }));

const TARGETS = PATIENTS.filter((p) => p.co === "T");
const N_T = TARGETS.length;
const N_ALL = PATIENTS.length;
const CEN = TARGETS.reduce((acc, p) => [acc[0] + p.x + 0.5, acc[1] + p.y + 0.5, acc[2] + p.z + 0.5], [0, 0, 0]).map((value) => value / N_T);
const findP = (x, z) => PATIENTS.find((p) => p.x === x && p.z === z);
const REJECT_SEQ = [[10, 6], [10, 7], [10, 8], [11, 9]].map(([x, z]) => findP(x, z).pid);
const ACCEPT_SEQ = [[11, 9], [12, 9], [12, 10], [12, 11]].map(([x, z]) => findP(x, z).pid);

function px(x) {
  return VIEW.pad + x * CELL;
}

function py(z) {
  return VIEW.pad + z * CELL;
}

function boxDims(s) {
  const bw = Math.round(lerp(3, W, s));
  const bh = Math.round(lerp(3, H, s));
  const bd = Math.round(lerp(3, D, s));
  const x0 = clamp(Math.round(CEN[0]) - Math.floor(bw / 2), 0, W - bw);
  const y0 = clamp(Math.round(CEN[1]) - Math.floor(bh / 2), 0, H - bh);
  const z0 = clamp(Math.round(CEN[2]) - Math.floor(bd / 2), 0, D - bd);
  return { x0, y0, z0, bw, bh, bd };
}

const inBox = (d) => (p) => p.x >= d.x0 && p.x < d.x0 + d.bw && p.y >= d.y0 && p.y < d.y0 + d.bh && p.z >= d.z0 && p.z < d.z0 + d.bd;

function boxStats(s) {
  const d = boxDims(s);
  const inside = inBox(d);
  let missed = 0;
  let fp = 0;
  for (const p of PATIENTS) {
    if (p.co === "T") {
      if (!inside(p)) missed++;
    } else if (inside(p)) fp++;
  }
  return { ...d, missed, fp, cost: missed * 2 + fp };
}

function makeSvg() {
  return svgEl("svg", { viewBox: `0 0 ${VIEW.w} ${VIEW.h}`, role: "img" }, [
    svgEl("rect", { x: 0, y: 0, width: VIEW.w, height: VIEW.h, fill: "#ffffff" }),
    svgEl("g", { opacity: "0.34" }, [
      ...Array.from({ length: W + 1 }, (_, i) => svgEl("line", { x1: px(i), y1: py(0), x2: px(i), y2: py(D), stroke: "rgba(32,35,51,0.10)", "stroke-width": 1 })),
      ...Array.from({ length: D + 1 }, (_, i) => svgEl("line", { x1: px(0), y1: py(i), x2: px(W), y2: py(i), stroke: "rgba(32,35,51,0.10)", "stroke-width": 1 })),
    ]),
  ]);
}

function patientStyle(p, inside, useFeedback, removed, added) {
  let fill = "#e6e8e5";
  let stroke = "rgba(32,35,51,0.35)";
  let size = 18;
  let opacity = 1;
  if (p.co === "T") {
    fill = "#2e7d4f";
    stroke = "#1d5635";
  } else if (p.co === "D") {
    fill = "#bfc5c8";
  } else if (p.co === "B") {
    fill = "#d8dde4";
  } else if (p.co === "C") {
    fill = "#e4d9e9";
    stroke = "rgba(138,58,161,0.45)";
  } else {
    fill = "#f0f0eb";
  }
  if (inside && p.co !== "T") {
    fill = "rgba(169,106,8,0.38)";
    stroke = "#a96a08";
  }
  if (!inside && p.co === "T") {
    fill = "rgba(217,38,66,0.56)";
    stroke = "#d92642";
  }
  if (useFeedback) {
    if (removed.has(p.pid)) {
      fill = "rgba(46,125,79,0.10)";
      stroke = "rgba(29,86,53,0.55)";
      opacity = 0.8;
    }
    if (added.has(p.pid)) {
      fill = "#0d7e8f";
      stroke = "#095d68";
      size = 20;
    }
  }
  return { fill, stroke, size, opacity };
}

function drawPatients(svg, options = {}) {
  const { filterS = null, useFeedback = false, removed = new Set(), added = new Set() } = options;
  const d = filterS == null ? null : boxDims(filterS);
  const inside = d ? inBox(d) : () => false;
  for (const p of PATIENTS) {
    const style = patientStyle(p, inside(p), useFeedback, removed, added);
    svg.appendChild(svgEl("rect", {
      x: px(p.x) + (CELL - style.size) / 2,
      y: py(p.z) + (CELL - style.size) / 2,
      width: style.size,
      height: style.size,
      rx: 3,
      fill: style.fill,
      stroke: style.stroke,
      "stroke-width": 1.2,
      opacity: style.opacity,
    }));
  }
}

function drawFilter(svg, s) {
  const d = boxDims(s);
  svg.appendChild(svgEl("rect", {
    x: px(d.x0),
    y: py(d.z0),
    width: d.bw * CELL,
    height: d.bd * CELL,
    fill: "rgba(217,38,66,0.035)",
    stroke: "#d92642",
    "stroke-width": 2,
    "stroke-dasharray": "7 5",
  }));
}

function curveSvg(pointsA, pointsB, pointsTotal, activeIndex) {
  const max = Math.max(...pointsTotal, ...pointsA, ...pointsB, 1);
  const path = (arr) => arr.map((value, i) => `${i ? "L" : "M"}${((i / (arr.length - 1)) * 300).toFixed(1)} ${(78 - (value / max) * 64).toFixed(1)}`).join(" ");
  const x = (activeIndex / (pointsTotal.length - 1)) * 300;
  const y = 78 - (pointsTotal[activeIndex] / max) * 64;
  return `
    <svg viewBox="0 0 300 96" preserveAspectRatio="none" aria-label="Filter cost curve">
      <line x1="0" y1="78" x2="300" y2="78" stroke="rgba(32,35,51,.22)" stroke-width="1"/>
      <path d="${path(pointsA)}" fill="none" stroke="#d92642" stroke-width="1.4" opacity=".55"/>
      <path d="${path(pointsB)}" fill="none" stroke="#a96a08" stroke-width="1.4" opacity=".55"/>
      <path d="${path(pointsTotal)}" fill="none" stroke="#202333" stroke-width="1.8"/>
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="#202333"/>
    </svg>`;
}

export class CrescentFilterDemo {
  static id = "crescent-filter";
  static title = "Crescent vs box";
  static kicker = "Filters vs manifolds";
  static summary = "The original filter slider, reframed as a standalone graphic with direct export support.";
  static thumb = "thumb-crescent";

  constructor(api) {
    this.api = api;
    this.s = 0.42;
    this.stepIndex = 1;
  }

  mount(stageHost, controlsHost) {
    this.host = document.createElement("div");
    this.host.className = "graphic-host";
    stageHost.replaceChildren(this.host);

    this.range = document.createElement("input");
    this.range.type = "range";
    this.range.min = "0";
    this.range.max = "100";
    this.range.value = String(Math.round(this.s * 100));
    this.range.className = "range";
    this.range.addEventListener("input", () => {
      this.s = Number(this.range.value) / 100;
      this.render();
    });

    const group = document.createElement("div");
    group.className = "control-group";
    group.innerHTML = `<div class="control-row"><span class="control-label">Filter size</span><span id="filterSizeValue" class="control-value">42%</span></div>`;
    group.appendChild(this.range);
    const curve = document.createElement("div");
    curve.id = "filterCurve";
    group.appendChild(curve);
    controlsHost.replaceChildren(group);
    this.render();
  }

  step(delta) {
    const presets = [0.2, 0.42, 0.86];
    this.stepIndex = clamp(this.stepIndex + delta, 0, presets.length - 1);
    this.s = presets[this.stepIndex];
    if (this.range) this.range.value = String(Math.round(this.s * 100));
    this.render();
  }

  canStep(delta) {
    return this.stepIndex + delta >= 0 && this.stepIndex + delta <= 2;
  }

  get stepName() {
    return ["Tight box", "Balanced box", "Loose box"][this.stepIndex];
  }

  updateCopy() {
    const st = boxStats(this.s);
    this.api.updateDetails({
      kicker: "Filters vs manifolds",
      title: "No box fits a crescent.",
      body: "The trial cohort is a crescent with a satellite lobe. Tighten the box and targets fall outside. Loosen it and look-alikes flood in.",
      metrics: [
        ["Targets missed", String(st.missed)],
        ["False positives", String(st.fp)],
        ["Targets", String(N_T)],
        ["Records", String(N_ALL)],
      ],
      modeLabel: "Crescent filter",
      stepLabel: this.stepName,
    });
  }

  updateCurve() {
    const curve = document.querySelector("#filterCurve");
    if (!curve) return;
    const misses = [];
    const fps = [];
    const totals = [];
    for (let i = 0; i < 81; i++) {
      const st = boxStats(i / 80);
      misses.push(st.missed * 2);
      fps.push(st.fp);
      totals.push(st.cost);
    }
    curve.innerHTML = curveSvg(misses, fps, totals, Math.round(this.s * 80));
    const value = document.querySelector("#filterSizeValue");
    if (value) value.textContent = `${Math.round(this.s * 100)}%`;
  }

  render() {
    const svg = makeSvg();
    drawFilter(svg, this.s);
    drawPatients(svg, { filterS: this.s });
    this.host.replaceChildren(svg);
    this.updateCurve();
    this.updateCopy();
    return this.getSvg();
  }

  async play() {
    const start = performance.now();
    const duration = 2600;
    const tick = (now) => {
      const phase = clamp((now - start) / duration, 0, 1);
      this.renderFrame(phase * duration, duration);
      if (phase < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async renderFrame(t, duration) {
    const phase = t / duration;
    this.s = phase < 0.52 ? lerp(0.18, 0.86, easeInOut(phase / 0.52)) : lerp(0.86, 0.42, easeInOut((phase - 0.52) / 0.48));
    if (this.range) this.range.value = String(Math.round(this.s * 100));
    return this.render();
  }

  getSvg() {
    return this.host?.querySelector("svg") || null;
  }
}

const FIELD = { R: 1.35, RR: 1.05, LAMBDA: 0.55, TAU: 0.30, H: 0.25, PAD: 1.6 };
const fieldK = (d, r) => {
  const q = (d * d) / (r * r);
  return q >= 1 ? 0 : (1 - q) * (1 - q);
};

function fieldContours(weightOf) {
  const { R, RR, LAMBDA, TAU, H: step, PAD } = FIELD;
  const x0 = -PAD;
  const z0 = -PAD;
  const n = Math.ceil((W + 2 * PAD) / step) + 1;
  const f = new Float64Array(n * n);
  const rm = Math.max(R, RR);
  for (const p of PATIENTS) {
    const w = weightOf(p);
    const a = w;
    const b = LAMBDA * (1 - w);
    if (a === 0 && b === 0) continue;
    const cx = p.x + 0.5;
    const cz = p.z + 0.5;
    const i0 = Math.max(0, Math.floor((cx - rm - x0) / step));
    const i1 = Math.min(n - 1, Math.ceil((cx + rm - x0) / step));
    const j0 = Math.max(0, Math.floor((cz - rm - z0) / step));
    const j1 = Math.min(n - 1, Math.ceil((cz + rm - z0) / step));
    for (let j = j0; j <= j1; j++) {
      const dz = z0 + j * step - cz;
      for (let i = i0; i <= i1; i++) {
        const dx = x0 + i * step - cx;
        const d = Math.hypot(dx, dz);
        f[j * n + i] += a * fieldK(d, R) - b * fieldK(d, RR);
      }
    }
  }

  const points = new Map();
  const links = new Map();
  const edgeKey = (i, j, dir) => `${dir}:${i},${j}`;
  const cross = (va, vb) => (TAU - va) / (vb - va);
  const addPoint = (key, point) => {
    if (!points.has(key)) points.set(key, point);
  };
  const addSeg = (a, b) => {
    if (!links.has(a)) links.set(a, []);
    if (!links.has(b)) links.set(b, []);
    links.get(a).push(b);
    links.get(b).push(a);
  };

  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const v00 = f[j * n + i];
      const v10 = f[j * n + i + 1];
      const v01 = f[(j + 1) * n + i];
      const v11 = f[(j + 1) * n + i + 1];
      let c = 0;
      if (v00 >= TAU) c |= 1;
      if (v10 >= TAU) c |= 2;
      if (v11 >= TAU) c |= 4;
      if (v01 >= TAU) c |= 8;
      if (c === 0 || c === 15) continue;
      const top = edgeKey(i, j, "h");
      const bot = edgeKey(i, j + 1, "h");
      const lef = edgeKey(i, j, "v");
      const rig = edgeKey(i + 1, j, "v");
      addPoint(top, [x0 + (i + cross(v00, v10)) * step, z0 + j * step]);
      addPoint(bot, [x0 + (i + cross(v01, v11)) * step, z0 + (j + 1) * step]);
      addPoint(lef, [x0 + i * step, z0 + (j + cross(v00, v01)) * step]);
      addPoint(rig, [x0 + (i + 1) * step, z0 + (j + cross(v10, v11)) * step]);
      switch (c) {
        case 1:
        case 14:
          addSeg(top, lef);
          break;
        case 2:
        case 13:
          addSeg(top, rig);
          break;
        case 3:
        case 12:
          addSeg(lef, rig);
          break;
        case 4:
        case 11:
          addSeg(rig, bot);
          break;
        case 6:
        case 9:
          addSeg(top, bot);
          break;
        case 7:
        case 8:
          addSeg(lef, bot);
          break;
        case 5:
        case 10: {
          const mid = (v00 + v10 + v01 + v11) / 4 >= TAU;
          if ((c === 5) === mid) {
            addSeg(top, rig);
            addSeg(lef, bot);
          } else {
            addSeg(top, lef);
            addSeg(rig, bot);
          }
          break;
        }
      }
    }
  }

  const loops = [];
  const used = new Set();
  for (const start of links.keys()) {
    if (used.has(start)) continue;
    const loop = [];
    let cur = start;
    let prev = null;
    let guard = 0;
    while (guard++ < 100000) {
      used.add(cur);
      loop.push(points.get(cur));
      const next = links.get(cur).find((key) => key !== prev && !used.has(key));
      if (next === undefined) break;
      prev = cur;
      cur = next;
    }
    if (loop.length > 4) loops.push(loop);
  }

  return loops.map((loop) => {
    const out = [];
    for (let i = 0; i < loop.length; i++) {
      const p = loop[i];
      const q = loop[(i + 1) % loop.length];
      out.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25]);
      out.push([p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
    }
    return out;
  });
}

function loopsPath(loops) {
  return loops.map((loop) => loop.map((point, index) => `${index ? "L" : "M"}${px(point[0]).toFixed(1)} ${py(point[1]).toFixed(1)}`).join(" ") + " Z").join(" ");
}

export class ManifoldFeedbackDemo {
  static id = "manifold-feedback";
  static title = "Feedback manifold";
  static kicker = "Learned shape";
  static summary = "Reject and accept borderline cells, then record the boundary as it splits and fuses.";
  static thumb = "thumb-manifold";

  constructor(api) {
    this.api = api;
    this.stepIndex = 0;
    this.removed = new Set();
    this.added = new Set();
    this.random = mulberry32(12);
  }

  mount(stageHost, controlsHost) {
    this.host = document.createElement("div");
    this.host.className = "graphic-host";
    stageHost.replaceChildren(this.host);
    const group = document.createElement("div");
    group.className = "control-group";
    group.innerHTML = `
      <div class="control-row"><span class="control-label">Clinician feedback</span><span class="control-value">Boundary updates live</span></div>
      <div class="choice-row">
        <button id="rejectSeq" class="choice-button" type="button">Reject edge</button>
        <button id="acceptSeq" class="choice-button" type="button">Accept bridge</button>
      </div>
      <button id="resetManifold" class="choice-button" type="button">Reset</button>`;
    controlsHost.replaceChildren(group);
    group.querySelector("#rejectSeq").addEventListener("click", () => {
      this.applyRejects(1);
      this.stepIndex = 1;
      this.render();
    });
    group.querySelector("#acceptSeq").addEventListener("click", () => {
      this.applyRejects(1);
      this.applyAccepts(1);
      this.stepIndex = 2;
      this.render();
    });
    group.querySelector("#resetManifold").addEventListener("click", () => {
      this.reset();
      this.render();
    });
    this.render();
  }

  reset() {
    this.stepIndex = 0;
    this.removed = new Set();
    this.added = new Set();
  }

  step(delta) {
    this.stepIndex = clamp(this.stepIndex + delta, 0, 2);
    this.reset();
    if (this.stepIndex >= 1) this.applyRejects(1);
    if (this.stepIndex >= 2) this.applyAccepts(1);
    this.render();
  }

  canStep(delta) {
    return this.stepIndex + delta >= 0 && this.stepIndex + delta <= 2;
  }

  get stepName() {
    return ["Initial manifold", "Reject edge", "Accept bridge"][this.stepIndex];
  }

  isTargetNow(p) {
    return (p.co === "T" && !this.removed.has(p.pid)) || this.added.has(p.pid);
  }

  weightOf(p) {
    return this.isTargetNow(p) ? 1 : 0;
  }

  applyRejects(progress) {
    const count = Math.floor(REJECT_SEQ.length * progress + 0.0001);
    this.removed = new Set(REJECT_SEQ.slice(0, count));
  }

  applyAccepts(progress) {
    const count = Math.floor(ACCEPT_SEQ.length * progress + 0.0001);
    for (const pid of ACCEPT_SEQ.slice(0, count)) {
      const p = PATIENTS[pid];
      if (p.co === "T") this.removed.delete(pid);
      else this.added.add(pid);
    }
  }

  updateCopy(loops) {
    const size = N_T - this.removed.size + this.added.size;
    this.api.updateDetails({
      kicker: "Learned manifold",
      title: ["Boundary follows the evidence.", "Rejects split weak evidence.", "Acceptances fuse related lobes."][this.stepIndex],
      body: [
        "The target boundary wraps the crescent and satellite without needing a rectangular threshold.",
        "Rejected edge cells peel the boundary away from look-alikes. At the weak link, the shape can split.",
        "Accepted bridge cells pull the manifold outward until the lobes fuse into one cohort shape.",
      ][this.stepIndex],
      metrics: [
        ["Cohort size", String(size)],
        ["Boundary lobes", String(loops.length)],
        ["Rejected", String(this.removed.size)],
        ["Accepted", String(this.added.size)],
      ],
      modeLabel: "Feedback manifold",
      stepLabel: this.stepName,
    });
  }

  render() {
    const svg = makeSvg();
    const cohortLoops = fieldContours((p) => this.weightOf(p));
    const decoyLoops = fieldContours((p) => (p.co === "D" ? 1 : 0));
    svg.appendChild(svgEl("path", {
      d: loopsPath(decoyLoops),
      fill: "rgba(77,90,114,0.05)",
      stroke: "rgba(77,90,114,0.45)",
      "stroke-width": 2,
      "fill-rule": "evenodd",
    }));
    svg.appendChild(svgEl("path", {
      d: loopsPath(cohortLoops),
      fill: "rgba(13,126,143,0.11)",
      stroke: "rgba(13,126,143,0.9)",
      "stroke-width": 3,
      "stroke-linejoin": "round",
      "fill-rule": "evenodd",
    }));
    drawPatients(svg, { useFeedback: true, removed: this.removed, added: this.added });
    this.host.replaceChildren(svg);
    this.updateCopy(cohortLoops);
    return this.getSvg();
  }

  async play() {
    const start = performance.now();
    const duration = 3600;
    const tick = (now) => {
      const phase = clamp((now - start) / duration, 0, 1);
      this.renderFrame(phase * duration, duration);
      if (phase < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async renderFrame(t, duration) {
    const phase = t / duration;
    this.reset();
    if (phase < 0.45) {
      this.stepIndex = 1;
      this.applyRejects(easeInOut(phase / 0.45));
    } else {
      this.stepIndex = 2;
      this.applyRejects(1);
      this.applyAccepts(easeInOut((phase - 0.45) / 0.55));
    }
    return this.render();
  }

  getSvg() {
    return this.host?.querySelector("svg") || null;
  }
}
