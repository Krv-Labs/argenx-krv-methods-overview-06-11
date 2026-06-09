# Whittling Animation — Argenx Pitch (Motion Canvas Edition)

This is an industry-standard, fully modular **Motion Canvas** project that explains why clinical trial candidate discovery using traditional threshold filters fails, and how Pulsar's shape-based, feedback-driven approach improves precision.

The animation delivers a single key concept:
- **Competitor approach** = rigid rectangular filter (hypercube) that cuts off valid candidates and includes massive false-positive review noise.
- **Pulsar approach** = adaptive, conforming spline/manifold that perfectly encloses the candidate shape and improves continuously with clinician feedback.

---

## 🚀 Features & Enhancements

- **Modern 2D Vectors**: Replaced legacy 3D procedural shapes with a pristine 2D scatter-plot of 150 patients in UMAP space, perfectly representing real clinical trial data.
- **Unified Narrative Flow**: Seamlessly animated caption cards, stat widgets (Candidate count, Review noise, Clinician hours), and conforming spline morphing.
- **AI-Agent Integration**: Configured with **LeanCTX** and **Agent Skills Manager (asm)** for context-compressed execution and skill auditing.
- **Double-Green Mandate**: Pre-configured strict ESLint flat rules and strict TypeScript compilation checks to guarantee 100% type safety.

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation
```bash
npm install
```

### Run the Interactive Development Server
To open the Motion Canvas editor in your browser and play/render the animation:
```bash
npm start
```
Then open [http://localhost:9000](http://localhost:9000) (or the port specified in console) in Chrome.

---

## 🧹 Quality Assurance (Lint & Typecheck)

To run strict static checks and verify types:
```bash
# Run both
npm run lint && npm run typecheck
```

---

## 📁 Repository Organization & Backups

The original Three.js implementation has been fully preserved for reference:
- `src-threejs/` — Original Three.js animation sources
- `index-threejs.html` — Original entry HTML
- `styles-threejs.css` — Original styles overlay

All active, production Motion Canvas files reside in the root and under `src/`.

---

## 🤖 AI Agents & Contributors
If you are an AI agent working on this repository:
- You MUST read and adhere to [`agents.md`](./agents.md).
- You MUST run all shell commands using `lean-ctx` (e.g., `lean-ctx -c npm run build`).
- You MUST verify that `npm run lint && npm run typecheck` passes with zero errors before completing your tasks.
