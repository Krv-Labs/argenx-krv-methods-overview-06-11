import { downloadSvg, recordSvgMotion } from "./svg-exporter.js";

const DEMOS = [
  {
    id: "cube-growth",
    title: "Cube growth and shrink",
    kicker: "Rigid filters",
    summary: "Tune the threshold block and watch the tradeoff between missed candidates and review burden.",
    thumb: "thumb-grid",
    load: () => import("./voxel-demos.js").then((module) => module.CubeThresholdDemo),
  },
  {
    id: "scan-consensus",
    title: "Non-destructive scans",
    kicker: "Pulsar scan",
    summary: "Scan planes read the intact pool, consensus cells light up, and the discovered shape lifts out.",
    thumb: "thumb-scan",
    load: () => import("./voxel-demos.js").then((module) => module.ScanConsensusDemo),
  },
  {
    id: "crescent-filter",
    title: "Crescent vs box",
    kicker: "Filters vs manifolds",
    summary: "The original filter slider, reframed as a standalone graphic with direct export support.",
    thumb: "thumb-crescent",
    load: () => import("./planar-demos.js").then((module) => module.CrescentFilterDemo),
  },
  {
    id: "manifold-feedback",
    title: "Feedback manifold",
    kicker: "Learned shape",
    summary: "Reject and accept borderline cells, then record the boundary as it splits and fuses.",
    thumb: "thumb-manifold",
    load: () => import("./planar-demos.js").then((module) => module.ManifoldFeedbackDemo),
  },
];
const byId = new Map(DEMOS.map((demo) => [demo.id, demo]));

const refs = {
  demoList: document.querySelector("#demoList"),
  galleryView: document.querySelector("#galleryView"),
  demoView: document.querySelector("#demoView"),
  stageHost: document.querySelector("#stageHost"),
  demoControls: document.querySelector("#demoControls"),
  demoKicker: document.querySelector("#demoKicker"),
  demoTitle: document.querySelector("#demoTitle"),
  demoBody: document.querySelector("#demoBody"),
  demoMetrics: document.querySelector("#demoMetrics"),
  modeLabel: document.querySelector("#modeLabel"),
  stepLabel: document.querySelector("#stepLabel"),
  btnGallery: document.querySelector("#btnGallery"),
  btnSvg: document.querySelector("#btnSvg"),
  btnRecord: document.querySelector("#btnRecord"),
  btnPrev: document.querySelector("#btnPrev"),
  btnPlay: document.querySelector("#btnPlay"),
  btnNext: document.querySelector("#btnNext"),
  toast: document.querySelector("#toast"),
};

let current = null;
let toastTimer = null;

const api = {
  updateDetails({ kicker, title, body, metrics = [], modeLabel, stepLabel }) {
    refs.demoKicker.textContent = kicker;
    refs.demoTitle.textContent = title;
    refs.demoBody.textContent = body;
    refs.modeLabel.textContent = modeLabel;
    refs.stepLabel.textContent = stepLabel;
    refs.demoMetrics.innerHTML = metrics.map(([label, value]) => `
      <div class="metric">
        <div class="metric__label">${label}</div>
        <div class="metric__value">${value}</div>
      </div>`).join("");
    updateNav();
  },
  toast(message) {
    refs.toast.textContent = message;
    refs.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => refs.toast.classList.remove("show"), 2600);
  },
};

function demoCard(demo, large = false) {
  const button = document.createElement("button");
  button.className = large ? "gallery-card" : "demo-card";
  button.type = "button";
  button.dataset.demoId = demo.id;
  if (large) {
    button.innerHTML = `
      <div class="gallery-card__copy">
        <div>
          <div class="gallery-card__kicker">${demo.kicker}</div>
          <h2 class="gallery-card__title">${demo.title}</h2>
        </div>
        <p class="gallery-card__body">${demo.summary}</p>
      </div>
      <div class="gallery-card__thumb" aria-hidden="true"><div class="${demo.thumb}"></div></div>`;
  } else {
    button.innerHTML = `
      <div class="demo-card__kicker">${demo.kicker}</div>
      <h3 class="demo-card__title">${demo.title}</h3>
      <p class="demo-card__body">${demo.summary}</p>`;
  }
  button.addEventListener("click", () => selectDemo(demo.id));
  return button;
}

const BRIEFINGS = [
  {
    title: "Cohort Topology",
    kicker: "Interactive Topology",
    summary: "Traditional rigid database filtering vs. additive sweeps.",
    url: "./legacy-htmls/index.html",
    thumb: "thumb-scan",
  },
  {
    title: "Filters vs. Manifolds",
    kicker: "Companion Briefing",
    summary: "2D comparison showing why hypercube box-filtering fails on curved distributions.",
    url: "./legacy-htmls/filters-vs-manifolds.html",
    thumb: "thumb-crescent",
  }
];

