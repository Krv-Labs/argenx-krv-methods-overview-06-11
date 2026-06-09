import { gsap } from "gsap";
import { setMoldMorph } from "./shapes.js";

function setCaption(ui, { eyebrow, title, sub }) {
  ui.eyebrow.textContent = eyebrow;
  ui.title.textContent = title;
  ui.sub.textContent = sub;
}

function setStats(ui, { found, noise, time, tone = "neutral" }) {
  ui.statFound.textContent = found;
  ui.statNoise.textContent = noise;
  ui.statTime.textContent = time;
  for (const node of ui.statCards) {
    if (tone === "neutral") {
      node.removeAttribute("data-tone");
    } else {
      node.setAttribute("data-tone", tone);
    }
  }
}

function clearCallouts(ui) {
  ui.callouts.innerHTML = "";
}

function addCallout(ui, text, xPercent, yPercent, tone = "danger") {
  const node = document.createElement("div");
  node.className = "callout";
  node.setAttribute("data-tone", tone);
  node.textContent = text;
  node.style.left = `${xPercent}%`;
  node.style.top = `${yPercent}%`;
  ui.callouts.appendChild(node);
}

function tweenCamera(tl, cameraState, values, position = "<", duration = 1.1) {
  tl.to(cameraState, { ...values, duration, ease: "power2.inOut" }, position);
}

function animateSceneUiIn(tl, ui, position = "<") {
  tl.fromTo(ui.caption, { y: 10, opacity: 0.55 }, { y: 0, opacity: 1, duration: 0.42, ease: "power2.out" }, position);
  tl.fromTo(ui.stats, { y: 9, opacity: 0.72 }, { y: 0, opacity: 1, duration: 0.42, ease: "power2.out" }, position);
  tl.fromTo(ui.callouts, { opacity: 0.25 }, { opacity: 1, duration: 0.36, ease: "power1.out" }, position);
}

function scene1Target({ tl, actors, ui, cameraState }) {
  tl.addLabel("scene1");
  tl.call(() => {
    clearCallouts(ui);
    setCaption(ui, {
      eyebrow: "Clinical trial candidate shape",
      title: "Each EHR has its own candidate manifold.",
      sub: "Two cohorts in UMAP space show that true clinical boundaries differ across systems.",
    });
    setStats(ui, {
      found: "Unknown",
      noise: "Unknown",
      time: "Manual curation",
      tone: "neutral",
    });
  });
  tweenCamera(tl, cameraState, { x: 0, y: 4.85, z: 10.9, tx: 0, ty: 1.04, tz: 0 }, "<", 1.1);
  tl.to(actors.sculpture.position, { y: 1.06, duration: 1.2, ease: "power2.out" }, "<");
  tl.to(actors.sculpture.rotation, { y: Math.PI * 2, duration: 4.8, ease: "none" }, "<");
  animateSceneUiIn(tl, ui, "<");
}

function scene2TooNarrow({ tl, actors, ui, cameraState }) {
  tl.addLabel("scene2");
  tl.call(() => {
    setCaption(ui, {
      eyebrow: "Competitor method",
      title: "Threshold filters are often too narrow.",
      sub: "A tight rectangle cuts off valid candidates. You miss patients that should qualify.",
    });
    setStats(ui, {
      found: "12 / 47 found",
      noise: "Low, but incomplete",
      time: "Re-run required",
      tone: "danger",
    });
    clearCallouts(ui);
    addCallout(ui, "Missed patients", 41, 32, "danger");
    addCallout(ui, "Missed patients", 63, 42, "danger");
    addCallout(ui, "Missed patients", 51, 53, "danger");
  });
  tweenCamera(tl, cameraState, { x: -0.42, y: 4.5, z: 9.7, tx: -0.04, ty: 1.05, tz: 0 }, "<", 0.95);
  tl.set(actors.block.scale, { x: 0.58, y: 0.54, z: 0.58 });
  tl.to(actors.block, { visible: true, duration: 0 }, "<");
  tl.to(actors.block.position, { y: 1.08, duration: 0.8, ease: "back.out(1.4)" });
  tl.to(actors.sculpture.scale, { x: 0.98, y: 1.06, z: 0.98, duration: 1.1, ease: "sine.inOut" }, "<");
  tl.to(actors.sculpture.scale, { x: 0.92, y: 0.92, z: 0.92, duration: 1.1, ease: "sine.inOut" });
  animateSceneUiIn(tl, ui, "<");
}

