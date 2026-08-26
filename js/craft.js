import * as THREE from "three";

function graphite() {
  return new THREE.MeshStandardMaterial({
    color: 0x2a2c32,
    metalness: 0.86,
    roughness: 0.32,
  });
}

function carbon() {
  return new THREE.MeshStandardMaterial({
    color: 0x14161a,
    metalness: 0.48,
    roughness: 0.58,
  });
}

function alloy() {
  return new THREE.MeshStandardMaterial({
    color: 0x2e2e36,
    metalness: 0.94,
    roughness: 0.2,
  });
}

function makeGlass(cheap) {
  if (cheap) {
    return new THREE.MeshPhysicalMaterial({
      color: 0xdde6f0,
      metalness: 0.06,
      roughness: 0.05,
      ior: 1.5,
      thickness: 0.8,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      opacity: 1,
      transparent: false,
      envMapIntensity: 1.8,
      reflectivity: 1,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    opacity: 1,
    transparent: false,
    thickness: 1.1,
    ior: 1.5,
    dispersion: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    attenuationColor: new THREE.Color(0xc5d4e6),
    attenuationDistance: 0.9,
    envMapIntensity: 1.2,
    specularIntensity: 1,
  });
}

function placeBetween(mesh, from, to) {
  const a = new THREE.Vector3().fromArray(from);
  const b = new THREE.Vector3().fromArray(to);
  const dir = b.clone().sub(a);
  const len = dir.length();
  mesh.scale.set(1, len, 1);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
}

function makeProp(mat) {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 8), mat);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.0035, 0.028), mat);
  const blade2 = blade.clone();
  blade2.rotation.y = Math.PI / 2;
  g.add(hub, blade, blade2);
  return g;
}

function countTris(root) {
  let n = 0;
  root.traverse((obj) => {
    const geo = obj.geometry;
    if (!geo) return;
    if (geo.index) n += geo.index.count / 3;
    else if (geo.attributes.position) n += geo.attributes.position.count / 3;
  });
  return n;
}

export function createCraft(cheapGlass) {
  const root = new THREE.Group();
  const airframe = new THREE.Group();
  const gimbal = new THREE.Group();
  const props = [];

  const bodyMat = graphite();
  const carbonMat = carbon();
  const alloyMat = alloy();
  const glassMat = makeGlass(cheapGlass);

  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.36, 4, 12), bodyMat);
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(1, 0.52, 0.82);
  airframe.add(hull);

  const top = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.2), carbonMat);
  top.position.y = 0.072;
  airframe.add(top);

  const battery = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.048, 0.15), carbonMat);
  battery.position.y = -0.058;
  airframe.add(battery);

  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.085, 0.15, 8), bodyMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.008, 0.27);
  airframe.add(nose);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6), alloyMat);
  antenna.position.set(0.04, 0.14, -0.12);
  antenna.rotation.z = -0.18;
  airframe.add(antenna);

  const armEnds = [
    [0.5, 0.045, 0.5],
    [-0.5, 0.045, 0.5],
    [0.5, 0.045, -0.5],
    [-0.5, 0.045, -0.5],
  ];

  for (const end of armEnds) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.014, 1, 6), carbonMat);
    placeBetween(arm, [0, 0.02, 0], end);
    airframe.add(arm);

    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.038, 8), alloyMat);
    motor.position.set(end[0], end[1] + 0.02, end[2]);
    airframe.add(motor);

    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.02, 8), carbonMat);
    bell.position.set(end[0], end[1] + 0.042, end[2]);
    airframe.add(bell);

    const prop = makeProp(carbonMat);
    prop.position.set(end[0], end[1] + 0.055, end[2]);
    airframe.add(prop);
    props.push(prop);
  }

  const skidGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.52, 6);
  const skidL = new THREE.Mesh(skidGeo, carbonMat);
  const skidR = new THREE.Mesh(skidGeo, carbonMat);
  skidL.rotation.x = Math.PI / 2;
  skidR.rotation.x = Math.PI / 2;
  skidL.position.set(-0.12, -0.145, 0.02);
  skidR.position.set(0.12, -0.145, 0.02);
  airframe.add(skidL, skidR);

  const leg = new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6);
  for (const p of [
    [-0.12, -0.1, 0.18],
    [-0.12, -0.1, -0.14],
    [0.12, -0.1, 0.18],
    [0.12, -0.1, -0.14],
  ]) {
    const m = new THREE.Mesh(leg, carbonMat);
    m.position.set(...p);
    airframe.add(m);
  }

  gimbal.position.set(0, -0.205, 0.205);

  const outer = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.011, 6, 16), alloyMat);
  outer.rotation.y = Math.PI / 2;
  gimbal.add(outer);

  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.096, 0.008, 6, 16), alloyMat);
  gimbal.add(inner);

  const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.012), alloyMat);
  const forkR = forkL.clone();
  forkL.position.set(-0.11, 0.03, 0);
  forkR.position.set(0.11, 0.03, 0);
  gimbal.add(forkL, forkR);

  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.05, 8), alloyMat);
  housing.rotation.x = Math.PI / 2;
  housing.position.z = -0.055;
  gimbal.add(housing);

  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.086, 20, 16), glassMat);
  lens.name = "lens";
  gimbal.add(lens);

  airframe.add(gimbal);
  root.add(airframe);

  return {
    root,
    airframe,
    gimbal,
    props,
    lens,
    tris: {
      lens: countTris(lens),
      airframe: countTris(airframe) - countTris(lens),
    },
  };
}

export function createFlorida() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#010204";
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#071310";
  ctx.fillRect(0, 90, 256, 80);
  ctx.fillStyle = "#0b1410";
  ctx.beginPath();
  ctx.moveTo(135, 18);
  ctx.bezierCurveTo(208, 28, 225, 98, 215, 172);
  ctx.bezierCurveTo(205, 232, 160, 248, 138, 225);
  ctx.bezierCurveTo(102, 192, 118, 95, 135, 18);
  ctx.fill();
  ctx.fillStyle = "#102018";
  ctx.fillRect(140, 92, 36, 28);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 1;

  const land = new THREE.Mesh(
    new THREE.CircleGeometry(28, 24),
    new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0.02,
    })
  );
  land.rotation.x = -Math.PI / 2;
  land.position.y = -7.4;
  return land;
}

export function createEnvironment(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#f0f2ff";
  ctx.fillRect(24, 8, 208, 5);
  ctx.fillStyle = "#d4dcff";
  ctx.fillRect(10, 36, 8, 48);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(238, 28, 6, 40);
  ctx.fillStyle = "#7f96b4";
  ctx.fillRect(40, 110, 176, 4);
  ctx.fillStyle = "#c8d0e4";
  ctx.fillRect(180, 50, 28, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}
