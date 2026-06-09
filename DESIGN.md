# Design Doc — Whittling Animation (Argenx Pitch)

## Project Goal

Build a short, executive-friendly animation that makes one idea immediately clear:

- Threshold-based filtering is a poor fit for identifying high-quality clinical trial candidates in complex real-world EHR data.
- Pulsar can model a more precise, shape-based candidate profile that reduces clinician effort while preserving candidate quality.

The animation is designed for the Argenx Graves disease trial conversation and positions Krv Labs as the team that can operationalize this workflow with clinicians.

## Problem Statement

Clinicians have the domain expertise to identify nuanced candidates, but not enough time to manually curate large EHR cohorts.
Traditional filter workflows force a tradeoff:

- **Too narrow**: missed valid patients.
- **Too wide**: too many false positives and heavy manual review.

Both outcomes increase screening friction and slow trial enrollment.

## Core Message

The animation communicates a single comparison:

- **Competitor approach** = rectangular filter (hypercube) that cannot match a complex candidate topology.
- **Pulsar approach** = adaptive mold that conforms to the true candidate shape and improves with clinician feedback.

## Target Audience

- Argenx executives and decision-makers.
- Secondary audience: clinical operations stakeholders.

Design requirement: visual language must be simple, credible, and explainable in under 60 seconds.

## Narrative Structure (5 Beats)

1. **Target shape**  
   Show the ideal candidate profile as an irregular, non-convex sculpture.
2. **Too narrow filter**  
   Show missed candidate regions.
3. **Too wide filter**  
   Show high manual whittling effort (false-positive review burden).
4. **Pulsar mold**  
   Show a conforming mold around the shape with minimal finishing touches.
5. **Feedback loop**  
   Show iterative improvement from clinician feedback into the model.

## Product Requirements

- Auto-start playback on page load.
- Manual presenter controls:
  - keyboard: next/prev/reset/autoplay/fullscreen
  - on-screen buttons: play/next/prev/reset
- Fullscreen-compatible for live presentation.
- Screen-recordable output for Keynote/PowerPoint embeds.
- No build pipeline required (runs from static file server).

## Technical Architecture

- **Rendering**: Three.js scene, camera, lights, meshes.
- **Animation sequencing**: GSAP timeline with labeled scene checkpoints.
- **Shape generation**: simplex noise + geometric displacement to create non-convex sculpture.
- **Morphing concept**: block-to-mold interpolation to represent Pulsar fit.
- **UI layer**: HTML/CSS overlay for captions, metrics, callouts, controls.

Code layout:

- `index.html` — canvas, overlay, import map, boot/error surface.
- `styles.css` — visual styling, HUD, controls, captions.
- `src/stage.js` — renderer/camera/lights/workbench setup.
- `src/shapes.js` — sculpture/block/mold geometry and morph logic.
- `src/scenes.js` — 5 narrative scene builders.
- `src/main.js` — assembly, controls, timeline navigation, render loop.

## Visual Design Principles

- Keep camera movement stable and restrained to preserve comprehension.
- Prioritize readability over realism.
- Use consistent “danger vs good” color cues for outcome interpretation.
- Keep copy short and executive-facing (no technical jargon on screen).

## Success Criteria

- A non-technical executive can explain the competitor failure mode after one viewing.
- Viewer can articulate the Pulsar differentiation as:
  - better candidate precision,
  - lower clinician review burden,
  - learning improvement loop over time.
- Asset can be used both live and as embedded deck video without modification.

## Risks and Mitigations

- **Risk**: Overly technical visuals reduce clarity.  
  **Mitigation**: lock camera, short captions, single concept per beat.
- **Risk**: Browser/module issues break playback in live setting.  
  **Mitigation**: simple static serving, explicit import map, boot error surfacing.
- **Risk**: Story feels abstract without trial relevance.  
  **Mitigation**: include concise Graves trial context in spoken narration or adjacent slide.

## Out of Scope

- Patient-level clinical claims or medical recommendation logic.
- Regulatory or statistical validation claims.
- Production-grade trial matching product UI.

## Operational Usage

1. Run locally with `python -m http.server 8000`.
2. Open `http://localhost:8000`.
3. Present live with keyboard/buttons or record autoplay sequence.
4. Embed recorded clip in deck where competitor-vs-Pulsar differentiation is introduced.
