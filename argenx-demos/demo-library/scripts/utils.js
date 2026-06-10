export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
export const easeOut = (t) => 1 - ((1 - t) ** 3);
export const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches || new URLSearchParams(location.search).has("nomotion");

export function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function svgEl(name, attrs = {}, children = []) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) el.setAttribute(key, String(value));
  }
  for (const child of children) el.appendChild(child);
  return el;
}

export function setChildren(host, children) {
  host.replaceChildren(...children);
}
