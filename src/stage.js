import * as THREE from "three";

function makeWoodTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y += 1) {
    const t = y / size;
    const ring = Math.sin(t * 90) * 0.18 + Math.sin(t * 18) * 0.1;
    const noise = (Math.random() - 0.5) * 0.08;
    const shade = Math.min(1, Math.max(0, 0.56 + ring + noise));
    const r = Math.floor(124 * shade + 40);
    const g = Math.floor(88 * shade + 26);
    const b = Math.floor(56 * shade + 14);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, y, size, 1);
  }

  for (let i = 0; i < 26; i += 1) {
    const x = Math.random() * size;
    const w = 2 + Math.random() * 3;
    ctx.fillStyle = "rgba(65, 43, 26, 0.18)";
    ctx.fillRect(x, 0, w, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function createWoodMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#b07c51"),
    roughness: 0.72,
    metalness: 0.02,
    map: makeWoodTexture(),
  });
}

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#ccd8ee", 11, 33);

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 4.85, 10.9);
  camera.lookAt(0, 1.05, 0);

  const world = new THREE.Group();
  scene.add(world);

  const hemi = new THREE.HemisphereLight("#c8daf5", "#aabdd8", 0.72);
  scene.add(hemi);

  const key = new THREE.DirectionalLight("#dce7ff", 1.08);
  key.position.set(5.2, 8.8, 6.7);
  key.castShadow = false;
  scene.add(key);

  const rim = new THREE.DirectionalLight("#6699ee", 0.38);
  rim.position.set(-7, 4.4, -4.6);
  scene.add(rim);

  const fill = new THREE.SpotLight("#c8ddff", 0.34, 40, 0.58, 0.82, 1);
  fill.position.set(0.2, 8, 1.4);
  scene.add(fill);

  const glow = new THREE.PointLight("#0063ec", 0.2, 24, 2.2);
  glow.position.set(-2.6, 2.6, -3.6);
  scene.add(glow);

  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.95, 8),
    createWoodMaterial(),
  );
  bench.position.set(0, -0.45, 0);
  world.add(bench);

  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(2.7, 2.95, 0.16, 56),
    new THREE.MeshStandardMaterial({
      color: "#8a9cb5",
      roughness: 0.62,
      metalness: 0.2,
    }),
  );
  plate.position.y = 0.08;
  world.add(plate);

  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(3.1, 48),
    new THREE.MeshBasicMaterial({
      color: "#0063ec",
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
    }),
  );
  floorGlow.rotation.x = -Math.PI * 0.5;
  floorGlow.position.y = 0.11;
  world.add(floorGlow);

  const anchor = new THREE.Group();
  anchor.position.y = 0.26;
  world.add(anchor);

  return {
    renderer,
    scene,
    camera,
    world,
    anchor,
    bench,
    plate,
    render() {
      renderer.render(scene, camera);
    },
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
  };
}
