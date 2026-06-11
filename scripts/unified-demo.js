import { CubeThresholdDemo, ScanConsensusDemo } from "./voxel-demos.js";
import { CrescentFilterDemo, ManifoldFeedbackDemo } from "./planar-demos.js";
import {
  PATIENTS,
  boxDims,
  boxStats,
  drawPatients,
  drawFilter,
  fieldContours,
  loopsPath,
  px,
  py,
  VIEW,
  N_T,
  N_ALL
} from "./planar-demos.js";
import { clamp, easeInOut, lerp, svgEl } from "./utils.js";

class VerdictSubDemo {
  constructor(api) {
    this.api = api;
    this.s = 0.5;
    this.mode = "manifold";
  }

  mount(stageHost, controlsHost) {
    this.host = document.createElement("div");
    this.host.className = "graphic-host";
    stageHost.replaceChildren(this.host);

    this.controls = document.createElement("div");
    this.controls.className = "control-stack";
    controlsHost.replaceChildren(this.controls);

    this.render();
  }

  render() {
    const svg = svgEl("svg", { viewBox: `0 0 ${VIEW.w} ${VIEW.h}`, role: "img" }, [
      svgEl("rect", { x: 0, y: 0, width: VIEW.w, height: VIEW.h, fill: "#ffffff" }),
      svgEl("g", { opacity: "0.34" }, [
        ...Array.from({ length: 15 }, (_, i) => svgEl("line", { x1: px(i), y1: py(0), x2: px(i), y2: py(14), stroke: "rgba(32,35,51,0.10)", "stroke-width": 1 })),
        ...Array.from({ length: 15 }, (_, i) => svgEl("line", { x1: px(0), y1: py(i), x2: px(14), y2: py(i), stroke: "rgba(32,35,51,0.10)", "stroke-width": 1 })),
      ]),
    ]);

    if (this.mode === "manifold") {
      const cohortLoops = fieldContours((p) => ((p.co === "T") ? 1 : 0));
      svg.appendChild(svgEl("path", {
        d: loopsPath(cohortLoops),
        fill: "rgba(13,126,143,0.11)",
        stroke: "rgba(13,126,143,0.9)",
        "stroke-width": 3,
        "stroke-linejoin": "round",
        "fill-rule": "evenodd",
      }));
    } else {
      drawFilter(svg, this.s);
    }

    const d = this.mode === "filter" ? boxDims(this.s) : null;
    const inside = d ? (p) => p.x >= d.x0 && p.x < d.x0 + d.bw && p.y >= d.y0 && p.y < d.y0 + d.bh && p.z >= d.z0 && p.z < d.z0 + d.bd : () => false;

    for (const p of PATIENTS) {
      let fill = "#e6e8e5";
      let stroke = "rgba(32,35,51,0.35)";
      let size = 18;
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
      }

      if (this.mode === "filter") {
        const isInside = inside(p);
        if (isInside && p.co !== "T") {
          fill = "rgba(169,106,8,0.38)";
          stroke = "#a96a08";
        }
        if (!isInside && p.co === "T") {
          fill = "rgba(217,38,66,0.56)";
          stroke = "#d92642";
        }
      }

      svg.appendChild(svgEl("rect", {
        x: px(p.x) + (28 - size) / 2,
        y: py(p.z) + (28 - size) / 2,
        width: size,
        height: size,
        rx: 3,
        fill,
        stroke,
        "stroke-width": 1.2,
      }));
    }

    this.host.replaceChildren(svg);

    this.controls.innerHTML = `
      <div class="control-group">
        <div class="control-row">
          <span class="control-label">Verdict Mode</span>
        </div>
        <div class="choice-row">
          <button id="vManifold" class="choice-button ${this.mode === "manifold" ? "is-active" : ""}" type="button">Manifold</button>
          <button id="vFilter" class="choice-button ${this.mode === "filter" ? "is-active" : ""}" type="button">Filter</button>
        </div>
      </div>
      <div id="sliderWrap" class="control-group" style="${this.mode === "filter" ? "" : "opacity: 0.3; pointer-events: none;"}">
        <div class="control-row">
          <span class="control-label">Filter Box Size</span>
          <span id="rectSizeVal" class="control-value">${Math.round(this.s * 100)}%</span>
        </div>
        <input id="rectRange" class="range" type="range" min="0" max="100" value="${Math.round(this.s * 100)}" ${this.mode === "filter" ? "" : "disabled"}>
      </div>
    `;

    this.controls.querySelector("#vManifold").addEventListener("click", () => {
      this.mode = "manifold";
      this.render();
      this.updateCopy();
    });
    this.controls.querySelector("#vFilter").addEventListener("click", () => {
      this.mode = "filter";
      this.render();
      this.updateCopy();
    });
    if (this.mode === "filter") {
      const range = this.controls.querySelector("#rectRange");
      range.addEventListener("input", () => {
        this.s = Number(range.value) / 100;
        this.render();
        this.updateCopy();
      });
    }

