// ---------------------------------------------------------------------------
// Milestone 5: HUD readouts — render FPS, per-pass inference time, and the
// user-visible warning when depth runs on the WASM fallback.
//
// Deliberately decoupled from the render loop: the FPS meter is its own
// self-scheduled rAF counter. rAF callbacks fire once per rendered page frame
// on the same cadence as the main loop's rAF — and stall with it when a WASM
// inference pass blocks the thread — so this measures the real frame cadence
// without touching animate() or the M4 post/consume machinery in main.js.
// ---------------------------------------------------------------------------

export function initHud(parent) {
  const hud = document.createElement('div');
  hud.id = 'hud';

  const fpsEl = document.createElement('div');
  fpsEl.id = 'hud-fps';
  fpsEl.textContent = '— fps';
  const inferEl = document.createElement('div');
  inferEl.id = 'hud-infer';
  inferEl.textContent = 'inference: —';
  const deviceEl = document.createElement('div');
  deviceEl.id = 'device-note';
  deviceEl.hidden = true;
  deviceEl.textContent = 'WebGPU unavailable — depth runs on WASM (slower).';
  hud.append(fpsEl, inferEl, deviceEl);
  parent.appendChild(hud);

  // Count rAF ticks and report once a ≥1s window has elapsed. A report only
  // ever lands ON a frame, so every reported window contains at least one
  // frame — fps is always > 0 once the first window closes, even when
  // software rendering drops below 1fps (then it reads e.g. "0.4 fps").
  let fps = 0;
  let frames = 0;
  let windowStart = performance.now();
  (function meter(now) {
    frames++;
    const elapsed = now - windowStart;
    if (elapsed >= 1000) {
      fps = (frames * 1000) / elapsed;
      fpsEl.textContent = `${fps.toFixed(1)} fps`;
      frames = 0;
      windowStart = now;
    }
    requestAnimationFrame(meter);
  })(windowStart);

  let lastInferenceMs = 0;
  function recordInference(ms) {
    lastInferenceMs = ms;
    inferEl.textContent = `inference: ${Math.round(ms)} ms`;
  }

  return {
    getFps: () => fps,
    getLastInferenceMs: () => lastInferenceMs,
    // Wrap an estimator so every pass reports its duration — the one shared
    // timing seam for both the photo handler and the webcam loop. A pure
    // pass-through otherwise: same input, same result, rejections propagate.
    timeEstimator: (estimator) => async (input) => {
      const t0 = performance.now();
      const out = await estimator(input);
      recordInference(performance.now() - t0);
      return out;
    },
    // Surface the depth device once known; only WASM warrants a warning.
    noteDevice: (device) => {
      deviceEl.hidden = device !== 'wasm';
    },
  };
}
