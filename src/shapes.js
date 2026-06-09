import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
import { createWoodMaterial } from "./stage.js";

const noise3D = createNoise3D();

function carvePocket(worldPos, center, radius, depth) {
  const d = worldPos.distanceTo(center);
  if (d > radius) {
    return 0;
  }
  const t = 1 - d / radius;
  return -depth * t * t;
}

export function makeSculpture() {
  const geometry = new THREE.IcosahedronGeometry(1.24, 4);
  const pos = geometry.attributes.position;
  const normal = new THREE.Vector3();
  const base = new THREE.Vector3();

  const pockets = [
    new THREE.Vector3(0.7, 0.2, 0.15),
    new THREE.Vector3(-0.56, 0.62, -0.28),
    new THREE.Vector3(0.18, -0.45, -0.7),
  ];

  for (let i = 0; i < pos.count; i += 1) {
    base.fromBufferAttribute(pos, i);
    normal.copy(base).normalize();

    const p = base.clone();
    const oct1 = noise3D(p.x * 1.8, p.y * 1.8, p.z * 1.8) * 0.22;
    const oct2 = noise3D(p.x * 3.5 + 6, p.y * 3.5 - 2, p.z * 3.5 + 1) * 0.1;
    let offset = oct1 + oct2;

    for (const pocket of pockets) {
      offset += carvePocket(p, pocket, 0.64, 0.26);
    }

    const v = base.addScaledVector(normal, offset);
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.baseVertices = pos.array.slice();

  const sculpture = new THREE.Mesh(geometry, createWoodMaterial());
  sculpture.castShadow = false;
  sculpture.receiveShadow = false;
  sculpture.position.y = 0;
  sculpture.scale.setScalar(0.92);
  return sculpture;
}

function parsePoint(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function parseCsvRows(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { header: [], rows: [] };
  }
  const header = lines[0].split(",");
  const rows = lines.slice(1).map((line) => line.split(","));
  return { header, rows };
}

function normalizePoints(points) {
  const center = new THREE.Vector3();
  for (const point of points) {
    center.add(point);
  }
  center.multiplyScalar(1 / points.length);

  const centered = points.map((point) => point.clone().sub(center));
  const radii = centered.map((point) => point.length()).sort((a, b) => a - b);
  const scaleRef = radii[Math.max(0, Math.floor(radii.length * 0.94) - 1)] || 1;
  const scale = scaleRef > 0 ? 1 / scaleRef : 1;
  return centered.map((point) => point.multiplyScalar(scale));
}

export async function loadMysteryCohortUmap(
  csvUrl = "./graves_patients_unified_labeled.csv",
  targetCount = 150,
) {
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Failed to load cohort CSV: ${response.status}`);
  }

  const text = await response.text();
  const { header, rows } = parseCsvRows(text);
  const idxSubject = header.indexOf("subject_id");
  const idxCohortName = header.indexOf("unified_cohort_name");
  const idxX = header.indexOf("umap_3d_0");
  const idxY = header.indexOf("umap_3d_1");
  const idxZ = header.indexOf("umap_3d_2");

  if (idxX < 0 || idxY < 0 || idxZ < 0) {
    throw new Error("CSV missing required umap_3d_* columns.");
  }

  const parsed = [];
  for (const row of rows) {
    const x = parsePoint(row[idxX]);
    const y = parsePoint(row[idxY]);
    const z = parsePoint(row[idxZ]);
    if (x == null || y == null || z == null) {
      continue;
    }
    parsed.push({
      subjectId: idxSubject >= 0 ? String(row[idxSubject] || "") : "",
      cohortName: idxCohortName >= 0 ? String(row[idxCohortName] || "") : "",
      point: new THREE.Vector3(x, y, z),
    });
  }

  const mysteryRows = parsed.filter((row) => /mystery/i.test(row.cohortName));
  const sourceRows = mysteryRows.length > 0 ? mysteryRows : parsed;
  const selected = sourceRows
    .slice()
    .sort((a, b) => hashString(a.subjectId) - hashString(b.subjectId))
    .slice(0, Math.min(targetCount, sourceRows.length));

  if (selected.length < 16) {
    throw new Error("Not enough cohort points to generate surface.");
  }

  return {
    points: normalizePoints(selected.map((row) => row.point)),
    resolvedCount: selected.length,
    usedMysteryLabel: mysteryRows.length > 0,
    sourceCount: sourceRows.length,
  };
}

function deterministicSample(rows, targetCount) {
  return rows
    .slice()
    .sort((a, b) => hashString(a.subjectId) - hashString(b.subjectId))
    .slice(0, Math.min(targetCount, rows.length));
}

export async function loadTwoCohortUmap(
  csvUrl = "./graves_patients_unified_labeled.csv",
  targetCount = 150,
) {
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Failed to load cohort CSV: ${response.status}`);
  }

  const text = await response.text();
  const { header, rows } = parseCsvRows(text);
  const idxSubject = header.indexOf("subject_id");
  const idxCohortName = header.indexOf("unified_cohort_name");
  const idxX = header.indexOf("umap_3d_0");
  const idxY = header.indexOf("umap_3d_1");
  const idxZ = header.indexOf("umap_3d_2");

  if (idxCohortName < 0 || idxX < 0 || idxY < 0 || idxZ < 0) {
    throw new Error("CSV missing required cohort/umap columns.");
  }

  const byCohort = new Map();
  for (const row of rows) {
    const x = parsePoint(row[idxX]);
    const y = parsePoint(row[idxY]);
    const z = parsePoint(row[idxZ]);
    if (x == null || y == null || z == null) {
      continue;
    }
    const cohortName = String(row[idxCohortName] || "").trim();
    if (!cohortName) {
      continue;
    }
    const bucket = byCohort.get(cohortName) ?? [];
    bucket.push({
      subjectId: idxSubject >= 0 ? String(row[idxSubject] || "") : "",
      point: new THREE.Vector3(x, y, z),
    });
    byCohort.set(cohortName, bucket);
  }

  const ranked = Array.from(byCohort.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 2);
  if (ranked.length < 2) {
    throw new Error("Need at least two cohort groups with UMAP coordinates.");
  }

  return ranked.map(([name, cohortRows], idx) => {
    const selected = deterministicSample(cohortRows, targetCount);
    return {
      key: idx === 0 ? "ehrA" : "ehrB",
      name,
      resolvedCount: selected.length,
      sourceCount: cohortRows.length,
      points: normalizePoints(selected.map((row) => row.point)),
    };
  });
}