    this.updateCopy();
  }

  updateCopy() {
    let missed = 0;
    let fp = 0;
    if (this.mode === "filter") {
      const st = boxStats(this.s);
      missed = st.missed;
      fp = st.fp;
    }

    this.api.updateDetails({
      kicker: "11 / 11 · Final Verdict",
      title: "Two languages. One verdict.",
      body: "Flip between the learned manifold and a rectangular box on the same similarity plane. One wraps the cohort exactly; the other never stops paying in misses and false positives.",
      metrics: [
        ["Targets missed", String(missed)],
        ["False positives", String(fp)],
        ["Targets", String(N_T)],
        ["Records", String(N_ALL)],
      ],
      modeLabel: "Final Verdict",
      stepLabel: "Verdict",
    });
  }

  getSvg() {
    return this.host?.querySelector("svg") || null;
  }
}

class UnifiedStoryDemo {
  static id = "presentation";
  static title = "Pulsar Interactive Briefing";
  static kicker = "Similarity Space to Learned Manifolds";
  static summary = "A continuous interactive journey showing why traditional rigid filtering fails and how Pulsar solves it.";
  static thumb = "thumb-manifold";

  constructor(api) {
    this.api = api;
    this.stepIndex = 0;
    this.slide1Revealed = 0;
    this.slide1Raf = null;
    this.animPlayed = false;

    this.wrapperApi = {
      updateDetails: (details) => {
        const slide = this.getSlideConfig();
        const finalDetails = {
          ...details,
          kicker: slide.kicker,
          title: slide.title,
          body: slide.body,
          stepLabel: slide.stepLabel,
        };
        if (slide.metrics) {
          finalDetails.metrics = slide.metrics;
        }
        this.api.updateDetails(finalDetails);
      },
      toast: (msg) => this.api.toast(msg)
    };

    this.cubeDemo = new CubeThresholdDemo(this.wrapperApi);
    this.scanDemo = new ScanConsensusDemo(this.wrapperApi);
    this.scanDemo.singularScaffold = true;
    this.scanDemo.solidGrayPartials = true;
    this.crescentDemo = new CrescentFilterDemo(this.wrapperApi);
    this.manifoldDemo = new ManifoldFeedbackDemo(this.wrapperApi);
    this.verdictDemo = new VerdictSubDemo(this.wrapperApi);
  }

  getSlideConfig() {
    const slides = [
      {
        kicker: "",
        title: "Every cube represents a patient.",
        body: "Each cube should be thought of as a patient in the EHR. The task? Determine which patients are good candidates for a clinical trial.",
        stepLabel: "Space",
        demo: "scan",
        stepIndex: 1,
        metrics: [],
        hasAnimation: true
      },
      {
        kicker: "02 / 04 · Threshold Problem",
        title: "Why Filters Fail",
        body: "A tight filter misses valid candidates. A loose filter creates overwhelming review burden. Adjust the slider to choose which failure mode dominates.",
        stepLabel: "Thresholds",
        demo: "cube",
        stepIndex: 2,
        hasAnimation: false
      },
      {
        kicker: "03 / 04 · Non-destructive Scan",
        title: "Thinking outside of a box.",
        body: "Instead of filtering records, Pulsar captures desired patient attributes in all of their complex glory.",
        stepLabel: "Scans",
        demo: "scan",
        stepIndex: 0,
        metrics: [],
        hasAnimation: true
      },
      {
        kicker: "04 / 04 · Compare",
        title: "The best threshold box still clips the shape.",
        body: "The red frame is the optimal threshold block from prior steps. It still misses part of the discovered cohort.",
        stepLabel: "Compare",
        demo: "scan",
        stepIndex: 2,
        metrics: [
          ["Consensus cells", "33"],
          ["Missed by box", "42"],
          ["Cells destroyed", "0"]
        ],
        hasAnimation: false
      }
    ];
    return slides[this.stepIndex];
  }

  getActiveDemo() {
    const config = this.getSlideConfig();
    if (config.demo === "cube") return this.cubeDemo;
    if (config.demo === "scan") return this.scanDemo;
    if (config.demo === "crescent") return this.crescentDemo;
    if (config.demo === "manifold") return this.manifoldDemo;
    return this.verdictDemo;
  }

  mount(stageHost, controlsHost) {
    this.stageHost = stageHost;
    this.controlsHost = controlsHost;
    this.render();
  }

  stopSlideAnimations() {
    if (this.slide1Raf) {
      cancelAnimationFrame(this.slide1Raf);
      this.slide1Raf = null;
    }
  }

  step(delta) {
    const config = this.getSlideConfig();
    const hasAnim = config.hasAnimation;

    if (delta > 0) {
      if (hasAnim && !this.animPlayed) {
        this.animPlayed = true;
        this.play();
      } else {
        if (this.stepIndex < 3) {
          this.stepIndex++;
          this.animPlayed = false;
          this.slide1Revealed = 0;
          this.stopSlideAnimations();
          this.render();
        }
      }
    } else {
      if (hasAnim && this.animPlayed) {
        this.animPlayed = false;
        this.slide1Revealed = 0;
        this.stopSlideAnimations();
        this.render();
      } else {
        if (this.stepIndex > 0) {
          this.stepIndex--;
          this.animPlayed = false;
          this.slide1Revealed = 0;
          this.stopSlideAnimations();
          this.render();
        }
      }
    }
  }

