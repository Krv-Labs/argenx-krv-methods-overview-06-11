# Pulsar Demo Gallery

Standalone gallery for the Pulsar graphics demos. The old slide-deck HTML files are intentionally left untouched.

## Run

From the repo root:

```bash
npm start -- --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:9000/pulsar-manifold-deck/demos/
```

If Vite reports a different port, keep the same path and replace only the port.

## Use

- Click a gallery item to open a demo.
- Use `Prev`, `Next`, or the arrow keys to step through demo states.
- Use `Play` to run the current demo animation.
- Use sliders and demo-specific buttons in the left panel.
- Use `SVG` to export the current graphic as an SVG screenshot.
- Use `Record` to export a short MP4/WebM motion clip for the current graphic.
- Use `Gallery` to return to the demo chooser.

## Notes

- View through the Vite dev server. Do not open `index.html` directly from Finder or a `file://` URL.
- The voxel demos load Heerich from the same CDN pattern used by the original standalone HTML files.
- The shared screenshot and recording utilities live in `scripts/svg-exporter.js`.
