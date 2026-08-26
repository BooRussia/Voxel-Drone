import * as THREE from "three";
import { createEnvironments, createLens, createPool } from "./lens.js";

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
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    32,
    window.innerWidth / window.innerHeight,
    0.05,
    40
  );

  const envs = createEnvironments(renderer);
  scene.environment = envs.rest;

  const lens = createLens(iphone, envs.rest, envs.world.rest);
  scene.add(lens.root);
  scene.add(createPool());

  scene.add(new THREE.AmbientLight(0x8a9098, 0.12));
  const key = new THREE.DirectionalLight(0xf4f0e8, 2.7);
  key.position.set(-0.4, 1.85, 2.55);
  key.target.position.set(0, 0.15, 0.06);
  key.castShadow = false;
  scene.add(key);
  scene.add(key.target);

  const keys = [
    { t: 0, pos: [0.08, 0.04, 4.05], look: [0.12, 0.08, -0.12], shift: [1.62, 1.22, 0], yaw: 0.2, pitch: 0.08, fov: 32, env: "rest" },
    { t: 0.2, pos: [0.08, 0.04, 4.3], look: [0.1, 0.06, -0.1], shift: [0.95, 0.7, 0], yaw: 0.24, pitch: 0.08, fov: 32, env: "rest" },
    { t: 0.4, pos: [0.06, 0.04, 4.5], look: [0.06, 0.04, -0.12], shift: [0.4, 0.26, 0], yaw: 0.16, pitch: 0.05, fov: 31, env: "sites" },
    { t: 0.6, pos: [0.08, 0.04, 4.6], look: [0.03, 0.02, -0.14], shift: [0.1, 0.06, 0], yaw: 0.1, pitch: 0.03, fov: 30, env: "interiors" },
    { t: 0.8, pos: [0.14, 0.06, 4.75], look: [0.04, 0.02, -0.12], shift: [0.04, 0.02, 0], yaw: 0.14, pitch: 0.04, fov: 30, env: "events" },
    { t: 1, pos: [0.05, 0.03, 4.35], look: [0, 0, -0.16], shift: [0, 0, 0], yaw: 0.08, pitch: 0.02, fov: 29, env: "rest" },
  ];

  const rest = keys[0];
  let armed = false;
  let scrollY = window.scrollY;
  let boundEnv = rest.env;
  const look = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  applyPose(rest, rest, 0);
  renderer.compile(scene, camera);

  function patchMax(px, py) {
    const w = canvas.width;
    const h = canvas.height;
    if (w < 8 || h < 8) return 0;
    const sw = Math.min(24, w);
    const sh = Math.min(24, h);
    const x = Math.max(0, Math.min(w - sw, px));
    const y = Math.max(0, Math.min(h - sh, py));
    const buf = new Uint8Array(sw * sh * 4);
    gl.readPixels(x, y, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let max = 0;
    for (let i = 0; i < buf.length; i += 4) {
      const v = buf[i] + buf[i + 1] + buf[i + 2];
      if (v > max) max = v;
    }
    return max;
  }

  function frameLit() {
    const w = canvas.width;
    const h = canvas.height;
    return Math.max(
      patchMax((w * 0.72) | 0, (h * 0.72) | 0),
      patchMax((w * 0.28) | 0, (h * 0.72) | 0),
      patchMax((w * 0.5) | 0, (h * 0.5) | 0)
    );
  }

  let bootFrames = 0;
  while (bootFrames < 8) {
    renderer.render(scene, camera);
    bootFrames += 1;
    if (frameLit() >= 48) break;
  }
  function bootPaint() {
    if (frameLit() >= 48 || bootFrames >= 16) return;
    renderer.render(scene, camera);
    bootFrames += 1;
    requestAnimationFrame(bootPaint);
  }
  if (frameLit() < 48) requestAnimationFrame(bootPaint);

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

  function applyEnv(name) {
    if (name === boundEnv) return;
    boundEnv = name;
    const next = envs[name] || envs.rest;
    scene.environment = next;
    lens.bindEnv(next, (envs.world && envs.world[name]) || envs.world.rest);
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
    lens.root.position.set(
      lerp(a.shift[0], b.shift[0], u),
      lerp(a.shift[1], b.shift[1], u),
      lerp(a.shift[2], b.shift[2], u)
    );
    lens.yaw.rotation.y = lerp(a.yaw, b.yaw, u);
    lens.yaw.rotation.x = lerp(a.pitch, b.pitch, u);
    applyEnv(u < 0.5 ? a.env : b.env);
  }

  function paint() {
    if (!reduced && armed) {
      const { a, b, u } = sample(progress());
      applyPose(a, b, u);
    }
    renderer.render(scene, camera);
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr());
    renderer.setSize(w, h, false);
    paint();
  }
}