function briefingCard(briefing, large = false) {
  const link = document.createElement("a");
  link.className = large ? "gallery-card" : "demo-card";
  link.href = briefing.url;
  link.target = "_blank";
  link.style.textDecoration = "none";
  if (large) {
    link.innerHTML = `
      <div class="gallery-card__copy">
        <div>
          <div class="gallery-card__kicker">${briefing.kicker}</div>
          <h2 class="gallery-card__title">${briefing.title} ↗</h2>
        </div>
        <p class="gallery-card__body">${briefing.summary}</p>
      </div>
      <div class="gallery-card__thumb" aria-hidden="true"><div class="${briefing.thumb}"></div></div>`;
  } else {
    link.innerHTML = `
      <div class="demo-card__kicker">${briefing.kicker}</div>
      <h3 class="demo-card__title">${briefing.title} ↗</h3>
      <p class="demo-card__body">${briefing.summary}</p>`;
  }
  return link;
}

function buildGallery() {
  refs.demoList.replaceChildren(...DEMOS.map((demo) => demoCard(demo)));
  refs.galleryView.replaceChildren(
    ...DEMOS.map((demo) => demoCard(demo, true)),
    ...BRIEFINGS.map((b) => briefingCard(b, true))
  );
}

async function selectDemo(id) {
  const demo = byId.get(id);
  if (!demo) return showGallery();
  refs.modeLabel.textContent = demo.kicker;
  refs.stepLabel.textContent = "Loading";
  try {
    const Demo = await demo.load();
    current = new Demo(api);
    refs.galleryView.hidden = true;
    refs.demoView.hidden = false;
    current.mount(refs.stageHost, refs.demoControls);
    history.replaceState(null, "", `#${id}`);
    document.querySelectorAll("[data-demo-id]").forEach((button) => {
      button.setAttribute("aria-current", button.dataset.demoId === id ? "true" : "false");
    });
    updateNav();
  } catch (error) {
    console.error(error);
    api.toast(`Could not load ${demo.title}. Check the console for module details.`);
    refs.modeLabel.textContent = "Demo gallery";
    refs.stepLabel.textContent = "Load failed";
    showGallery();
  }
}

function showGallery() {
  current = null;
  refs.galleryView.hidden = false;
  refs.demoView.hidden = true;
  refs.stageHost.replaceChildren();
  refs.demoControls.replaceChildren();
  refs.modeLabel.textContent = "Demo gallery";
  refs.stepLabel.textContent = "Choose a graphic";
  history.replaceState(null, "", "#gallery");
  document.querySelectorAll("[data-demo-id]").forEach((button) => button.setAttribute("aria-current", "false"));
}

function updateNav() {
  const hasDemo = Boolean(current);
  refs.btnSvg.disabled = !hasDemo;
  refs.btnRecord.disabled = !hasDemo;
  refs.btnPrev.disabled = !hasDemo || !current.canStep(-1);
  refs.btnNext.disabled = !hasDemo || !current.canStep(1);
}

async function recordCurrent() {
  if (!current) return;
  const snap = current.snapshot ? current.snapshot() : null;
  refs.btnRecord.disabled = true;
  refs.btnRecord.querySelector("span:last-child").textContent = "Recording";
  try {
    await recordSvgMotion({
      filenameBase: `pulsar-${current.constructor.id}`,
      duration: current.constructor.id === "scan-consensus" ? 5.2 : 4.4,
      getSvg: () => current.getSvg(),
      renderFrame: (t, duration) => current.renderFrame(t, duration),
    });
    api.toast("Recording exported.");
  } catch (error) {
    console.error(error);
    api.toast(error.message || "Recording failed. Check the console.");
  } finally {
    if (snap && current?.restore) current.restore(snap);
    else current?.render?.();
    refs.btnRecord.querySelector("span:last-child").textContent = "Record";
    updateNav();
  }
}

refs.btnGallery.addEventListener("click", showGallery);
refs.btnSvg.addEventListener("click", () => {
  if (!current?.getSvg()) return;
  downloadSvg(current.getSvg(), `pulsar-${current.constructor.id}.svg`);
  api.toast("SVG exported.");
});
refs.btnRecord.addEventListener("click", recordCurrent);
refs.btnPrev.addEventListener("click", () => current?.step(-1));
refs.btnNext.addEventListener("click", () => current?.step(1));
refs.btnPlay.addEventListener("click", () => current?.play());

addEventListener("keydown", (event) => {
  if (event.target && event.target.tagName === "INPUT") return;
  if (!current) return;
  if (event.key === "ArrowLeft") current.step(-1);
  if (event.key === "ArrowRight") current.step(1);
  if (event.key === " ") {
    event.preventDefault();
    current.play();
  }
});

addEventListener("hashchange", () => {
  const id = location.hash.replace("#", "");
  if (id === "gallery" || !id) showGallery();
  else if (byId.has(id) && current?.constructor.id !== id) void selectDemo(id);
});

buildGallery();
const initial = location.hash.replace("#", "");
if (byId.has(initial)) void selectDemo(initial);
else showGallery();
