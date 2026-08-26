import * as THREE from "three";

function graphite() {
  return new THREE.MeshStandardMaterial({
    color: 0x3a3d42,
    metalness: 0.3,
    roughness: 0.7,
    envMapIntensity: 0.42,
  });
}

function lipSteel() {
  return new THREE.MeshStandardMaterial({
    color: 0x5c6066,
    metalness: 0.52,
    roughness: 0.4,
    envMapIntensity: 1.15,
  });
}

function baffleMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x121316,
    metalness: 0.12,
    roughness: 0.86,
    envMapIntensity: 0.08,
    side: THREE.DoubleSide,
  });
}

function bladeMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x2a2c32,
    metalness: 0.35,
    roughness: 0.48,
    envMapIntensity: 0.2,
  });
}

function radialThicknessMap() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(size, size);
  const mid = (size - 1) * 0.5;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - mid) / mid;
      const dy = (y - mid) / mid;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const v = Math.round(255 * r * r);
      const i = (y * size + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function makeFrontGlass(cheap, env) {
  const thicknessMap = radialThicknessMap();
  if (cheap) {
    return new THREE.MeshPhysicalMaterial({
      color: 0xc5ced8,
      metalness: 0,
      roughness: 0.04,
      ior: 1.52,
      thickness: 0.9,
      thicknessMap,
      dispersion: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      opacity: 0.42,
      transparent: true,
      depthWrite: false,
      envMap: env,
      envMapIntensity: 2.4,
      vertexColors: true,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    opacity: 1,
    transparent: false,
    thickness: 1.15,
    thicknessMap,
    ior: 1.52,
    dispersion: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    attenuationColor: new THREE.Color(0xd0dae4),
    attenuationDistance: 2.2,
    envMap: env,
    envMapIntensity: 1.85,
    specularIntensity: 1,
    vertexColors: true,
  });
}

function frontElementGeometry() {
  const R = 0.58;
  const frontSag = 0.16;
  const pts = [];
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    const r = R * t;
    const yFront = frontSag * (1 - t * t);
    const yBack = yFront - (0.09 - 0.03 * (1 - t * t));
    pts.push(new THREE.Vector2(r, yBack));
  }
  for (let i = 12; i >= 0; i -= 1) {
    const t = i / 12;
    pts.push(new THREE.Vector2(Math.max(R * t, 0.0008), frontSag * (1 - t * t)));
  }
  const geo = new THREE.LatheGeometry(pts, 24);
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uv.setXY(i, x / R * 0.5 + 0.5, z / R * 0.5 + 0.5);
    const edge = Math.max(0, Math.min(1, (Math.hypot(x, z) - 0.48) / 0.1));
    const a = Math.atan2(z, x);
    const g = 0.5 + 0.5 * Math.sin(a * 2);
    colors[i * 3] = 1 - edge * (0.1 + 0.16 * (1 - g));
    colors[i * 3 + 1] = 1 - edge * (0.05 + 0.1 * g);
    colors[i * 3 + 2] = 1 - edge * (0.08 + 0.14 * (1 - g));
  }
  uv.needsUpdate = true;
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

function rearFloorGeometry() {
  const pts = [];
  for (let i = 12; i >= 0; i -= 1) {
    const t = i / 12;
    pts.push(new THREE.Vector2(0.62 * t, -0.06 * (1 - t * t)));
  }
  return new THREE.LatheGeometry(pts, 16);
}

function addIris(optic, mat) {
  const count = 9;
  for (let i = 0; i < count; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.01, 0.13), mat);
    const a = (i / count) * Math.PI * 2;
    blade.position.set(Math.cos(a) * 0.24, -0.48, Math.sin(a) * 0.24);
    blade.rotation.y = a + 0.58;
    blade.rotation.x = 0.16;
    optic.add(blade);
  }
}

function bindAll(mats, env) {
  for (const mat of mats) {
    mat.envMap = env;
  }
}

