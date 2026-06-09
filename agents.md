# Agent Handbook & System Instructions — Motion Canvas Animation Project

Welcome, AI Agent! This file contains foundational mandates, workflows, and tool instructions designed to ensure maximum engineering quality, zero context regression, and optimal token efficiency.

> **Mandate**: You MUST read, understand, and adhere to this file. All future agents working on this codebase must follow these directives.

---

## 🚀 Project Overview & Architecture

This repository is an industry-standard, fully modular **Motion Canvas** project. It is structured to deliver a high-fidelity, visually stunning 2D animation explaining why clinical trial candidate discovery using traditional threshold filters fails, and how Pulsar's shape-based, feedback-driven approach improves precision.

### Directory Structure
```text
/ (Project Root)
├── src/
│   ├── scenes/
│   │   └── story.tsx       # Main multi-scene narrative timeline (generator)
│   ├── project.ts          # Project entry point & scene registrar
│   └── motion-canvas.d.ts  # Motion canvas global types
├── public/                  # Static assets (fonts, images, media)
├── .agents/                 # Local Agent Skills and tools
│   └── skills/              # Agent skills managed via asm (skills CLI)
├── eslint.config.js         # Modern ESLint v9+ Flat Configuration
├── tsconfig.json            # Strict TypeScript compiler options
├── package.json             # NPM dependencies, scripts, and type specifications
└── agents.md                # This document (Foundational mandates for AI agents)
```

---

## 🛠 Required Agent Tools & Context Optimizations

To keep your context window lean and avoid "token tax" or context degradation, this project is fully wired with **LeanCTX** and **Agent Skills Manager (asm)**.

### 1. LeanCTX Integration
`lean-ctx` is installed locally on the system path and configured for this project.
- **Rule**: Whenever you execute shell commands, ALWAYS run them through `lean-ctx` to strip boilerplate progress bars, noise, and verbose logs.
- **Rule**: When reading files to understand their structure (but not editing them), use `lean-ctx read <file_path> -m map` or `lean-ctx read <file_path> -m signatures` to save up to 90% of your context token count.

#### Examples:
```bash
lean-ctx -c npm run build         # Runs build with compressed output
lean-ctx -c npm run lint          # Runs linter with compressed output
lean-ctx -c npm run typecheck     # Runs typecheck with compressed output
lean-ctx read src/project.ts -m map # Reads file signature map only
```

### 2. Agent Skills Manager (`skills` CLI)
We use the standard `skills` CLI (asm) to manage specialized skill packages.
- Run `npx skills list` to view available project/global skills.
- Run `npx skills find <keyword>` to discover useful utility scripts.
- Run `npx skills add <package>` to add a new skill to the project.

---

## 🧹 Quality Assurance & Compilation Mandates

To maintain pristine engineering standards, we enforce strict TypeScript typing and ESLint compliance.

### The Double-Green Mandate:
**Before concluding any task or committing changes, you MUST run both linting and typechecking and ensure they pass with exactly ZERO errors and warnings.**
Any code modification that breaks the linter or TypeScript compilation is considered incomplete and rejected.

#### Execution Commands:
```bash
# Run linting
lean-ctx -c npm run lint

# Run typechecking
lean-ctx -c npm run typecheck

# Run both together (Verify on every major command execution)
lean-ctx -c npm run lint && lean-ctx -c npm run typecheck
```

---

## 🎬 How to Run and Render the Motion Canvas Project

### Development Server
To launch the interactive Motion Canvas browser editor:
```bash
lean-ctx -c npm start
```
This runs Vite on `http://localhost:9000` (or the configured port). Open this URL in Chrome to play, scrub, and inspect the animation.

### Building & Rendering
- **To build the production assets**: `npm run build`
- **To render video output**: Use the rendering controls directly inside the Motion Canvas browser UI to output an image sequence or high-quality video using FFmpeg.

---

## 🧠 Continuous Improvement Feedback Loop

When completing tasks in this repo:
1. Record your key session decisions and findings using `lean-ctx session decision "..."` and `lean-ctx session finding "..."`.
2. Save your session state using `lean-ctx session save`.
3. Check your token savings and share your report card with `lean-ctx gain`.

Let's build something amazing together!
