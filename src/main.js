import * as THREE from "three";
import { gsap } from "gsap";
import { createStage } from "./stage.js";
import * as shapes from "./shapes.js";
import { buildScenes } from "./scenes.js";

const params = new URLSearchParams(window.location.search);
const isFigmaMode = params.get("figma") === "1";
const isDeckMode = params.get("deck") === "1";
const isCleanMode = params.get("clean") === "1";
const shouldAutoplay = params.get("autoplay") !== "0";
const shouldLoop = params.get("loop") === "1";
const showSafeGuides = params.get("safe") === "1" || isFigmaMode;
const EHR_OFFSET = 1.55;

const canvas = document.querySelector("#stage");
const stage = createStage(canvas);
const bootStatus = document.querySelector("#boot-status");
document.body.classList.toggle("deck-mode", isDeckMode);
document.body.classList.toggle("clean-mode", isCleanMode);
document.body.classList.toggle("figma-mode", isFigmaMode);
document.body.classList.toggle("safe-guides", showSafeGuides);

let cohortSurfaceMeta = null;
let sculpture = shapes.makeSculpture();
let sculptureB = shapes.makeSculpture();
try {
  if (typeof shapes.loadTwoCohortUmap === "function" && typeof shapes.makeSculptureFromPointCloud === "function") {
    const cohorts = await shapes.loadTwoCohortUmap("./graves_patients_unified_labeled.csv", 150);
    sculpture = shapes.makeSculptureFromPointCloud(cohorts[0].points);
    sculptureB = shapes.makeSculptureFromPointCloud(cohorts[1].points);
    cohortSurfaceMeta = { cohorts };
  } else if (typeof shapes.loadMysteryCohortUmap === "function" && typeof shapes.makeSculptureFromPointCloud === "function") {
    const cohort = await shapes.loadMysteryCohortUmap("./graves_patients_unified_labeled.csv", 150);
    sculpture = shapes.makeSculptureFromPointCloud(cohort.points);
    sculptureB = shapes.makeSculpture();
    cohortSurfaceMeta = { cohort };
  }
} catch (error) {
  console.warn("Falling back to procedural sculpture:", error);
}

sculpture.position.x = -EHR_OFFSET;
sculptureB.position.x = EHR_OFFSET;

function styleCompetitorBlock(mesh, { color, emissive }) {
  mesh.visible = false;
  mesh.material.transparent = true;
  mesh.material.opacity = 0.92;
  mesh.material.color.set(color);
  mesh.material.emissive.set(emissive);
  mesh.material.emissiveIntensity = 0.2;
  mesh.material.roughness = 0.55;
}

function createIdealRecommendationRegion(sculpture, color = "#77d9aa") {
  const pos = sculpture.geometry.attributes.position;
  const probe = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  let bestScore = -Infinity;
  for (let i = 0; i < pos.count; i += 1) {
    probe.fromBufferAttribute(pos, i);
    const score = probe.y * 0.95 + probe.z * 0.45 - Math.abs(probe.x) * 0.28;
    if (score > bestScore) {
      bestScore = score;
      anchor.copy(probe);
    }
  }

  const marker = new THREE.Group();
  marker.position.copy(anchor.multiplyScalar(1.03));
  marker.visible = false;
  marker.scale.setScalar(0.01);

  const coreMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0,
    roughness: 0.25,
    metalness: 0.04,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), coreMat);

  const ringMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.016, 10, 56), ringMat);
  ring.rotation.x = Math.PI * 0.42;

  const auraMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const aura = new THREE.Mesh(new THREE.CircleGeometry(0.28, 42), auraMat);
  aura.rotation.x = -Math.PI * 0.35;

  marker.add(core);
  marker.add(ring);
  marker.add(aura);
  marker.userData.materials = [coreMat, ringMat, auraMat];
  sculpture.add(marker);
  return marker;
}

const block = shapes.makeBlock({ x: 2.7, y: 2.35, z: 2.18 });
const blockB = shapes.makeBlock({ x: 2.7, y: 2.35, z: 2.18 });
styleCompetitorBlock(block, { color: "#607b93", emissive: "#253647" });
styleCompetitorBlock(blockB, { color: "#6f7094", emissive: "#2e2c49" });
block.position.x = -EHR_OFFSET;
blockB.position.x = EHR_OFFSET;

