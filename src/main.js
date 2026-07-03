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
// MILESTONE 1: a fake 128x128 point cloud (16,384 points) to prove the render
// pipeline and camera controls with real geometry. Grid on the XY plane,
// centered at the origin (-1..1 in X and Y) so it sits in front of the camera
// at z = 3; each point gets a random Z (-0.5..0.5) so the cloud has depth to
// orbit around. Default PointsMaterial for now — the splat shader is M2.
// ===========================================================================
const GRID = 128; // 128 x 128 = 16,384 points
const positions = new Float32Array(GRID * GRID * 3);
for (let iy = 0; iy < GRID; iy++) {
  for (let ix = 0; ix < GRID; ix++) {
    const i = (iy * GRID + ix) * 3;
    positions[i] = (ix / (GRID - 1)) * 2 - 1; // x: -1..1
    positions[i + 1] = (iy / (GRID - 1)) * 2 - 1; // y: -1..1
    positions[i + 2] = Math.random() - 0.5; // z: -0.5..0.5
  }
}

const cloudGeometry = new THREE.BufferGeometry();
cloudGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const cloud = new THREE.Points(
  cloudGeometry,
  new THREE.PointsMaterial({ size: 0.03 }),
);
scene.add(cloud);

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
