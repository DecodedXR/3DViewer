import { test, expect } from '@playwright/test';

// Baseline smoke test. Proves the render pipeline boots headlessly: the canvas
// mounts, a WebGL context is acquired (WebGLRenderer construction would throw
// otherwise), the app module initializes, and nothing errors during boot.
//
// This is intentionally milestone-agnostic and passes on the empty scaffold.
// Each milestone adds its own assertions (e.g. Milestone 1 asserts
// window.__app.getPointCount() === 16384). See STATUS.md.
test('app boots: canvas mounts, WebGL alive, no page errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  await page.goto('/');

  await expect(page.locator('canvas')).toBeVisible();

  // The debug hook only exists after the module ran end-to-end without throwing.
  await page.waitForFunction(
    () => !!window.__app && typeof window.__app.getPointCount === 'function',
  );

  expect(errors, `unexpected page errors:\n${errors.join('\n')}`).toEqual([]);
});

test('milestone 1: renders a 128x128 (16,384-point) cloud', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => window.__app?.getPointCount() === 128 * 128);
  expect(await page.evaluate(() => window.__app.getPointCount())).toBe(16384);
  expect(errors).toEqual([]);
});
