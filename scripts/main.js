import { downloadSvg, recordSvgMotion } from "./svg-exporter.js";

const doc = document;
const DEMOS = [
  {
    id: "presentation",
    title: "Pulsar Interactive Briefing",
    kicker: "Similarity Space to Learned Manifolds",
    summary: "A continuous interactive journey showing why traditional rigid filtering fails and how Pulsar solves it.",
    thumb: "thumb-manifold",
    load: () => import("./unified-demo.js").then((mod) => mod.UnifiedStoryDemo),
  }
];

const byId = new Map(DEMOS.map((demo) => [demo.id, demo]));

const refs = {
  demoView: doc.querySelector("#demoView"),
  stageHost: doc.querySelector("#stageHost"),
  demoControls: doc.querySelector("#demoControls"),
  demoKicker: doc.querySelector("#demoKicker"),
  demoTitle: doc.querySelector("#demoTitle"),
  demoBody: doc.querySelector("#demoBody"),
  demoMetrics: doc.querySelector("#demoMetrics"),
  modeLabel: doc.querySelector("#modeLabel"),
  stepLabel: doc.querySelector("#stepLabel"),
  btnSvg: doc.querySelector("#btnSvg"),
  btnRecord: doc.querySelector("#btnRecord"),
  btnPrev: doc.querySelector("#btnPrev"),
  btnNext: doc.querySelector("#btnNext"),
  dotContainer: doc.querySelector("#dotContainer"),
  stageNum: doc.querySelector("#stageNum"),
  toast: doc.querySelector("#toast"),
};

let cur = null;
let toastTimer = null;

const api = {
  updateDetails({ kicker, title, body, metrics = [], modeLabel, stepLabel }) {
    refs.demoKicker.textContent = kicker;
    refs.demoKicker.hidden = !kicker;
    refs.demoTitle.textContent = title;
    refs.demoBody.textContent = body;
    refs.demoBody.hidden = !body;
    refs.demoMetrics.hidden = !metrics || !metrics.length;
    refs.demoMetrics.innerHTML = metrics ? metrics.map(([label, val]) => `
      <div class="metric">
        <div class="metric__label">${label}</div>
        <div class="metric__value">${val}</div>
      </div>`).join("") : "";
    const activeStep = stepLabel;
    const metaContainer = doc.querySelector(".topbar__meta");
    if (metaContainer) {
      metaContainer.innerHTML = `
        <span class="topbar-step ${activeStep === "Topology" ? "active" : ""}">Topology</span>
        <span class="topbar-sep">·</span>
        <span class="topbar-step ${activeStep === "Geometry" ? "active" : ""}">Geometry</span>
        <span class="topbar-sep">·</span>
        <span class="topbar-step ${activeStep === "Machine Learning" ? "active" : ""}">Machine Learning</span>
      `;
    }
    updateNav();
  },
  toast(msg) {
    refs.toast.textContent = msg;
    refs.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => refs.toast.classList.remove("show"), 2600);
  },
};

async function selectDemo(id) {
  const demo = byId.get(id);
  if (!demo) return;
  refs.modeLabel.textContent = demo.kicker;
  refs.stepLabel.textContent = "Loading";
  try {
    const Demo = await demo.load();
    cur = new Demo(api);
    refs.demoView.hidden = false;
    cur.mount(refs.stageHost, refs.demoControls);
    history.replaceState(null, "", `#${id}`);
    updateNav();
  } catch (err) {
    console.error(err);
    api.toast(`Could not load ${demo.title}. Check the console for details.`);
  }
}

function updateNav() {
  const hasDemo = Boolean(cur);
  refs.btnSvg.disabled = !hasDemo;
  refs.btnRecord.disabled = !hasDemo;
  refs.btnPrev.disabled = !hasDemo || !cur.canStep(-1);
  refs.btnNext.disabled = !hasDemo || !cur.canStep(1);

  if (hasDemo && cur.stepIndex !== undefined) {
    if (refs.dotContainer && refs.dotContainer.children.length !== 4) {
      refs.dotContainer.innerHTML = "";
      for (let i = 0; i < 4; i++) {
        const dot = doc.createElement("button");
        dot.className = "progress-dot";
        dot.type = "button";
        dot.title = `Go to slide ${i + 1}`;
        dot.addEventListener("click", () => {
          cur.stepIndex = i;
          cur.render();
        });
        refs.dotContainer.appendChild(dot);
      }
    }

    if (refs.dotContainer) {
      Array.from(refs.dotContainer.children).forEach((dot, idx) => {
        dot.classList.toggle("active", idx === cur.stepIndex);
      });
    }

    if (refs.stageNum) {
      refs.stageNum.textContent = String(cur.stepIndex + 1).padStart(2, "0");
    }
  }
}

async function recordCurrent() {
  if (!cur) return;
  const snap = cur.snapshot ? cur.snapshot() : null;
  refs.btnRecord.disabled = true;
  refs.btnRecord.querySelector("span:last-child").textContent = "Recording";
  try {
    await recordSvgMotion({
      filenameBase: `pulsar-${cur.constructor.id}`,
      duration: cur.constructor.id === "scan-consensus" ? 5.2 : 4.4,
      getSvg: () => cur.getSvg(),
      renderFrame: (t, duration) => cur.renderFrame(t, duration),
    });
    api.toast("Recording exported.");
  } catch (err) {
    console.error(err);
    api.toast(err.msg || "Recording failed. Check the console.");
  } finally {
    if (snap && cur?.restore) cur.restore(snap);
    else cur?.render?.();
    refs.btnRecord.querySelector("span:last-child").textContent = "Record";
    updateNav();
  }
}

refs.btnSvg.addEventListener("click", () => {
  if (!cur?.getSvg()) return;
  downloadSvg(cur.getSvg(), `pulsar-${cur.constructor.id}.svg`);
  api.toast("SVG exported.");
});

refs.btnRecord.addEventListener("click", recordCurrent);
refs.btnPrev.addEventListener("click", () => cur?.step(-1));
refs.btnNext.addEventListener("click", () => cur?.step(1));

addEventListener("keydown", (event) => {
  if (event.target && event.target.tagName === "INPUT") return;
  if (!cur) return;
  if (event.key === "ArrowLeft") cur.step(-1);
  if (event.key === "ArrowRight") cur.step(1);
  if (event.key === " ") {
    event.preventDefault();
    cur.step(1);
  }
});

addEventListener("hashchange", () => {
  const id = location.hash.replace("#", "");
  if (byId.has(id) && (!cur || cur.constructor.id !== id)) {
    void selectDemo(id);
  }
});

// Boot the unified briefing immediately!
void selectDemo("presentation");
