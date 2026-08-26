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
      color: 0xd8e2ee,
      metalness: 0.08,
      roughness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.38,
      envMapIntensity: 1.6,
      reflectivity: 1,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.025,
    transmission: 1,
    thickness: 1.15,
    ior: 1.52,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    attenuationColor: new THREE.Color(0xc5d4e6),
    attenuationDistance: 0.85,
    envMapIntensity: 1.25,
    specularIntensity: 1,
  });
}

function makeRimMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 w = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-w.xyz);
        gl_Position = projectionMatrix * w;
      }
    `,
    fragmentShader: `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.55);
        vec3 c = vec3(0.42 * f, 0.7 * f, 1.0 * f);
        gl_FragColor = vec4(c, clamp(f, 0.0, 1.0));
      }
    `,
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
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 10), mat);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.0035, 0.028), mat);
  const blade2 = blade.clone();
  blade2.rotation.y = Math.PI / 2;
  g.add(hub, blade, blade2);
  return g;
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
  const rimMat = makeRimMaterial();
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x9aa6bc,
    emissive: 0x6b778c,
    emissiveIntensity: 0.35,
    metalness: 0.2,
    roughness: 0.3,
  });

  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.36, 6, 18), bodyMat);
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(1, 0.52, 0.82);
  airframe.add(hull);

  const top = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.2), carbonMat);
  top.position.y = 0.072;
  airframe.add(top);

  const battery = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.048, 0.15), carbonMat);
  battery.position.y = -0.058;
  airframe.add(battery);

  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.085, 0.15, 12), bodyMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.008, 0.27);
  airframe.add(nose);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6), alloyMat);
  antenna.position.set(0.04, 0.14, -0.12);
  antenna.rotation.z = -0.18;
  airframe.add(antenna);

  const ledL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.006), ledMat);
  const ledR = ledL.clone();
  ledL.position.set(-0.12, 0.078, 0.06);
  ledR.position.set(0.12, 0.078, 0.06);
  airframe.add(ledL, ledR);

  const armEnds = [
    [0.5, 0.045, 0.5],
    [-0.5, 0.045, 0.5],
    [0.5, 0.045, -0.5],
    [-0.5, 0.045, -0.5],
  ];

  for (const end of armEnds) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.014, 1, 8), carbonMat);
    placeBetween(arm, [0, 0.02, 0], end);
    airframe.add(arm);

    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.038, 12), alloyMat);
    motor.position.set(end[0], end[1] + 0.02, end[2]);
    airframe.add(motor);

    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.02, 12), carbonMat);
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
  const legs = [
    [-0.12, -0.1, 0.18],
    [-0.12, -0.1, -0.14],
    [0.12, -0.1, 0.18],
    [0.12, -0.1, -0.14],
  ];
  for (const p of legs) {
    const m = new THREE.Mesh(leg, carbonMat);
    m.position.set(...p);
    airframe.add(m);
  }

  gimbal.position.set(0, -0.205, 0.205);

  const outer = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.011, 8, 28), alloyMat);
  outer.rotation.y = Math.PI / 2;
  gimbal.add(outer);

  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.096, 0.008, 8, 24), alloyMat);
  gimbal.add(inner);

  const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.012), alloyMat);
  const forkR = forkL.clone();
  forkL.position.set(-0.11, 0.03, 0);
  forkR.position.set(0.11, 0.03, 0);
  gimbal.add(forkL, forkR);

  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.05, 16), alloyMat);
  housing.rotation.x = Math.PI / 2;
  housing.position.z = -0.055;
  gimbal.add(housing);

  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.086, 48, 32), glassMat);
  lens.name = "lens";
  gimbal.add(lens);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.087, 0.0036, 10, 48), rimMat);
  rim.rotation.x = Math.PI / 2;
  gimbal.add(rim);

  airframe.add(gimbal);
  root.add(airframe);

  return { root, airframe, gimbal, props, lens };
}

export function createFlorida() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#010204";
  ctx.fillRect(0, 0, 1024, 1024);

  const water = ctx.createRadialGradient(420, 540, 30, 500, 520, 720);
  water.addColorStop(0, "#07131c");
  water.addColorStop(0.4, "#081610");
  water.addColorStop(1, "#010203");
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, 1024, 1024);

  ctx.fillStyle = "#0b1410";
  ctx.beginPath();
  ctx.moveTo(540, 70);
  ctx.bezierCurveTo(830, 110, 900, 390, 860, 690);
  ctx.bezierCurveTo(820, 930, 640, 990, 550, 900);
  ctx.bezierCurveTo(410, 770, 470, 380, 540, 70);
  ctx.fill();

  ctx.fillStyle = "#102018";
  ctx.beginPath();
  ctx.ellipse(620, 430, 90, 70, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(210, 220, 230, 0.045)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 1024; i += 46) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const land = new THREE.Mesh(
    new THREE.CircleGeometry(28, 64),
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
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x000000);

  const bars = [
    { pos: [0, 5, 0], scale: [10, 0.12, 0.55], color: 0xf0f2ff },
    { pos: [-3.2, 1.6, 2.2], scale: [0.16, 4.2, 0.16], color: 0xd4dcff },
    { pos: [3.6, 2.1, -1.2], scale: [0.12, 3.2, 0.12], color: 0xffffff },
    { pos: [0, -1.8, 3.4], scale: [7, 0.08, 0.35], color: 0x7f96b4 },
    { pos: [1.5, 0.4, -3], scale: [0.2, 0.2, 3.5], color: 0xc8d0e4 },
  ];

  for (const bar of bars) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: bar.color })
    );
    mesh.position.set(...bar.pos);
    mesh.scale.set(...bar.scale);
    envScene.add(mesh);
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, 0.04, 0.1, 100).texture;
  pmrem.dispose();
  return env;
}
