import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Live Depth Field — render/camera scaffold.
//
// This file stands up the Three.js pipeline and camera controls only. The
// actual point cloud is added per milestone (see STATUS.md). Right now the
// scene is intentionally empty so we can prove orbit/zoom/pan and resize work
// before any geometry or depth model exists.
// ---------------------------------------------------------------------------

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 0, 3);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ===========================================================================
// MILESTONE 1 GOES HERE:
//   Build a 128x128 grid of points (16,384 total) on the XY plane with a
//   random Z per point, wrap it in a THREE.Points, and add it to `scene`.
//   Nothing else in this file needs to change.
// ===========================================================================

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Debug/test hook: lets a headless smoke test introspect the scene graph
// without reading pixels. getPointCount() sums the vertices of every
// THREE.Points in the scene (0 until the cloud is added).
function getPointCount() {
  let n = 0;
  scene.traverse((o) => {
    if (o.isPoints && o.geometry?.attributes?.position) {
      n += o.geometry.attributes.position.count;
    }
  });
  return n;
}
window.__app = { THREE, scene, camera, renderer, controls, getPointCount };
