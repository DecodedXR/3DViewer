# STATUS — Live Depth Field

Single source of truth for "what's next." One milestone per PR/run. Autopilot:
pick the one task under **NEXT**, ship it, stop. Do **not** start anything under
**BLOCKED**.

_Last updated: 2026-07-03 — Milestone 3 (photo → depth → cloud) landed.
Milestone 4 (live webcam input) is the actionable NEXT. Note for autopilot: M4
is a render/inference-**decoupling** milestone — the effort↔pick gate applies
(known-high session effort or defer)._

---

## DONE

- **Milestone 0 — Bootstrap.** Repo flattened to root; Vite + Three.js 0.185
  scaffold; render/camera pipeline in `src/main.js` (empty scene, OrbitControls,
  resize, rAF loop); Playwright headless-WebGL smoke harness; two-job GitHub
  Actions CI (`build` + `smoke`). Baseline is green. The scaffold renders an
  empty scene on purpose — no point cloud yet.

- **Milestone 1 — Fake point cloud.** `src/main.js` builds a 128×128 grid
  (16,384 points) `THREE.BufferGeometry` on the XY plane — X/Y centered at the
  origin (-1..1), a random Z per point (-0.5..0.5) — wrapped in a `THREE.Points`
  with the default `THREE.PointsMaterial` (`size 0.03`) and added to the scene.
  Render loop, `OrbitControls`, resize handler, and the `getPointCount()` hook
  unchanged. Smoke test asserts `getPointCount() === 16384` with no page/console
  errors. Landed via **PR #2**; pre-change HEAD (rollback) `4b81157`.

- **Milestone 2 — Splat-style point aesthetic.** `src/main.js` replaces the M1
  `PointsMaterial` with a custom `THREE.ShaderMaterial`: a soft round
  (circular Gaussian alpha falloff, square corners discarded) additively-blended
  sprite per point, with perspective size-by-depth (`gl_PointSize` scaled by
  `uScale / -mvPosition.z`, `uScale` = half the drawing-buffer height, refreshed
  on resize). Tunable uniforms `pointSize` / `glow` / `falloff` are wired to
  plain HTML range sliders (a top-left `#controls` panel — no dat.GUI dependency
  added). Same 16,384-point geometry; render loop / `OrbitControls` / resize /
  `getPointCount()` hook intact. Smoke test asserts the cloud material is a
  `ShaderMaterial` with `AdditiveBlending` + the three uniforms and
  `getPointCount() === 16384`, no page/console errors (a shader compile error
  would surface as `console.error`). Proven non-tautological (RED on the M1
  `PointsMaterial` state). Pre-change HEAD (rollback) `7345f44`.

- **Milestone 3 — Photo input → depth → cloud.** File upload (`#photo-input` +
  `#status` line in the `#controls` panel) → Depth Anything V2 Small via
  transformers.js → depth-displaced, image-colored cloud through the M2 splat
  shader. `src/depth.js` lazy-loads the pipeline (dynamic import keeps the boot
  bundle unchanged; no model bytes until first upload) and picks the device
  **once up front** by probing `navigator.gpu.requestAdapter()` — WebGPU if an
  adapter exists, else WASM. (Sequential try-webgpu-then-wasm does NOT work on
  transformers.js 4.2.0: a rejected WebGPU init poisons the library's shared
  `webInitChain`, so any later session-create rethrows the same error.)
  `applyDepthToCloud` (exposed as `window.__app.applyDepth` for tests) samples
  the `depth` RawImage nearest-neighbor onto the fixed 128×128 grid —
  `z = (d/255 − 0.5)`, **bright = near = toward the camera** — colors each
  point from the photo (new `aColor` attribute; pre-upload tint = M2 look),
  flips depth+color Y identically, and preserves photo aspect via object
  scale. Input disabled while a pass runs (never queue); bad-file and
  model-load failures surface in `#status` (console.warn, not error). Z sign
  **verified empirically against the real model** (COCO cats photo: cats
  landed nearer than the couch backrest) per the mandatory acceptance
  criterion; WASM-fallback path exercised in the same run. Smoke tests: M3-A
  synthetic depth ramp → sign/color/point-budget asserts; M3-B non-image file
  → visible error state, no console errors. Proven non-tautological (RED with
  production files reverted, tests kept). Pre-change HEAD (rollback) `5e01170`.

---

## NEXT (the one actionable task)

### Milestone 4 — Live webcam input

**Goal:** `getUserMedia` → offscreen canvas; a continuous depth-inference loop
**decoupled** from render (post the latest depth map; render consumes newest;
**drop frames, never queue** — the render loop never blocks on inference); reuse
the M2/M3 cloud, splat shader, and `applyDepthToCloud` mapping.

**Carry-over facts from M3 (do not re-derive):**

- The confirmed depth output contract lives in the M3 DONE entry above and in
  `src/depth.js`'s header comment: `depth` RawImage, Uint8, 1 channel, input
  W×H, 0–255 min–max normalized, **brighter = nearer** (sign verified
  empirically 2026-07-03).
- transformers.js 4.2.0 quirk: a rejected WebGPU session init **poisons the
  library's shared `webInitChain`** — in-page retry on another device is
  impossible. `src/depth.js` therefore probes `requestAdapter()` and picks the
  device once; keep that pattern.
- The estimator accepts a URL/Blob; for webcam frames an offscreen-canvas blob
  or RawImage input path will need confirming against the pipeline source
  before use (**do not guess** — CLAUDE.md rule).

**Autopilot note:** M4 IS the inference↔render decoupling milestone — the
effort↔pick gate applies (proceed only at known-high session effort). WASM
inference runs on the main thread on this version; whether a worker is needed to
hold the 30fps orbit constraint is an open design question for this milestone.

**Test command:** `npm test` (builds, then runs Playwright).

---

## BLOCKED — do NOT start until the prior milestone has merged

These are here for context only. Each depends on the one before it and must not be
picked up in the same run.

- **Milestone 5 — Toggle + polish.** Webcam/Photo toggle with clean webcam
  teardown; FPS + inference-time readout; graceful WebGPU-unavailable message
  (fall back to WASM, warn it's slower — M3 already console.warns and picks
  WASM; M5 makes it user-visible); error states for no-camera-permission,
  bad file, model-load failure. Blocked on M4.

---

## CI / merge-gate note for autopilot

- CI runs two jobs. **`build`** is the reliable gate. **`smoke`** runs the
  headless WebGL test under software SwiftShader and _may_ be flaky across
  Chromium versions.
- If the `smoke` job proves unstable on CI, the **`build`** job plus the **local**
  `npm test` (which exercises real WebGL in the autopilot session) together stand
  in for the runtime proof — a visual milestone can't be fully proven by CI alone.
  Do not weaken/delete the smoke test to force green; if CI is red for a real
  reason, bail and report per the autopilot rules.
- Do not edit dependencies or CI config as part of a milestone task — the
  bootstrap already provisioned `three`, Vite, Playwright, and CI. The one
  intended runtime-dependency addition, `@huggingface/transformers` (the depth
  model), is **already added (v4.2.0)** for M3 — no further dependency edits. Do
  not touch CI config.
