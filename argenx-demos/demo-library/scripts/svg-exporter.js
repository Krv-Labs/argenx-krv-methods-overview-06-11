import { clamp } from "./utils.js";

function paint(value) {
  if (!value || value === "none") return { color: value, alpha: 1 };
  if (value === "transparent") return { color: "none", alpha: 1 };

  const rgba = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgba) {
    const [r, g, b, a = "1"] = rgba[1].split(",").map((part) => part.trim());
    return { color: `rgb(${r}, ${g}, ${b})`, alpha: Number(a) };
  }

  const oklch = value.match(/^oklch\(([\d.]+)\s+[\d.]+\s+[\d.]+\)$/);
  if (oklch) {
    const v = Math.round(clamp(Number(oklch[1]), 0, 1) * 255);
    return { color: `rgb(${v}, ${v}, ${v})`, alpha: 1 };
  }

  return { color: value, alpha: 1 };
}

function normalizePaint(el, attr) {
  if (!el.hasAttribute(attr)) return;
  const { color, alpha } = paint(el.getAttribute(attr));
  el.setAttribute(attr, color);
  if (alpha < 1) {
    const opacityAttr = `${attr}-opacity`;
    const current = Number(el.getAttribute(opacityAttr) || 1);
    el.setAttribute(opacityAttr, String(current * alpha));
  }
}

export function cloneSvg(source, background = "#ffffff") {
  const clone = source.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("style", `background:${background};overflow:visible`);

  const viewBox = clone.getAttribute("viewBox");
  if (viewBox) {
    const [x, y, w, h] = viewBox.split(/\s+/).map(Number);
    if ([x, y, w, h].every(Number.isFinite)) {
      clone.setAttribute("width", String(w));
      clone.setAttribute("height", String(h));
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("x", String(x));
      bg.setAttribute("y", String(y));
      bg.setAttribute("width", String(w));
      bg.setAttribute("height", String(h));
      bg.setAttribute("fill", background);
      clone.insertBefore(bg, clone.firstChild);
    }
  }

  for (const el of [clone, ...clone.querySelectorAll("*")]) {
    normalizePaint(el, "fill");
    normalizePaint(el, "stroke");
  }
  return clone;
}

export function svgXml(source) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(cloneSvg(source))}\n`;
}

export function downloadSvg(source, filename) {
  const blob = new Blob([svgXml(source)], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function codec() {
  if (!window.MediaRecorder) return null;
  const candidates = [
    { type: 'video/mp4;codecs="avc1.42E01E"', ext: "mp4" },
    { type: "video/mp4", ext: "mp4" },
    { type: "video/webm;codecs=vp9", ext: "webm" },
    { type: "video/webm;codecs=vp8", ext: "webm" },
    { type: "video/webm", ext: "webm" },
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.type)) || null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canvasFor(source) {
  const viewBox = source.getAttribute("viewBox");
  const box = viewBox ? viewBox.split(/\s+/).map(Number) : [];
  const rawW = Number.isFinite(box[2]) ? box[2] : source.getBoundingClientRect().width;
  const rawH = Number.isFinite(box[3]) ? box[3] : source.getBoundingClientRect().height;
  const scale = Math.min(8, 3840 / rawW, 2160 / rawH);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round((rawW * scale) / 2) * 2);
  canvas.height = Math.max(2, Math.round((rawH * scale) / 2) * 2);
  return canvas;
}

async function drawSvg(canvas, source) {
  const xml = svgXml(source);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  img.decoding = "async";
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function recordSvgMotion({ filenameBase, duration = 4.8, fps = 60, getSvg, renderFrame }) {
  const selectedCodec = codec();
  if (!selectedCodec) throw new Error("This browser cannot record MP4 or WebM from a canvas stream.");

  await renderFrame(0, duration);
  const first = getSvg();
  if (!first) throw new Error("No active SVG found to record.");

  const canvas = canvasFor(first);
  const stream = canvas.captureStream(fps);
  const track = stream.getVideoTracks()[0];
  const chunks = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: selectedCodec.type,
    videoBitsPerSecond: 24000000,
  });

  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve;
  });
  recorder.start();

  const frames = Math.round(duration * fps);
  for (let frame = 0; frame <= frames; frame++) {
    const t = frame / fps;
    await renderFrame(t, duration);
    await drawSvg(canvas, getSvg());
    if (track.requestFrame) track.requestFrame();
    await sleep(1000 / fps);
  }

  recorder.stop();
  await stopped;
  track.stop();
  downloadBlob(new Blob(chunks, { type: selectedCodec.type }), `${filenameBase}.${selectedCodec.ext}`);
}
