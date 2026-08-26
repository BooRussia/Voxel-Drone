import * as THREE from "three";

function satinBlack() {
  return new THREE.MeshStandardMaterial({
    color: 0x0b0b0d,
    metalness: 0.7,
    roughness: 0.48,
    envMapIntensity: 0.4,
  });
}

function lipMetal() {
  return new THREE.MeshStandardMaterial({
    color: 0x1c1e22,
    metalness: 0.88,
    roughness: 0.32,
    envMapIntensity: 0.7,
  });
}

function wellMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x060607,
    metalness: 0.18,
    roughness: 0.78,
    envMapIntensity: 0.08,
  });
}

function bladeMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x3a3c42,
    metalness: 0.5,
    roughness: 0.4,
    envMapIntensity: 0.25,
  });
}

function radialThicknessMap() {
  const size = 256;
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

function makeElement(cheap) {
  const thicknessMap = radialThicknessMap();
  if (cheap) {
    return new THREE.MeshPhysicalMaterial({
      color: 0xcfd8e4,
      metalness: 0,
      roughness: 0,
      ior: 1.52,
      thickness: 1.2,
      thicknessMap,
      dispersion: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      opacity: 1,
      transparent: false,
      envMapIntensity: 1.05,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    opacity: 1,
    transparent: false,
    thickness: 1.35,
    thicknessMap,
    ior: 1.52,
    dispersion: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    attenuationColor: new THREE.Color(0x9aadc2),
    attenuationDistance: 0.45,
    envMapIntensity: 0.95,
    specularIntensity: 1,
  });
}

function frontElementGeometry() {
  const R = 1.08;
  const frontSag = 0.22;
  const edgeT = 0.12;
  const pts = [];
  for (let i = 0; i <= 18; i += 1) {
    const t = i / 18;
    const r = R * t;
    const yFront = frontSag * (1 - t * t);
    const yBack = yFront - (edgeT - (edgeT - 0.07) * (1 - t * t));
    pts.push(new THREE.Vector2(r, yBack));
  }
  for (let i = 18; i >= 0; i -= 1) {
    const t = i / 18;
    const r = Math.max(R * t, 0.0008);
    pts.push(new THREE.Vector2(r, frontSag * (1 - t * t)));
  }
  const geo = new THREE.LatheGeometry(pts, 64);
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i) / R;
    const z = pos.getZ(i) / R;
    uv.setXY(i, x * 0.5 + 0.5, z * 0.5 + 0.5);
  }
  uv.needsUpdate = true;
  return geo;
}

function addIris(optic, mat) {
  const count = 9;
  for (let i = 0; i < count; i += 1) {
    const blade = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.048, 6, 16, Math.PI * 0.7),
      mat
    );
    const a = (i / count) * Math.PI * 2;
    blade.rotation.x = Math.PI / 2;
    blade.rotation.z = a + 0.32;
    blade.position.y = -0.22;
    optic.add(blade);
  }
}

export function createLens(cheapGlass) {
  const root = new THREE.Group();
  const yaw = new THREE.Group();
  const optic = new THREE.Group();

  const black = satinBlack();
  const lip = lipMetal();
  const well = wellMat();
  const glass = makeElement(cheapGlass);

  const retain = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.048, 10, 64), lip);
  retain.rotation.x = Math.PI / 2;
  retain.position.y = 0;
  optic.add(retain);

  const recessWall = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.1, 0.18, 64, 1, true),
    well
  );
  recessWall.position.y = -0.08;
  optic.add(recessWall);

  const element = new THREE.Mesh(frontElementGeometry(), glass);
  element.name = "lens";
  optic.add(element);

  const rings = [
    [1.22, 0.032, -0.08, lip],
    [1.3, 0.028, -0.18, black],
    [1.38, 0.03, -0.28, lip],
    [1.46, 0.026, -0.38, black],
    [1.54, 0.03, -0.48, black],
  ];
  for (const [r, tube, y, mat] of rings) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 48), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    optic.add(ring);
  }

  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(1.56, 1.5, 0.55, 48), black);
  sleeve.position.y = -0.28;
  optic.add(sleeve);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.32, 0.55, 40), black);
  barrel.position.y = -0.72;
  optic.add(barrel);

  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.36, 0.55, 32, 1, true), well);
  throat.position.y = -0.22;
  optic.add(throat);

  const baffle = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.018, 6, 28), well);
  baffle.rotation.x = Math.PI / 2;
  baffle.position.y = -0.16;
  optic.add(baffle);

  addIris(optic, bladeMat());

  optic.rotation.x = -Math.PI / 2;
  yaw.add(optic);
  root.add(yaw);

  return { root, yaw, optic, element };
}

function pine(ctx, x, baseY, h, w) {
  ctx.fillStyle = "#040506";
  ctx.beginPath();
  ctx.moveTo(x, baseY - h);
  ctx.lineTo(x + w * 0.16, baseY - h * 0.6);
  ctx.lineTo(x + w * 0.06, baseY - h * 0.6);
  ctx.lineTo(x + w * 0.26, baseY - h * 0.32);
  ctx.lineTo(x + w * 0.08, baseY - h * 0.32);
  ctx.lineTo(x + w * 0.36, baseY);
  ctx.lineTo(x - w * 0.36, baseY);
  ctx.lineTo(x - w * 0.08, baseY - h * 0.32);
  ctx.lineTo(x - w * 0.26, baseY - h * 0.32);
  ctx.lineTo(x - w * 0.06, baseY - h * 0.6);
  ctx.lineTo(x - w * 0.16, baseY - h * 0.6);
  ctx.closePath();
  ctx.fill();
}

export function createEnvironment(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#7d8ea4";
  ctx.fillRect(0, 0, 256, 44);
  ctx.fillStyle = "#66758c";
  ctx.fillRect(0, 44, 256, 18);
  ctx.fillStyle = "#b67a3c";
  ctx.fillRect(0, 62, 256, 9);
  ctx.fillStyle = "#d89a46";
  ctx.fillRect(0, 69, 256, 6);
  ctx.fillStyle = "#6a3818";
  ctx.fillRect(0, 75, 256, 8);
  ctx.fillStyle = "#08090c";
  ctx.fillRect(0, 83, 256, 45);

  ctx.fillStyle = "rgba(230, 236, 244, 0.4)";
  ctx.beginPath();
  ctx.ellipse(48, 18, 29, 3, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(105, 11, 20, 2, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(170, 20, 36, 3, 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(228, 9, 18, 2, -0.06, 0, Math.PI * 2);
  ctx.fill();

  pine(ctx, 20, 84, 43, 22);
  pine(ctx, 36, 84, 31, 15);
  pine(ctx, 7, 84, 26, 13);
  pine(ctx, 237, 84, 44, 23);
  pine(ctx, 220, 84, 32, 16);
  pine(ctx, 250, 84, 25, 12);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}
