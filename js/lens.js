import * as THREE from "three";

function machinedBlack() {
  return new THREE.MeshStandardMaterial({
    color: 0x0c0c0e,
    metalness: 0.72,
    roughness: 0.38,
    envMapIntensity: 0.85,
  });
}

function chrome() {
  return new THREE.MeshStandardMaterial({
    color: 0xc8ccd4,
    metalness: 1,
    roughness: 0.14,
    envMapIntensity: 1.55,
  });
}

function baffleBlack() {
  return new THREE.MeshStandardMaterial({
    color: 0x050506,
    metalness: 0.2,
    roughness: 0.82,
    envMapIntensity: 0.2,
  });
}

function makeElement(cheap) {
  if (cheap) {
    return new THREE.MeshPhysicalMaterial({
      color: 0xe4eef6,
      metalness: 0.04,
      roughness: 0.03,
      ior: 1.5,
      thickness: 0.9,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      opacity: 1,
      transparent: false,
      envMapIntensity: 2.2,
      reflectivity: 1,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.012,
    transmission: 1,
    opacity: 1,
    transparent: false,
    thickness: 1.05,
    ior: 1.5,
    dispersion: 0.34,
    clearcoat: 1,
    clearcoatRoughness: 0.015,
    attenuationColor: new THREE.Color(0xc9d6e6),
    attenuationDistance: 0.7,
    envMapIntensity: 1.65,
    specularIntensity: 1,
  });
}

function frontElementGeometry() {
  const R = 1.08;
  const pts = [];
  for (let i = 0; i <= 14; i += 1) {
    const t = i / 14;
    const r = R * t;
    pts.push(new THREE.Vector2(r, -0.055 * (1 - t * t)));
  }
  for (let i = 14; i >= 0; i -= 1) {
    const t = i / 14;
    const r = Math.max(R * t, 0.0008);
    pts.push(new THREE.Vector2(r, 0.24 * (1 - t * t)));
  }
  return new THREE.LatheGeometry(pts, 48);
}

export function createLens(cheapGlass) {
  const root = new THREE.Group();
  const yaw = new THREE.Group();
  const optic = new THREE.Group();

  const black = machinedBlack();
  const steel = chrome();
  const well = baffleBlack();
  const glass = makeElement(cheapGlass);

  const element = new THREE.Mesh(frontElementGeometry(), glass);
  element.name = "lens";
  element.position.y = 0.92;
  optic.add(element);

  const retain = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.045, 8, 48), steel);
  retain.rotation.x = Math.PI / 2;
  retain.position.y = 0.9;
  optic.add(retain);

  const thread = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 0.08, 48), black);
  thread.position.y = 0.84;
  optic.add(thread);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.165, 0.018, 6, 40), steel);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.8;
  optic.add(lip);

  const nameRing = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.07, 40), steel);
  nameRing.position.y = 0.72;
  optic.add(nameRing);

  const hood = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.18, 0.22, 40), black);
  hood.position.y = 0.58;
  optic.add(hood);

  const focus = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 0.28, 40), black);
  focus.position.y = 0.32;
  optic.add(focus);

  for (let i = 0; i < 28; i += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.24, 0.05), black);
    const a = (i / 28) * Math.PI * 2;
    rib.position.set(Math.cos(a) * 1.25, 0.32, Math.sin(a) * 1.25);
    rib.rotation.y = -a;
    optic.add(rib);
  }

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.08, 0.55, 32), black);
  barrel.position.y = -0.1;
  optic.add(barrel);

  const step = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.92, 0.28, 32), black);
  step.position.y = -0.5;
  optic.add(step);

  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.16, 32), steel);
  mount.position.y = -0.7;
  optic.add(mount);

  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.62, 0.7, 24, 1, true), well);
  throat.position.y = 0.35;
  optic.add(throat);

  const baffleA = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.02, 6, 24), well);
  baffleA.rotation.x = Math.PI / 2;
  baffleA.position.y = 0.48;
  optic.add(baffleA);

  const baffleB = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.018, 6, 24), well);
  baffleB.rotation.x = Math.PI / 2;
  baffleB.position.y = 0.22;
  optic.add(baffleB);

  const iris = new THREE.Mesh(new THREE.CircleGeometry(0.22, 8), well);
  iris.rotation.x = -Math.PI / 2;
  iris.position.y = -0.05;
  optic.add(iris);

  optic.rotation.x = -Math.PI / 2;
  yaw.add(optic);
  root.add(yaw);

  return { root, yaw, optic, element };
}

export function createEnvironment(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#050508";
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = "#f4f6ff";
  ctx.fillRect(70, 18, 372, 14);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(110, 38, 290, 7);

  ctx.fillStyle = "#d7def0";
  ctx.fillRect(22, 70, 16, 110);
  ctx.fillRect(474, 62, 12, 96);

  ctx.fillStyle = "#8fa3c2";
  ctx.fillRect(160, 210, 200, 8);
  ctx.fillStyle = "#e8edf8";
  ctx.fillRect(300, 96, 70, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}
