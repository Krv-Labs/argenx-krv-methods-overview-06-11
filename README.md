# Pulsar Demo Gallery & Briefings

This repository contains the interactive graphics and cohort discovery briefings for Pulsar. It features the **Pulsar Demo Gallery** running natively at the root, along with self-contained, legacy executive slide briefings.

The project is built using vanilla static files compiled with **Vite** for ultra-fast load times, lightweight bundle sizes, and seamless deployment to GitHub Pages.

---

## 🚀 Pulsar Demo Gallery (Active Web Application)

The active gallery showcases several interactive graphics explaining Pulsar's additive approach to cohort discovery vs. traditional threshold filtering.

### Running Locally

To start the local Vite development server:

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start the server**:
   ```bash
   npm start
   ```
3. Open the address reported by Vite (usually `http://localhost:5173`) in your browser (optimized for Chrome).

### Features in the Gallery

- **Cube growth and shrink (Rigid filters)**: Slider showing the compromise of hypercube box-filtering (missing candidates vs. high manual review burden).
- **Non-destructive scans (Pulsar scan)**: Visualizes sweep scan planes reading the intact pool, creating consensus cells, and lifting the discovered organic shape.
- **Crescent vs box (Filters vs manifolds)**: Standalone 2D comparison showing why axis-aligned boxes fail on a curved target distribution.
- **Feedback manifold (Learned shape)**: Interactive clinician acceptance/rejection demonstration, causing liquid metaball fusion and split morphs.

---

## 🏛 Legacy Single-File Executive Briefings

The original self-contained briefings are fully preserved and served statically. They do not require any local build or local assets (all dependencies are loaded from verified CDNs):

- **Interactive Cohort Topology Briefing**: Served at `/legacy-htmls/index.html` (compares additive scans vs. rigid subtractive carving).
- **Filters vs. Manifolds Companion Briefing**: Served at `/legacy-htmls/filters-vs-manifolds.html` (contains continuous-flow clinician-feedback manifolds).

Both briefings can be loaded directly from your browser when running the dev server or built in production.

---

## 📦 Building & Deploying to GitHub Pages

This repository is optimized for **GitHub Pages** deployment with automated builds.

### 1. Automated GitHub Pages (Recommended)

We have configured an automated deployment workflow using GitHub Actions:

1. Go to your repository settings on GitHub.
2. Navigate to **Pages** under the **Code and automation** sidebar.
3. Under **Build and deployment -> Source**, change the dropdown from "Deploy from a branch" to **"GitHub Actions"**.
4. Push your changes to the `main` branch. GitHub will automatically compile the Vite bundle and deploy the app!

### 2. Manual Build

To build the static assets manually:

```bash
npm run build
```

This compiles all files into the `dist/` directory, containing:
- `dist/index.html` (the primary gallery)
- `dist/legacy-htmls/` (the standalone executive briefings)
- `dist/assets/` (compressed CSS and JS files using relative asset paths)

You can preview your build locally using:
```bash
npm run preview
```