const mold = shapes.makeMold(sculpture);
const moldB = shapes.makeMold(sculptureB);
mold.position.x = -EHR_OFFSET;
moldB.position.x = EHR_OFFSET;
const idealRegionA = createIdealRecommendationRegion(sculpture, "#77d9aa");
const idealRegionB = createIdealRecommendationRegion(sculptureB, "#86d7ff");
const idealRegionMaterials = [...idealRegionA.userData.materials, ...idealRegionB.userData.materials];

stage.anchor.add(sculpture);
stage.anchor.add(sculptureB);
stage.anchor.add(block);
stage.anchor.add(blockB);
stage.anchor.add(mold);
stage.anchor.add(moldB);
const ui = {
  caption: document.querySelector("#caption"),
  eyebrow: document.querySelector("#eyebrow"),
  title: document.querySelector("#title"),
  sub: document.querySelector("#sub"),
  statFound: document.querySelector("#stat-found"),
  statNoise: document.querySelector("#stat-noise"),
  statTime: document.querySelector("#stat-time"),
  statCards: Array.from(document.querySelectorAll(".stat")),
  callouts: document.querySelector("#callouts"),
  stats: document.querySelector("#stats"),
  hudScene: document.querySelector("#hud-scene"),
  hudProgressFill: document.querySelector("#hud-progress-fill"),
  safeGuide: document.querySelector("#safe-area-guide"),
  tagline: document.querySelector("#tagline"),
  btnPrev: document.querySelector("#btn-prev"),
  btnPlay: document.querySelector("#btn-play"),
  btnNext: document.querySelector("#btn-next"),
  btnReset: document.querySelector("#btn-reset"),
};

const cameraState = {
  x: stage.camera.position.x,
  y: stage.camera.position.y,
  z: stage.camera.position.z,
  tx: 0,
  ty: 1.05,
  tz: 0,
};

function applyInitialUi() {
  ui.eyebrow.textContent = "Clinical trial candidate shape";
  ui.title.textContent = "The ideal Graves' trial candidate is not a simple box.";
  if (cohortSurfaceMeta?.cohorts) {
    const [a, b] = cohortSurfaceMeta.cohorts;
    ui.sub.textContent = `EHR A (${a.name}) and EHR B (${b.name}) have different true manifolds in UMAP space.`;
  } else if (cohortSurfaceMeta?.cohort) {
    const label = cohortSurfaceMeta.cohort.usedMysteryLabel ? "mystery cohort" : "deterministic 150-patient subset";
    ui.sub.textContent = `Surface built from 3D UMAP coordinates of a ${label}.`;
  } else {
    ui.sub.textContent =
      "Clinicians know this profile from experience, but manually searching EHR data takes time.";
  }
  ui.statFound.textContent = "Unknown";
  ui.statNoise.textContent = "Unknown";
  ui.statTime.textContent = "Manual curation";
  for (const card of ui.statCards) {
    card.removeAttribute("data-tone");
  }
}

function getFittedViewport(width, height) {
  if (!isFigmaMode) {
    return { width, height, left: 0, top: 0 };
  }
  const targetAspect = 16 / 9;
  const currentAspect = width / height;
  if (currentAspect > targetAspect) {
    const fittedWidth = Math.round(height * targetAspect);
    return {
      width: fittedWidth,
      height,
      left: Math.round((width - fittedWidth) * 0.5),
      top: 0,
    };
  }
  const fittedHeight = Math.round(width / targetAspect);
  return {
    width,
    height: fittedHeight,
    left: 0,
    top: Math.round((height - fittedHeight) * 0.5),
  };
}

function applyViewport(width, height) {
  const viewport = getFittedViewport(width, height);
  stage.resize(viewport.width, viewport.height);
  if (isFigmaMode) {
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    canvas.style.left = `${viewport.left}px`;
    canvas.style.top = `${viewport.top}px`;
  } else {
    canvas.style.width = "";
    canvas.style.height = "";
    canvas.style.left = "";
    canvas.style.top = "";
  }
}

