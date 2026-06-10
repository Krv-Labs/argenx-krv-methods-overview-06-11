# Pulsar Manifold Deck

A single-file, zero-build interactive executive briefing: why Pulsar's additive
approach to clinical-trial cohort discovery beats the subtractive paradigm of
database filtering.

**All data is 100% synthetic demonstration data. No PHI, no clinical content.**

## The narrative spine

One block of wood, two physics. The clinician's job is to deliver the right
patients out of the EHR to the sponsor.

- **Subtractive (stages 01–04):** competitors estimate the smallest block they
  can hand the clinician, then pre-cut it with binary filters — chisel strikes
  no clinician supervised. Stage 04 is an interactive block-size slider proving
  there is *no right-sized block*: tight clips the true cohort's shape, loose
  buries the clinician in charts, and even the cost-optimal setting leaves real
  manual curation hours.
- **Additive (stages 05–08):** Pulsar reads the **same block** instead of
  carving it. Scan planes sweep through and destroy nothing (05); cells light
  up and cross-hatch where independent views agree — `fit_multi` (06); the
  stable shape emerges — the exact organic form from stage 04 — with the
  slider's optimal box overlaid in red to show the 42-patient flare it never
  touched — `construction_threshold: "auto"` (07); and the lit shape lifts out
  of the intact block as a ranked shortlist the clinician reviews, with a
  learned per-EHR mold that visibly tightens on every accept/reject (08).
  *Filters are exploratory surgery; Pulsar is the imaging study.*

## Run it

Open `index.html` in any modern browser. No install, no build. (Internet is
required once for the CDNs: Tailwind, Google Fonts, `heerich@0.14.0`.)

Deep-link any stage: `index.html#b3`. Stages: `a1 a2 a3 a4 b1 b2 b3 b4`.
Append `?nomotion=1` to skip animations (also honors `prefers-reduced-motion`).

## Drive it

- **Next / Prev**, **← →** keys, or click any stage marker in the deck.
- **Subtractive / Additive** toggle jumps between mirrored steps.
- **Hover** anything voxel-shaped — ghost cells, the glass case, scan planes,
  lit consensus cells, the flare arm, the red box frame, the mold — for
  executive data cards.
- **Drag** the block-size slider in stage 04; **accept/reject** candidates in
  stage 08 and watch the mold tighten.

## Architecture

Light "editorial print" theme — paper background, ink-density palette.
The whole deck now runs on a **single visual system**:
[Heerich.js](https://meodai.github.io/heerich/) (voxel → SVG, isometric).

| Domain | Mechanism |
|---|---|
| Subtractive block | Boolean `subtract` slabs carve the block live; ghost shell + lost cells are non-opaque tagged voxels. |
| Block-size slider | Same grid; the true cohort is a fixed organic cell-set (core blob, flare arm, satellites, outliers) shared by both halves; the cost curve is computed from the actual geometry. |
| Additive scan | Glass case = scaled edge-frame voxels; scan planes = solid translucent slabs swept per frame; consensus cells reveal in story order with hatch = multi-view agreement; the lift re-renders the shape at rising y-offsets. |
| Hover cards | Heerich `meta` tags + `findByPosition` screen-space hit-testing in both views. |

Voxel budgets stay ≤ ~1,300 paths per rebuild, so the painter's-algorithm SVG
re-render is fluid through every animation (carve, sweep, reveal, lift).
