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
    color: 0xb4bac2,
    metalness: 0.82,
    roughness: 0.2,
    envMapIntensity: 1.7,
  });
}

function baffleMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x16181c,
    metalness: 0.08,
    roughness: 0.9,
    envMapIntensity: 0.06,
    side: THREE.DoubleSide,
  });
}

function bladeMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x8a9098,
    metalness: 0.48,
    roughness: 0.36,
    envMapIntensity: 0.28,
    side: THREE.DoubleSide,
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
  return new THREE.MeshPhysicalMaterial({
    color: cheap ? 0xc5ced8 : 0xd8e0e8,
    metalness: 0,
    roughness: 0.12,
    ior: 1.52,
    thickness: 0.7,
    thicknessMap,
    dispersion: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.08,
    opacity: 1,
    transparent: false,
    transmission: 0,
    depthWrite: true,
    wireframe: false,
    flatShading: false,
    side: THREE.DoubleSide,
    envMap: env,
    envMapIntensity: 1.85,
    specularIntensity: 1,
    vertexColors: true,
  });
}

function frontElementGeometry() {
  const R = 0.34;
  const sag = -0.03;
  const pts = [];
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    pts.push(new THREE.Vector2(R * t, sag * (1 - t * t)));
  }
  const geo = new THREE.LatheGeometry(pts, 64);
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    n.set(x * 0.22, 1, z * 0.22).normalize();
    nrm.setXYZ(i, n.x, n.y, n.z);
    const edge = Math.max(0, Math.min(1, (Math.hypot(x, z) - 0.24) / 0.08));
    const a = Math.atan2(z, x);
    const g = 0.5 + 0.5 * Math.sin(a * 2);
    colors[i * 3] = 1 - edge * (0.1 + 0.16 * (1 - g));
    colors[i * 3 + 1] = 1 - edge * (0.05 + 0.1 * g);
    colors[i * 3 + 2] = 1 - edge * (0.08 + 0.14 * (1 - g));
  }
  nrm.needsUpdate = true;
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

function irisBladeGeometry() {
  const shape = new THREE.Shape();
  const inner = 0.46;
  const outer = 0.74;
  const innerSweep = 0.46;
  const outerSweep = 0.86;
  const inner0 = -0.3;
  const outer0 = -0.12;
  shape.moveTo(Math.cos(inner0) * inner, Math.sin(inner0) * inner);
  for (let i = 1; i <= 7; i += 1) {
    const t = inner0 + (i / 7) * innerSweep;
    shape.lineTo(Math.cos(t) * inner, Math.sin(t) * inner);
  }
  for (let i = 7; i >= 0; i -= 1) {
    const t = outer0 + (i / 7) * outerSweep;
    shape.lineTo(Math.cos(t) * outer, Math.sin(t) * outer);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.014,
    bevelEnabled: false,
    curveSegments: 1,
  });
}

function addIris(optic, mat) {
  const y = -0.1;
  const housing = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.02, 10, 48), mat);
  housing.rotation.x = Math.PI / 2;
  housing.position.y = y;
  optic.add(housing);

  const geo = irisBladeGeometry();
  const count = 9;
  for (let i = 0; i < count; i += 1) {
    const pivot = new THREE.Group();
    pivot.position.y = y;
    pivot.rotation.y = (i / count) * Math.PI * 2;
    const blade = new THREE.Mesh(geo, mat);
    blade.rotation.x = -Math.PI / 2;
    blade.position.y = -0.007;
    pivot.add(blade);
    optic.add(pivot);
  }
}

function addBaffle(optic, mat, inner, outer, y) {
  const face = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 28), mat);
  face.rotation.x = -Math.PI / 2;
  face.position.y = y;
  optic.add(face);
  const lip = new THREE.Mesh(
    new THREE.CylinderGeometry(inner, inner + 0.018, 0.045, 24, 1, true),
    mat
  );
  lip.position.y = y - 0.02;
  optic.add(lip);
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

  const retain = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.05, 16, 64), lip);
  retain.rotation.x = Math.PI / 2;
  retain.position.y = 0.06;
  optic.add(retain);

  const steps = [
    [0.8, 0.76, 0.22, -0.08],
    [0.74, 0.66, 0.28, -0.34],
    [0.64, 0.54, 0.3, -0.64],
    [0.52, 0.42, 0.28, -0.94],
  ];
  for (const [rt, rb, h, y] of steps) {
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(rt, rb, h, 28, 1, true),
      baffle
    );
    wall.position.y = y;
    optic.add(wall);
  }

  addBaffle(optic, baffle, 0.58, 0.78, -0.22);
  addBaffle(optic, baffle, 0.48, 0.68, -0.5);
  addBaffle(optic, baffle, 0.36, 0.56, -0.78);

  addIris(optic, blades);

  const element = new THREE.Mesh(frontElementGeometry(), glass);
  element.name = "lens";
  element.position.y = -1.02;
  optic.add(element);

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
  ctx.fillStyle = "#b4c2d2";
  ctx.fillRect(0, 0, 256, 46);
  ctx.fillStyle = "#8a96a4";
  ctx.fillRect(0, 46, 256, 16);
  ctx.fillStyle = "#d4a056";
  ctx.fillRect(0, 62, 256, 10);
  ctx.fillStyle = "#8a4a1c";
  ctx.fillRect(0, 72, 256, 10);
  ctx.fillStyle = "#0c0e10";
  ctx.fillRect(0, 82, 256, 46);
  ctx.fillStyle = "rgba(236,240,246,0.55)";
  ctx.beginPath();
  ctx.ellipse(70, 16, 28, 3, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(190, 12, 22, 2, 0.06, 0, Math.PI * 2);
  ctx.fill();
}

function paintSites(ctx) {
  ctx.fillStyle = "#8aa0ae";
  ctx.fillRect(0, 0, 256, 50);
  ctx.fillStyle = "#5c6c74";
  ctx.fillRect(0, 50, 256, 18);
  ctx.fillStyle = "#b88850";
  ctx.fillRect(0, 68, 256, 8);
  ctx.fillStyle = "#0c0e10";
  ctx.fillRect(0, 76, 256, 52);
  ctx.fillStyle = "rgba(210,224,232,0.4)";
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