export function makeSculptureFromPointCloud(points) {
  const geometry = new THREE.IcosahedronGeometry(1.05, 5);
  const pos = geometry.attributes.position;
  const base = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const cloud = points.map((point) => ({
    p: point.clone(),
    d: point.clone().normalize(),
    r: point.length(),
  }));
  const fallbackRadius = cloud.reduce((acc, node) => acc + node.r, 0) / cloud.length;

  for (let i = 0; i < pos.count; i += 1) {
    base.fromBufferAttribute(pos, i);
    dir.copy(base).normalize();

    let weightedRadius = 0;
    let weightSum = 0;
    let density = 0;
    for (const node of cloud) {
      const alignment = Math.max(-1, Math.min(1, dir.dot(node.d)));
      const angularDelta = 1 - alignment;
      const weight = Math.exp(-angularDelta * 18);
      weightedRadius += node.r * weight;
      weightSum += weight;
      if (alignment > 0.84) {
        density += 1;
      }
    }

    const meanRadius = weightSum > 0.00001 ? weightedRadius / weightSum : fallbackRadius;
    const densityFactor = density / cloud.length;
    const concavity = THREE.MathUtils.clamp((0.07 - densityFactor) * 0.95, -0.08, 0.07);
    const grain = noise3D(dir.x * 3.1, dir.y * 3.1, dir.z * 3.1) * 0.035;
    const radius = THREE.MathUtils.clamp(meanRadius * 1.04 + concavity + grain, 0.62, 1.42);
    const sculpted = dir.clone().multiplyScalar(radius);
    pos.setXYZ(i, sculpted.x, sculpted.y, sculpted.z);
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const sculpture = new THREE.Mesh(geometry, createWoodMaterial());
  sculpture.castShadow = false;
  sculpture.receiveShadow = false;
  sculpture.position.y = 0;
  sculpture.scale.setScalar(0.96);
  return sculpture;
}

export function makeBlock(size = { x: 2.6, y: 2.3, z: 2.1 }) {
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z, 1, 1, 1),
    createWoodMaterial(),
  );
  block.position.y = 1.08;
  return block;
}

