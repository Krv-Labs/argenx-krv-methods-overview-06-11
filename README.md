# Whittling Animation — Argenx Pitch

Web-based Three.js animation that explains why threshold filtering fails for clinical trial candidate discovery and how Pulsar improves precision.
The hero sculpture can be generated from `umap_3d_0/1/2` coordinates in `graves_patients_unified_labeled.csv` (150-patient subsample).

## Project goal

Show Argenx executives, in under one minute, why threshold-based patient filtering creates either missed candidates or high manual review burden, and why Pulsar's shape-based + feedback-driven approach is better.

## Design documentation

See [`DESIGN.md`](./DESIGN.md) for full goals, narrative, architecture, requirements, and success criteria.

## Run locally

From the project root:

```bash
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in Chrome.

## URL modes for presenting and recording

- Default presenter mode: `http://localhost:8000`
- Deck mode (cleaner controls): `http://localhost:8000?deck=1`
- Capture mode (no controls/brand overlays): `http://localhost:8000?clean=1`
- Looping capture mode: `http://localhost:8000?clean=1&loop=1`
- Figma mode (16:9 fitted canvas): `http://localhost:8000?figma=1`
- Figma clean capture: `http://localhost:8000?figma=1&clean=1`
- Pause on load (manual cue): append `&autoplay=0`

## Presenter controls

- `Space` or `ArrowRight`: next scene
- `ArrowLeft`: previous scene
- `R`: reset to scene 1
- `A`: autoplay full sequence
- `P`: pause/resume timeline
- `F`: toggle fullscreen
- `G`: toggle 16:9 safe guides

## Story flow in the animation

1. Ideal patient profile is irregular (not a clean rectangle)
2. Threshold filtering too narrow misses patients
3. Threshold filtering too wide creates heavy false-positive review
4. Pulsar mold conforms to real candidate shape
5. Clinician feedback improves precision over time

## Export for Figma / Keynote / PowerPoint

1. Start local server and open `http://localhost:8000?figma=1&clean=1`
2. Press `F` for fullscreen
3. Press `A` for autoplay
4. Record screen on macOS with `Cmd+Shift+5` at 1920x1080
5. Insert resulting `.mov` or exported `.mp4` into Figma Slides / Keynote / PowerPoint
