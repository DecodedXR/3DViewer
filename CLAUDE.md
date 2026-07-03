# Live Depth Field

A browser tool that turns a **webcam feed or an uploaded photo** into an
explorable **3D point cloud**, styled to look like Gaussian splats (soft glowing
sprites, size-by-depth, additive blending). Everything runs client-side.

**The one-line task queue lives in [STATUS.md](./STATUS.md). Read it first.**

## Stack

- Vanilla JS + **Three.js** (v0.185, ESM; addons via `three/addons/*`) + **Vite** (v8).
- On-device depth via **transformers.js** — Depth Anything V2 Small, **WebGPU with
  WASM fallback**. (Not added until Milestone 3.)
- No backend, no accounts, no build server. The only network call at runtime is
  loading the model weights.

## Non-negotiable constraints

1. **Fully in-browser.** No server calls except loading model weights.
2. **30fps orbit** on the point cloud even when depth inference is slower.
3. **Depth inference and rendering are DECOUPLED** — the render loop never blocks
   on inference. The latest depth map swaps in when ready; drop frames, never
   queue.
4. **Ship a working thing at every milestone.** No milestone leaves the app
   broken.

## Working rules (apply to every change)

1. **Ask before assuming anything about model APIs, tensor shapes, or Three.js
   versions.** If unsure, say so before writing code. (Three.js is pinned at
   0.185 — see `package.json`.)
2. **Simplest thing that works first.** No abstractions nobody asked for.
3. **Flag uncertainty explicitly**, especially around transformers.js output
   format and WebGPU availability.
4. Suggest a better approach if you see one, but **don't silently change scope**.
5. **STOP after each milestone and leave a runnable state.** One milestone per
   PR/run.

## How to run / test

- `npm run dev` — Vite dev server (local hacking + visual check).
- `npm run build` — production bundle to `dist/` (the hard CI gate).
- `npm test` — builds, then runs the Playwright **headless WebGL smoke test**
  (`tests/smoke.spec.js`). This is the local suite.
- The app exposes a debug/test hook at `window.__app`
  (`{ THREE, scene, camera, renderer, controls, getPointCount() }`) so headless
  tests can introspect the scene graph without reading pixels.

## Architecture notes

- `src/main.js` owns the render/camera scaffold: `WebGLRenderer`, `Scene`,
  `PerspectiveCamera`, `OrbitControls`, resize handler, and the rAF render loop.
  Milestones add geometry/shaders/inputs; the loop and controls stay put.
- CI (`.github/workflows/ci.yml`) has two jobs: **`build`** (always-reliable gate)
  and **`smoke`** (headless WebGL via software SwiftShader — may be flaky across
  Chromium versions). See STATUS.md for which is the trusted merge gate.

## Autopilot

This repo is set up to be advanced one milestone at a time by the `autopilot`
skill. Autopilot picks the single **NEXT** actionable task from STATUS.md,
implements it test-first, has an independent verifier refute it, and lands it via
an auto-merging PR **only if CI is green**. Milestones marked BLOCKED in STATUS.md
(and anything requiring a human checkpoint, e.g. confirming transformers.js output
format in M3) are **off-limits** to autopilot until a human clears them.