gsap.set(ui.caption, { opacity: 0, y: 10 });
gsap.set(ui.tagline, { opacity: 0, y: 4 });

const timeline = gsap.timeline({
  paused: true,
  defaults: {
    duration: 0.6,
    ease: "power2.out",
  },
});
const { labels } = buildScenes({
  timeline,
  stage,
  ui,
  actors: {
    sculpture,
    sculptureB,
    block,
    blockB,
    mold,
    moldB,
    idealRegions: [idealRegionA, idealRegionB],
    idealRegionMaterials,
  },
  cameraState,
});

const sceneTimes = labels.map((label) => timeline.labels[label] ?? 0);
const totalScenes = labels.length;
let sceneIndex = 0;

function clampSceneIndex(next) {
  return Math.max(0, Math.min(totalScenes - 1, next));
}

function updateHud() {
  ui.hudScene.textContent = `${sceneIndex + 1} / ${totalScenes}`;
  if (ui.hudProgressFill) {
    const progress = ((sceneIndex + 1) / totalScenes) * 100;
    ui.hudProgressFill.style.width = `${progress}%`;
  }
}

function goToScene(nextIndex, animate = true) {
  sceneIndex = clampSceneIndex(nextIndex);
  updateHud();
  const target = sceneTimes[sceneIndex];
  if (!animate) {
    timeline.pause(target);
    return;
  }
  gsap.to(timeline, { time: target, duration: 0.8, ease: "power2.inOut" });
}

function autoplay() {
  ui.btnPlay.textContent = "Pause";
  timeline.play();
}

function togglePlay() {
  if (timeline.isActive()) {
    timeline.pause();
    ui.btnPlay.textContent = "Play";
    return;
  }
  if (timeline.progress() >= 0.999) {
    resetTimeline();
    timeline.play(0);
    ui.btnPlay.textContent = "Pause";
    return;
  }
  autoplay();
}

function resetTimeline() {
  sceneIndex = 0;
  updateHud();
  timeline.pause(0);
  gsap.killTweensOf(timeline);
  mold.visible = false;
  moldB.visible = false;
  block.visible = false;
  blockB.visible = false;
  block.material.opacity = 0.92;
  blockB.material.opacity = 0.92;
  block.scale.set(1, 1, 1);
  blockB.scale.set(1, 1, 1);
  block.position.x = -EHR_OFFSET;
  blockB.position.x = EHR_OFFSET;
  block.position.y = 1.08;
  blockB.position.y = 1.08;
  idealRegionA.visible = false;
  idealRegionB.visible = false;
  idealRegionA.scale.setScalar(0.01);
  idealRegionB.scale.setScalar(0.01);
  for (const material of idealRegionMaterials) {
    material.opacity = 0;
  }
  shapes.setMoldMorph(mold, 0, 0);
  shapes.setMoldMorph(moldB, 0, 0);
  mold.userData.morph.fit = 0;
  mold.userData.morph.refine = 0;
  moldB.userData.morph.fit = 0;
  moldB.userData.morph.refine = 0;
  mold.scale.set(1, 1, 1);
  moldB.scale.set(1, 1, 1);
  mold.position.x = -EHR_OFFSET;
  moldB.position.x = EHR_OFFSET;
  mold.position.y = 1.08;
  moldB.position.y = 1.08;
  mold.rotation.set(0, 0, 0);
  moldB.rotation.set(0, 0, 0);
  sculpture.scale.set(1, 1, 1);
  sculptureB.scale.set(1, 1, 1);
  sculpture.position.x = -EHR_OFFSET;
  sculptureB.position.x = EHR_OFFSET;
  sculpture.position.y = 0;
  sculptureB.position.y = 0;
  sculpture.rotation.y = 0;
  sculptureB.rotation.y = 0;
  cameraState.x = 0;
  cameraState.y = 4.85;
  cameraState.z = 10.9;
  cameraState.tx = 0;
  cameraState.ty = 1.05;
  cameraState.tz = 0;
  ui.callouts.innerHTML = "";
  mirroredFit = -1;
  mirroredRefine = -1;
  applyInitialUi();
  gsap.set(ui.tagline, { opacity: 0, y: 4 });
  ui.btnPlay.textContent = "Play";
}

