import * as THREE from "three";
import { createEnvironment, createLens } from "./lens.js";

const canvas = document.getElementById("stage");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const iphone = /iPhone|iPod/i.test(navigator.userAgent);
const phone = iphone || window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 800;

const glOpts = {
  antialias: !phone,
  alpha: false,
  powerPreference: "high-performance",
  stencil: false,
  depth: true,
  preserveDrawingBuffer: true,
};

const gl = canvas.getContext("webgl2", glOpts);

if (!gl) {
  document.body.style.background = "#000";
} else {
  boot();
}

function dpr() {
  return iphone ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
}

function boot() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl,
    antialias: !phone,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(dpr());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    28,
    window.innerWidth / window.innerHeight,
    0.05,
    40
  );

  const env = createEnvironment(renderer);
  scene.environment = env;

  const lens = createLens(iphone, env);
  scene.add(lens.root);
  placeLens();

  scene.add(new THREE.AmbientLight(0xc4d0e4, 0.62));
  const key = new THREE.DirectionalLight(0xffd4a8, 1.45);
  key.position.set(-1.6, 1.8, 5.2);
  key.castShadow = false;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88a4cc, 0.78);
  fill.position.set(2.6, -0.15, 4.1);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffb070, 0.62);
  rim.position.set(0.15, 2.5, -2.6);
  scene.add(rim);

  const keys = [
    { t: 0, pos: [0, 0.02, 4.35], look: [0, 0, 0.2], yaw: 0, pitch: 0, fov: 30 },
    { t: 0.2, pos: [0.2, 0.14, 4.75], look: [0.02, 0.02, 0.16], yaw: 0.1, pitch: 0.03, fov: 31 },
    { t: 0.4, pos: [0.52, 0.12, 5.05], look: [0, 0.03, 0.12], yaw: 0.26, pitch: 0.04, fov: 32 },
    { t: 0.6, pos: [0.82, 0.18, 4.45], look: [0, 0.02, 0.1], yaw: 0.4, pitch: 0.02, fov: 31 },
    { t: 0.8, pos: [0.28, 0.1, 4.9], look: [0, 0, 0.16], yaw: 0.14, pitch: 0.03, fov: 30 },
    { t: 1, pos: [0.1, 0.06, 4.15], look: [0.03, 0, 0.22], yaw: 0.08, pitch: 0.02, fov: 28 },
  ];

  const rest = keys[0];
  let armed = false;
  let scrollY = window.scrollY;
  const look = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  applyPose(rest, rest, 0);
  renderer.compile(scene, camera);

  function centerSum() {
    const w = canvas.width;
    const h = canvas.height;
    if (w < 8 || h < 8) return 0;
    const sw = Math.min(32, w);
    const sh = Math.min(32, h);
    const buf = new Uint8Array(sw * sh * 4);
    gl.readPixels(
      Math.max(0, (w >> 1) - (sw >> 1)),
      Math.max(0, (h >> 1) - (sh >> 1)),
      sw,
      sh,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      buf
    );
    let max = 0;
    for (let i = 0; i < buf.length; i += 4) {
      const v = buf[i] + buf[i + 1] + buf[i + 2];
      if (v > max) max = v;
    }
    return max;
  }

  let bootFrames = 0;
  while (bootFrames < 8) {
    renderer.render(scene, camera);
    bootFrames += 1;
    if (centerSum() >= 48) break;
  }
  function bootPaint() {
    if (centerSum() >= 48 || bootFrames >= 16) return;
    renderer.render(scene, camera);
    bootFrames += 1;
    requestAnimationFrame(bootPaint);
  }
  if (centerSum() < 48) requestAnimationFrame(bootPaint);

  window.addEventListener(
    "scroll",
    () => {
      scrollY = window.scrollY;
      if (scrollY > 0) armed = true;
      if (reduced) return;
      paint();
    },
    { passive: true }
  );

  window.addEventListener("resize", onResize);

  const form = document.getElementById("inquire");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const want = String(data.get("want") || "").trim();
    const date = String(data.get("date") || "").trim();
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nDate: ${date}\n\n${want}`
    );
    window.location.href = `mailto:deadlysinsutube@gmail.com?subject=${encodeURIComponent("[TesDrive inquiry]")}&body=${body}`;
  });

  function progress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    return Math.min(1, Math.max(0, scrollY / max));
  }

  function sample(t) {
    if (t <= keys[0].t) return { a: keys[0], b: keys[0], u: 0 };
    const last = keys[keys.length - 1];
    if (t >= last.t) return { a: last, b: last, u: 0 };
    for (let i = 0; i < keys.length - 1; i += 1) {
      const a = keys[i];
      const b = keys[i + 1];
      if (t >= a.t && t <= b.t) return { a, b, u: (t - a.t) / (b.t - a.t) };
    }
    return { a: keys[0], b: keys[0], u: 0 };
  }

  function lerp(a, b, u) {
    return a + (b - a) * u;
  }

  function applyPose(a, b, u) {
    camPos.set(
      lerp(a.pos[0], b.pos[0], u),
      lerp(a.pos[1], b.pos[1], u),
      lerp(a.pos[2], b.pos[2], u)
    );
    look.set(
      lerp(a.look[0], b.look[0], u),
      lerp(a.look[1], b.look[1], u),
      lerp(a.look[2], b.look[2], u)
    );
    camera.position.copy(camPos);
    camera.lookAt(look);
    const fov = lerp(a.fov, b.fov, u);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    lens.yaw.rotation.y = lerp(a.yaw, b.yaw, u);
    lens.yaw.rotation.x = lerp(a.pitch, b.pitch, u);
  }

  function paint() {
    if (!reduced && armed) {
      const { a, b, u } = sample(progress());
      applyPose(a, b, u);
    }
    renderer.render(scene, camera);
  }

  function placeLens() {
    lens.root.position.set(0, 0, 0);
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr());
    renderer.setSize(w, h, false);
    placeLens();
    paint();
  }
}
