import * as THREE from "three";
import { createCraft, createEnvironment, createFlorida } from "./craft.js";

const canvas = document.getElementById("stage");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone =
  window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 800;

const glOpts = {
  antialias: !phone,
  alpha: false,
  powerPreference: "high-performance",
  stencil: false,
  depth: true,
};

const gl2 = canvas.getContext("webgl2", glOpts);
const gl = gl2 || canvas.getContext("webgl", glOpts);
const webgl2 = Boolean(gl2);
const cheapGlass = !webgl2 || phone;

if (!gl) {
  document.body.style.background = "#000";
} else {
  boot();
}

function boot() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl,
    antialias: !phone,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.038);

  const camera = new THREE.PerspectiveCamera(
    32,
    window.innerWidth / window.innerHeight,
    0.05,
    80
  );

  const env = createEnvironment(renderer);
  scene.environment = env;

  const craft = createCraft(cheapGlass);
  scene.add(craft.root);
  scene.add(createFlorida());
  placeCraft();

  const key = new THREE.DirectionalLight(0xf2f4ff, 2.15);
  key.position.set(2.1, 2.4, 3.2);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xb7c6e0, 1.15);
  rim.position.set(-3.4, 1.4, -1.2);
  scene.add(rim);

  const belly = new THREE.DirectionalLight(0xdde4f4, 0.55);
  belly.position.set(0.2, -1.8, 1.6);
  scene.add(belly);

  const fill = new THREE.AmbientLight(0x1a1c24, 0.55);
  scene.add(fill);

  const hemi = new THREE.HemisphereLight(0x2a2e3c, 0x08080c, 0.7);
  scene.add(hemi);

  const keys = [
    { t: 0, pos: [1.32, 0.2, 1.78], look: [0.04, -0.14, 0.16], yaw: 0, gy: 0, gp: 0.12, fov: 31 },
    { t: 0.17, pos: [1.55, 0.62, 2.35], look: [0.02, -0.28, 0.08], yaw: 0.28, gy: 0.18, gp: 0.42, fov: 33 },
    { t: 0.3, pos: [2.15, 2.05, 3.55], look: [0.0, -1.15, 0.12], yaw: 0.72, gy: 0.22, gp: 0.92, fov: 36 },
    { t: 0.48, pos: [0.15, 1.35, 4.55], look: [0, -0.05, 0], yaw: 1.15, gy: -0.18, gp: 0.18, fov: 35 },
    { t: 0.66, pos: [-2.15, 0.88, 3.25], look: [0, -0.04, 0], yaw: 1.65, gy: 0.28, gp: -0.08, fov: 34 },
    { t: 0.83, pos: [1.05, 0.42, 2.55], look: [0.08, -0.08, 0.1], yaw: 2.05, gy: 0.12, gp: 0.1, fov: 32 },
    { t: 1, pos: [2.55, 0.62, 2.35], look: [0.55, -0.06, 0.08], yaw: 2.35, gy: 0.04, gp: 0.06, fov: 31 },
  ];

  const rest = keys[0];
  camera.position.set(...rest.pos);
  camera.lookAt(rest.look[0], rest.look[1], rest.look[2]);
  camera.fov = rest.fov;
  camera.updateProjectionMatrix();

  let armed = false;
  let scrollY = window.scrollY;
  let raf = 0;
  const look = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  window.addEventListener(
    "scroll",
    () => {
      scrollY = window.scrollY;
      if (scrollY > 0) armed = true;
    },
    { passive: true }
  );

  window.addEventListener("resize", onResize);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      raf = requestAnimationFrame(tick);
    }
  });

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

  applyPose(rest, rest, 0);
  renderer.render(scene, camera);
  raf = requestAnimationFrame(tick);

  function progress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    return Math.min(1, Math.max(0, scrollY / max));
  }

  function sample(t) {
    if (t <= keys[0].t) return { a: keys[0], b: keys[0], u: 0 };
    if (t >= keys[keys.length - 1].t) {
      const last = keys[keys.length - 1];
      return { a: last, b: last, u: 0 };
    }
    for (let i = 0; i < keys.length - 1; i += 1) {
      const a = keys[i];
      const b = keys[i + 1];
      if (t >= a.t && t <= b.t) {
        return { a, b, u: (t - a.t) / (b.t - a.t) };
      }
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
    craft.airframe.rotation.y = lerp(a.yaw, b.yaw, u);
    craft.gimbal.rotation.y = lerp(a.gy, b.gy, u);
    craft.gimbal.rotation.x = lerp(a.gp, b.gp, u);
  }

  function placeCraft() {
    if (window.innerWidth < 800) {
      craft.root.position.set(0.42, 0.06, 0);
    } else {
      craft.root.position.set(0.22, 0, 0);
    }
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    placeCraft();
  }

  function tick(time) {
    if (document.hidden) {
      raf = 0;
      return;
    }

    if (!reduced && armed) {
      const { a, b, u } = sample(progress());
      applyPose(a, b, u);
      const spin = time * 0.008;
      for (const prop of craft.props) prop.rotation.y = spin;
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
}
