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
  });
  renderer.setPixelRatio(dpr());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    28,
    window.innerWidth / window.innerHeight,
    0.05,
    40
  );

  scene.environment = createEnvironment(renderer);

  const lens = createLens(iphone);
  scene.add(lens.root);
  placeLens();

  const key = new THREE.DirectionalLight(0xf0e6d4, 0.55);
  key.position.set(0.4, 1.2, 2.4);
  key.castShadow = false;
  scene.add(key);

  const fill = new THREE.AmbientLight(0x101218, 0.18);
  scene.add(fill);

  const keys = [
    { t: 0, pos: [0.12, 0.18, 2.2], look: [0, 0, 0.45], yaw: 0, pitch: 0.04, fov: 24 },
    { t: 0.2, pos: [0.22, 0.2, 2.4], look: [0, 0, 0.32], yaw: 0.16, pitch: 0.05, fov: 25 },
    { t: 0.4, pos: [0.7, 0.16, 2.15], look: [0, 0, 0.2], yaw: 0.48, pitch: 0.05, fov: 26 },
    { t: 0.6, pos: [1.15, 0.22, 1.7], look: [0, 0, 0.05], yaw: 0.88, pitch: 0.02, fov: 27 },
    { t: 0.8, pos: [0.35, 0.16, 2.25], look: [0, 0, 0.3], yaw: 0.24, pitch: 0.04, fov: 25 },
    { t: 1, pos: [0.72, 0.14, 2.1], look: [0.12, 0, 0.4], yaw: 0.12, pitch: 0.03, fov: 24 },
  ];

  const rest = keys[0];
  let armed = false;
  let scrollY = window.scrollY;
  const look = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  applyPose(rest, rest, 0);
  renderer.render(scene, camera);

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