  canStep(delta) {
    const config = this.getSlideConfig();
    const hasAnim = config.hasAnimation;
    if (delta > 0) {
      return (hasAnim && !this.animPlayed) || this.stepIndex < 3;
    } else {
      return (hasAnim && this.animPlayed) || this.stepIndex > 0;
    }
  }

  render() {
    const config = this.getSlideConfig();
    const demo = this.getActiveDemo();

    if (config.demo === "cube") {
      this.cubeDemo.stepIndex = config.stepIndex;
    } else if (config.demo === "scan") {
      this.scanDemo.stepIndex = config.stepIndex;
    } else if (config.demo === "manifold") {
      this.manifoldDemo.stepIndex = config.stepIndex;
      if (config.stepIndex === 0) {
        this.manifoldDemo.reset();
      } else if (config.stepIndex === 2) {
        this.manifoldDemo.removed = new Set();
        this.manifoldDemo.added = new Set();
        this.manifoldDemo.applyRejects(1);
        this.manifoldDemo.applyAccepts(1);
      }
    }

    if (config.stepLabel === "Space" || config.stepLabel === "Filters" || config.stepLabel === "Scans" || config.stepLabel === "Consensus" || config.stepLabel === "Compare" || config.stepLabel === "Lift" || config.stepLabel === "Manifold") {
      if (this.stepIndex === 0) {
        if (this.slide1Revealed === 0) {
          this.controlsHost.replaceChildren(); // Completely empty left controls panel initially
        } else {
          const legend = document.createElement("div");
          legend.className = "control-group";
          legend.style.cssText = "padding: 16px; display: flex; flex-direction: column; gap: 14px; background: var(--panel); box-shadow: var(--shadow-border);";
          legend.innerHTML = `
            <div class="control-label" style="font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--rule); padding-bottom: 8px;">
              Legend
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 4px;">
              <div style="display: flex; align-items: start; gap: 12px;">
                <div style="width: 14px; height: 14px; background: rgba(13, 126, 143, 0.92); border: 1px solid #0a5f6d; flex-shrink: 0; border-radius: 2px;"></div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <strong style="font-size: 11px; color: var(--ink); font-weight: 600;">Target Patients</strong>
                  <span style="font-size: 10px; color: var(--muted); line-height: 1.4;">Patients well fit for the clinical trial.</span>
                </div>
              </div>
              <div style="display: flex; align-items: start; gap: 12px;">
                <div style="width: 14px; height: 14px; background: rgb(215, 217, 218); border: 1px solid rgb(110, 114, 110); flex-shrink: 0; border-radius: 2px;"></div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <strong style="font-size: 11px; color: var(--ink); font-weight: 600;">Non-Target Patients</strong>
                  <span style="font-size: 10px; color: var(--muted); line-height: 1.4;">All other patients on record.</span>
                </div>
              </div>
            </div>
          `;
          this.controlsHost.replaceChildren(legend);
        }
      } else if (this.stepIndex === 2) {
        this.controlsHost.replaceChildren(); // Completely empty left controls panel for Slide 3!
      } else {
        const emptyControls = document.createElement("div");
        emptyControls.className = "control-group";
        emptyControls.innerHTML = `<span class="control-label">Story step ${config.stepLabel}</span><p style="font-size:11px;color:var(--muted);margin-top:6px;">Use Prev/Next navigation at the bottom right to step through the briefing.</p>`;
        this.controlsHost.replaceChildren(emptyControls);
      }
      
      demo.host = document.createElement("div");
      demo.host.className = "graphic-host graphic-host--bob";
      this.stageHost.replaceChildren(demo.host);
      if (this.stepIndex === 0) {
        demo.render({ hideCage: true, lit: 1, partialA: 1, plane: null, redBox: false, slide1Revealed: this.slide1Revealed });
      } else {
        demo.render();
      }
    } else {
      demo.mount(this.stageHost, this.controlsHost);
    }

    demo.updateCopy();

    const oldCaption = this.stageHost.querySelector("#stageCaption");
    if (oldCaption) {
      oldCaption.remove();
    }
  }

  play() {
    if (this.stepIndex === 0) {
      if (this.slide1Raf) {
        cancelAnimationFrame(this.slide1Raf);
      }
      const start = performance.now();
      const duration = 1800;
      const tick = (now) => {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / duration);
        this.slide1Revealed = easeInOut(t);
        this.render();
        if (t < 1) {
          this.slide1Raf = requestAnimationFrame(tick);
        } else {
          this.slide1Raf = null;
        }
      };
      this.slide1Raf = requestAnimationFrame(tick);
    } else {
      const demo = this.getActiveDemo();
      if (demo && typeof demo.play === "function") {
        demo.play();
      }
    }
  }

  getSvg() {
    const demo = this.getActiveDemo();
    return demo ? demo.getSvg() : null;
  }

  renderFrame(t, duration) {
    const demo = this.getActiveDemo();
    if (demo && typeof demo.renderFrame === "function") {
      return demo.renderFrame(t, duration);
    }
  }
}

export { UnifiedStoryDemo };
