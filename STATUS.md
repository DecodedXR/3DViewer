# STATUS — Live Depth Field

Single source of truth for "what's next." One milestone per PR/run. Autopilot:
pick the one task under **NEXT**, ship it, stop. Do **not** start anything under
**BLOCKED**.

_Last updated: 2026-07-03 — bootstrap complete (scaffold + CI + smoke harness)._

---

## DONE

- **Milestone 0 — Bootstrap.** Repo flattened to root; Vite + Three.js 0.185
  scaffold; render/camera pipeline in `src/main.js` (empty scene, OrbitControls,
  resize, rAF loop); Playwright headless-WebGL smoke harness; two-job GitHub
  Actions CI (`build` + `smoke`). Baseline is green. The scaffold renders an
  empty scene on purpose — no point cloud yet.

---

## NEXT (the one actionable task)

### Milestone 1 — Scaffold + render a fake point cloud

**Goal:** prove the render pipeline and camera controls with real geometry. Upload
a photo / depth model come later; this milestone is pure Three.js.

**Scope (do exactly this, nothing more):**

- In `src/main.js`, at the marked `MILESTONE 1 GOES HERE` block, build a
  **128 × 128 grid = 16,384 points** on the XY plane.
  - Lay the grid out centered around the origin (roughly -1..1 in X and Y) so it
    sits in front of the camera at `z = 3`.
  - Give **each point a random Z** (e.g. in a small range like -0.5..0.5) so the
    cloud has visible depth to orbit around.
  - Use a `THREE.BufferGeometry` with a `position` attribute and wrap it in a
    `THREE.Points` with the default `THREE.PointsMaterial` (a small `size`, e.g.
    0.02–0.05). **The custom splat shader is Milestone 2 — do not do it here.**
  - Add the `THREE.Points` to `scene`. Do not otherwise change the render loop,
    controls, or resize handler.

**Definition of done (all must hold):**

1. `npm run build` succeeds.
2. `window.__app.getPointCount() === 16384` at runtime.
3. Orbit / zoom / pan work (they already do via OrbitControls — just don't break
   them). This is the human's visual confirm after merge.
4. No console/page errors on load.

**RED test to write first** (add to `tests/smoke.spec.js`; it must fail on the
current empty scaffold and pass only after the cloud is added — prove it's
non-tautological by reverting the `main.js` change and seeing it go red):

```js
test('milestone 1: renders a 128x128 (16,384-point) cloud', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => window.__app?.getPointCount() === 128 * 128);
  expect(await page.evaluate(() => window.__app.getPointCount())).toBe(16384);
  expect(errors).toEqual([]);
});
```

**Test command:** `npm test` (builds, then runs Playwright). Runs locally with a
real/software GL context.

---

## BLOCKED — do NOT start until the prior milestone has merged

These are here for context only. Each depends on the one before it and must not be
picked up in the same run. **M3 onward also carries a human checkpoint and is
off-limits to autopilot** until a human clears it.

- **Milestone 2 — Splat-style point aesthetic.** Replace `PointsMaterial` with a
  custom `ShaderMaterial`: round soft sprites (circular alpha falloff), additive
  blending, point size scaled by depth (closer = bigger), subtle glow. Tunable
  uniforms (`pointSize`, `glow`, `falloff`) wired to minimal sliders / dat.GUI.
  _Blocked on M1._

- **Milestone 3 — Photo input → depth → cloud.** File upload for one image; load
  Depth Anything V2 Small via transformers.js; run one depth pass; map depth →
  Z displacement of a point grid sized to the image; sample image pixels for
  per-point color; clear async loading state.
  ⚠️ **HUMAN CHECKPOINT / OFF-LIMITS TO AUTOPILOT:** must first STOP and confirm
  transformers.js output format (tensor shape + value range) with a human before
  wiring Z mapping — do **not** guess. Blocked on M2.

- **Milestone 4 — Live webcam input.** `getUserMedia` → offscreen canvas; depth
  inference loop **decoupled** from render (post latest depth map; render consumes
  newest; drop frames, never queue); reuse the M2 cloud + shader. Blocked on M3.

- **Milestone 5 — Toggle + polish.** Webcam/Photo toggle with clean webcam
  teardown; FPS + inference-time readout; graceful WebGPU-unavailable message
  (fall back to WASM, warn it's slower); error states for no-camera-permission,
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
  bootstrap already provisioned `three`, Vite, Playwright, and CI.