function buildMoldGeometryFromSculpture(sculptureGeometry) {
  const shell = sculptureGeometry.clone();
  const shellPos = shell.attributes.position;
  const n = new THREE.Vector3();
  const p = new THREE.Vector3();
  const sourcePositions = new Float32Array(shellPos.array.length);
  const coarsePositions = new Float32Array(shellPos.array.length);
  const targetPositions = new Float32Array(shellPos.array.length);
  let meanTargetRadius = 0;

  for (let i = 0; i < shellPos.count; i += 1) {
    p.fromBufferAttribute(shellPos, i);
    n.copy(p).normalize();
    const target = p.clone().addScaledVector(n, 0.08);
    targetPositions[i * 3] = target.x;
    targetPositions[i * 3 + 1] = target.y;
    targetPositions[i * 3 + 2] = target.z;
    meanTargetRadius += target.length();

    const source = new THREE.Vector3(
      Math.sign(n.x || 1) * 1.58,
      Math.sign(n.y || 1) * 1.36,
      Math.sign(n.z || 1) * 1.28,
    );
    sourcePositions[i * 3] = source.x;
    sourcePositions[i * 3 + 1] = source.y;
    sourcePositions[i * 3 + 2] = source.z;

    shellPos.setXYZ(i, source.x, source.y, source.z);
  }
  meanTargetRadius /= shellPos.count;

  const target = new THREE.Vector3();
  const radial = new THREE.Vector3();
  for (let i = 0; i < shellPos.count; i += 1) {
    const ix = i * 3;
    target.set(targetPositions[ix], targetPositions[ix + 1], targetPositions[ix + 2]);
    radial.copy(target).normalize().multiplyScalar(meanTargetRadius * 1.03);
    const coarse = target.clone().lerp(radial, 0.45);
    coarsePositions[ix] = coarse.x;
    coarsePositions[ix + 1] = coarse.y;
    coarsePositions[ix + 2] = coarse.z;
  }

  shell.computeVertexNormals();
  shell.userData.sourcePositions = sourcePositions;
  shell.userData.coarsePositions = coarsePositions;
  shell.userData.targetPositions = targetPositions;
  return shell;
}

export function setMoldMorph(mesh, fit, refine = 0) {
  const clampedFit = Math.max(0, Math.min(1, fit));
  const clampedRefine = Math.max(0, Math.min(1, refine));
  const pos = mesh.geometry.attributes.position;
  const source = mesh.geometry.userData.sourcePositions;
  const coarse = mesh.geometry.userData.coarsePositions;
  const target = mesh.geometry.userData.targetPositions;

  for (let i = 0; i < pos.count; i += 1) {
    const ix = i * 3;
    const xApprox = THREE.MathUtils.lerp(source[ix], coarse[ix], clampedFit);
    const yApprox = THREE.MathUtils.lerp(source[ix + 1], coarse[ix + 1], clampedFit);
    const zApprox = THREE.MathUtils.lerp(source[ix + 2], coarse[ix + 2], clampedFit);
    const x = THREE.MathUtils.lerp(xApprox, target[ix], clampedRefine);
    const y = THREE.MathUtils.lerp(yApprox, target[ix + 1], clampedRefine);
    const z = THREE.MathUtils.lerp(zApprox, target[ix + 2], clampedRefine);
    pos.setXYZ(i, x, y, z);
  }

  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

export function makeMold(sculpture) {
  const moldGeometry = buildMoldGeometryFromSculpture(sculpture.geometry);

  const material = new THREE.MeshPhysicalMaterial({
    color: "#8db1ff",
    roughness: 0.28,
    metalness: 0.07,
    transmission: 0.55,
    thickness: 0.55,
    transparent: true,
    opacity: 0.88,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
  });

  const mold = new THREE.Mesh(moldGeometry, material);
  mold.position.y = 1.08;
  mold.visible = false;
  mold.userData.morph = { fit: 0, refine: 0 };
  setMoldMorph(mold, 0, 0);
  return mold;
}