export function createLens(cheapGlass, env) {
  const root = new THREE.Group();
  const yaw = new THREE.Group();
  const optic = new THREE.Group();

  const body = graphite();
  const lip = lipSteel();
  const baffle = baffleMat();
  const blades = bladeMat();
  const glass = makeFrontGlass(cheapGlass, env);
  bindAll([body, lip, baffle, blades], env);

  const retain = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.028, 6, 24), lip);
  retain.rotation.x = Math.PI / 2;
  retain.position.y = 0.02;
  optic.add(retain);

  const recess = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.7, 0.36, 24, 1, true),
    baffle
  );
  recess.position.y = -0.16;
  optic.add(recess);

  const element = new THREE.Mesh(frontElementGeometry(), glass);
  element.name = "lens";
  optic.add(element);

  const spacer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.64, 0.22, 20, 1, true),
    baffle
  );
  spacer.position.y = -0.24;
  optic.add(spacer);

  const baffles = [
    [0.64, 0.012, -0.1],
    [0.55, 0.012, -0.28],
    [0.44, 0.012, -0.58],
  ];
  for (const [r, tube, y] of baffles) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 4, 14), baffle);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    optic.add(ring);
  }

  addIris(optic, blades);

  const floor = new THREE.Mesh(rearFloorGeometry(), baffle);
  floor.position.y = -0.78;
  optic.add(floor);

  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(1.02, 1.0, 0.72, 28, 1, true),
    body
  );
  sleeve.position.y = -0.28;
  optic.add(sleeve);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 0.9, 0.95, 28, 1, true),
    body
  );
  barrel.position.y = -1.08;
  optic.add(barrel);

  const rearCap = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), body);
  rearCap.rotation.x = Math.PI / 2;
  rearCap.position.y = -1.56;
  optic.add(rearCap);

  const rings = [
    [1.03, 0.018, -0.06, lip],
    [1.04, 0.016, -0.22, body],
    [1.03, 0.016, -0.42, body],
    [0.98, 0.016, -0.88, body],
  ];
  for (const [r, tube, y, mat] of rings) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 4, 18), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    optic.add(ring);
  }

  optic.rotation.x = Math.PI / 2;
  yaw.add(optic);
  root.add(yaw);

  return {
    root,
    yaw,
    optic,
    element,
    bindEnv(next) {
      glass.envMap = next;
      bindAll([body, lip, baffle, blades], next);
    },
  };
}

export function createPool() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
  grad.addColorStop(0, "rgba(40,42,46,0.5)");
  grad.addColorStop(0.42, "rgba(16,16,18,0.18)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 32),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    })
  );
  mesh.position.set(0.2, -1.15, -0.55);
  mesh.lookAt(0, 0.2, 4);
  return mesh;
}

function bake(pmrem, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  paint(canvas.getContext("2d"));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  return env;
}

function paintRest(ctx) {
  ctx.fillStyle = "#8a96a6";
  ctx.fillRect(0, 0, 256, 46);
  ctx.fillStyle = "#6c7684";
  ctx.fillRect(0, 46, 256, 16);
  ctx.fillStyle = "#c48a48";
  ctx.fillRect(0, 62, 256, 10);
  ctx.fillStyle = "#7a3e18";
  ctx.fillRect(0, 72, 256, 10);
  ctx.fillStyle = "#101214";
  ctx.fillRect(0, 82, 256, 46);
  ctx.fillStyle = "rgba(220,226,234,0.35)";
  ctx.beginPath();
  ctx.ellipse(70, 16, 28, 3, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(190, 12, 22, 2, 0.06, 0, Math.PI * 2);
  ctx.fill();
}

function paintSites(ctx) {
  ctx.fillStyle = "#6a7c88";
  ctx.fillRect(0, 0, 256, 50);
  ctx.fillStyle = "#4e5c64";
  ctx.fillRect(0, 50, 256, 18);
  ctx.fillStyle = "#8a6a48";
  ctx.fillRect(0, 68, 256, 8);
  ctx.fillStyle = "#121416";
  ctx.fillRect(0, 76, 256, 52);
  ctx.fillStyle = "rgba(180,196,204,0.28)";
  ctx.fillRect(20, 20, 70, 4);
  ctx.fillRect(160, 14, 50, 3);
}

function paintInteriors(ctx) {
  ctx.fillStyle = "#1a1612";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#3a3228";
  ctx.fillRect(0, 40, 256, 48);
  ctx.fillStyle = "#d2b48a";
  ctx.fillRect(28, 48, 36, 22);
  ctx.fillRect(86, 52, 28, 18);
  ctx.fillRect(150, 46, 40, 24);
  ctx.fillRect(210, 54, 22, 16);
  ctx.fillStyle = "rgba(255,220,170,0.18)";
  ctx.fillRect(0, 44, 256, 8);
}

function paintEvents(ctx) {
  ctx.fillStyle = "#0c1016";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#1a2430";
  ctx.fillRect(0, 36, 256, 28);
  ctx.fillStyle = "#c8d0d8";
  for (const [x, y, r] of [
    [40, 18, 2],
    [90, 10, 1.5],
    [150, 22, 2],
    [210, 14, 1.4],
    [70, 70, 1.2],
    [180, 64, 1.6],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createEnvironments(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const maps = {
    rest: bake(pmrem, paintRest),
    sites: bake(pmrem, paintSites),
    interiors: bake(pmrem, paintInteriors),
    events: bake(pmrem, paintEvents),
  };
  pmrem.dispose();
  return maps;
}