function scene3TooWide({ tl, actors, ui, cameraState }) {
  tl.addLabel("scene3");
  tl.call(() => {
    setCaption(ui, {
      eyebrow: "Competitor method",
      title: "Wider filters shift the burden back to clinicians.",
      sub: "You find the right patients, but review a large pile of false positives.",
    });
    setStats(ui, {
      found: "47 / 47 found",
      noise: "200 false positives",
      time: "~8 clinician hours",
      tone: "danger",
    });
    clearCallouts(ui);
  });
  tweenCamera(tl, cameraState, { x: 0.72, y: 4.2, z: 8.8, tx: 0.2, ty: 1.02, tz: 0 }, "<", 1.05);

  tl.to(actors.block.scale, { x: 1.28, y: 1.18, z: 1.3, duration: 0.9, ease: "power2.out" });
  tl.to(actors.block.material, { opacity: 0.92, duration: 0.6 }, "<");
  animateSceneUiIn(tl, ui, "<");
}

function scene4PulsarMold({ tl, actors, ui, cameraState }) {
  tl.addLabel("scene4");
  tl.call(() => {
    setCaption(ui, {
      eyebrow: "Pulsar method",
      title: "Pulsar proposes first-pass fits for both EHR manifolds.",
      sub: "Suggested surfaces approximate each true topology before clinical feedback.",
    });
    setStats(ui, {
      found: "47 / 47 found",
      noise: "Low review noise",
      time: "~20 minutes",
      tone: "good",
    });
    clearCallouts(ui);
    addCallout(ui, "Suggested fit", 69, 34, "danger");
  });
  tweenCamera(tl, cameraState, { x: 0.08, y: 4.25, z: 8.2, tx: 0, ty: 1.09, tz: 0 }, "<", 1.05);
  tl.to(actors.block.material, { opacity: 0, duration: 0.8, ease: "power2.out" });
  tl.to(actors.block, { visible: false, duration: 0 }, ">");
  tl.to(actors.mold, { visible: true, duration: 0 }, "<");

  const morphState = actors.mold.userData.morph;
  tl.to(
    morphState,
    {
      fit: 1,
      refine: 0,
      duration: 2.2,
      ease: "power2.inOut",
      onUpdate: () => setMoldMorph(actors.mold, morphState.fit, morphState.refine),
    },
    "<",
  );

  animateSceneUiIn(tl, ui, "<");
}

function scene5Feedback({ tl, actors, ui, cameraState }) {
  tl.addLabel("scene5");
  tl.call(() => {
    setCaption(ui, {
      eyebrow: "Learning loop",
      title: "After curation, doctors can focus on best-possible recommendations.",
      sub: "Feedback tightens each manifold fit, then clinician expertise targets a small ideal region for final recommendations.",
    });
    setStats(ui, {
      found: "47 / 47 found",
      noise: "Minimal false positives",
      time: "Clinician time shifts to best recommendations",
      tone: "good",
    });
    clearCallouts(ui);
    addCallout(ui, "Doctor feedback", 31, 62, "good");
    addCallout(ui, "Ideal recommendation region", 68, 30, "good");
  });
  tweenCamera(tl, cameraState, { x: 0, y: 4.05, z: 8.55, tx: 0, ty: 1.17, tz: 0 }, "<", 0.95);

  tl.set(actors.idealRegions, { visible: true }, "<");
  tl.to(
    actors.idealRegions.map((node) => node.scale),
    { x: 1, y: 1, z: 1, duration: 0.55, ease: "back.out(1.5)" },
    "<",
  );
  tl.to(
    actors.idealRegionMaterials,
    { opacity: 0.95, duration: 0.45, ease: "power2.out" },
    "<",
  );
  const morphState = actors.mold.userData.morph;
  tl.to(
    morphState,
    {
      refine: 1,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => setMoldMorph(actors.mold, morphState.fit, morphState.refine),
    },
    "<",
  );

  for (let i = 0; i < 3; i += 1) {
    tl.to(actors.mold.scale, {
      x: 1.02 - i * 0.005,
      y: 1.03 - i * 0.006,
      z: 1.02 - i * 0.005,
      duration: 0.35,
      ease: "sine.inOut",
    });
    tl.to(actors.mold.scale, { x: 1, y: 1, z: 1, duration: 0.35, ease: "sine.inOut" });
  }

  tl.to(ui.tagline, { opacity: 1, y: -4, duration: 0.7, ease: "power2.out" }, "-=0.2");
  animateSceneUiIn(tl, ui, "<");
}

export function buildScenes(ctx) {
  const tl = ctx.timeline;

  const sceneCtx = { ...ctx, tl };
  scene1Target(sceneCtx);
  scene2TooNarrow(sceneCtx);
  scene3TooWide(sceneCtx);
  scene4PulsarMold(sceneCtx);
  scene5Feedback(sceneCtx);

  return {
    labels: ["scene1", "scene2", "scene3", "scene4", "scene5"],
  };
}