let mirroredFit = -1;
let mirroredRefine = -1;
function syncSecondaryActors() {
  sculptureB.visible = sculpture.visible;
  sculptureB.scale.copy(sculpture.scale);
  sculptureB.position.y = sculpture.position.y;
  sculptureB.rotation.y = sculpture.rotation.y;

  blockB.visible = block.visible;
  blockB.scale.copy(block.scale);
  blockB.position.y = block.position.y;
  blockB.material.opacity = block.material.opacity;

  moldB.visible = mold.visible;
  moldB.scale.copy(mold.scale);
  moldB.position.y = mold.position.y;
  mold.rotation.copy(sculpture.rotation);
  moldB.rotation.copy(sculptureB.rotation);
  const fit = mold.userData.morph.fit;
  const refine = mold.userData.morph.refine;
  if (Math.abs(fit - mirroredFit) > 0.0001 || Math.abs(refine - mirroredRefine) > 0.0001) {
    shapes.setMoldMorph(moldB, fit, refine);
    moldB.userData.morph.fit = fit;
    moldB.userData.morph.refine = refine;
    mirroredFit = fit;
    mirroredRefine = refine;
  }
}

window.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "ArrowRight") {
    event.preventDefault();
    goToScene(sceneIndex + 1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    goToScene(sceneIndex - 1);
  } else if (event.key.toLowerCase() === "r") {
    resetTimeline();
    goToScene(0, false);
  } else if (event.key.toLowerCase() === "a") {
    autoplay();
  } else if (event.key.toLowerCase() === "p") {
    togglePlay();
  } else if (event.key.toLowerCase() === "f") {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  } else if (event.key.toLowerCase() === "g") {
    document.body.classList.toggle("safe-guides");
  }
});

ui.btnNext?.addEventListener("click", () => goToScene(sceneIndex + 1));
ui.btnPrev?.addEventListener("click", () => goToScene(sceneIndex - 1));
ui.btnReset?.addEventListener("click", () => {
  resetTimeline();
  goToScene(0, false);
});
ui.btnPlay?.addEventListener("click", () => togglePlay());

window.addEventListener("resize", () => {
  applyViewport(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
applyInitialUi();
updateHud();
applyViewport(window.innerWidth, window.innerHeight);
goToScene(0, false);
if (bootStatus) {
  bootStatus.style.display = "none";
}
if (shouldAutoplay) {
  setTimeout(() => {
    autoplay();
  }, 250);
}

timeline.eventCallback("onComplete", () => {
  if (shouldLoop) {
    resetTimeline();
    timeline.play(0);
    ui.btnPlay.textContent = "Pause";
    return;
  }
  ui.btnPlay.textContent = "Replay";
});

function syncSceneFromTime() {
  const t = timeline.time();
  let nextIndex = sceneIndex;
  for (let i = sceneTimes.length - 1; i >= 0; i -= 1) {
    if (t >= sceneTimes[i]) {
      nextIndex = i;
      break;
    }
  }
  if (nextIndex !== sceneIndex) {
    sceneIndex = nextIndex;
    updateHud();
  }
}

function tick() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  syncSceneFromTime();

  stage.camera.position.set(cameraState.x, cameraState.y, cameraState.z);
  stage.camera.lookAt(cameraState.tx, cameraState.ty, cameraState.tz);

  if (timeline.time() < sceneTimes[1] || timeline.time() >= sceneTimes[4]) {
    sculpture.rotation.y += dt * 0.45;
  }
  if (timeline.time() >= sceneTimes[2] && timeline.time() < sceneTimes[4]) {
    sculpture.rotation.y += dt * 0.16;
  }
  syncSecondaryActors();
  stage.anchor.position.y = 0.02 + Math.sin(t * 0.9) * 0.015;

  stage.render();
  requestAnimationFrame(tick);
}

tick();
