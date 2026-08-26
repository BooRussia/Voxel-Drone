import * as THREE from "three";

function satinBlack() {
  return new THREE.MeshStandardMaterial({
    color: 0x0a0a0c,
    metalness: 0.78,
    roughness: 0.42,
    envMapIntensity: 0.55,
  });
}

function ringEdge() {
  return new THREE.MeshStandardMaterial({
    color: 0x2a2c32,
    metalness: 0.92,
    roughness: 0.28,
    envMapIntensity: 0.9,
  });
}

function wellMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x08080a,
    metalness: 0.25,
    roughness: 0.7,
    envMapIntensity: 0.15,
  });
}

function bladeMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x2c2e32,
    metalness: 0.55,
    roughness: 0.45,
    envMapIntensity: 0.35,
  });
}

function beadMat() {
  return new THREE.MeshStandardMaterial({
    color: 0xe8eef6,
    metalness: 1,
    roughness: 0.06,
    envMapIntensity: 1.8,
  });
}

function makeElement(cheap) {
  if (cheap) {
    return new THREE.MeshPhysicalMaterial({
      color: 0xdfe8f2,
      metalness: 0.02,
      roughness: 0.03,
      ior: 1.5,
      thickness: 1.1,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      opacity: 1,
      transparent: false,
      envMapIntensity: 2.4,
      reflectivity: 1,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.01,
    transmission: 1,
    opacity: 1,
    transparent: false,
    thickness: 1.2,
    ior: 1.5,
    dispersion: 0.36,
    clearcoat: 1,
    clearcoatRoughness: 0.012,
    attenuationColor: new THREE.Color(0xc4d2e2),
    attenuationDistance: 0.55,
    envMapIntensity: 1.85,
    specularIntensity: 1,
  });
}

function spectralRim() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vN;
      varying vec3 vV;
      varying float vA;
      void main() {
        vec4 w = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-w.xyz);
        vA = atan(position.z, position.x);
        gl_Position = projectionMatrix * w;
      }
    `,
    fragmentShader: `
      varying vec3 vN;
      varying vec3 vV;
      varying float vA;
      vec3 hue(float h) {
        vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        return k * k * (3.0 - 2.0 * k);
      }
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        float lobe = pow(abs(sin(vA)), 1.35);
        float a = clamp(f * (0.35 + 0.9 * lobe), 0.0, 1.0);
        vec3 c = hue(fract(0.08 + vA * 0.16));
        gl_FragColor = vec4(c * a, a);
      }
    `,
  });
}

function frontElementGeometry() {
  const R = 1.22;
  const pts = [];
  for (let i = 0; i <= 16; i += 1) {
    const t = i / 16;
    pts.push(new THREE.Vector2(R * t, -0.07 * (1 - t * t)));
  }
  for (let i = 16; i >= 0; i -= 1) {
    const t = i / 16;
    pts.push(new THREE.Vector2(Math.max(R * t, 0.0008), 0.56 * (1 - t * t)));
  }
  return new THREE.LatheGeometry(pts, 64);
}

function addIris(optic, mat) {
  const count = 9;
  for (let i = 0; i < count; i += 1) {
    const blade = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.042, 5, 14, Math.PI * 0.62),
      mat
    );
    const a = (i / count) * Math.PI * 2;
    blade.rotation.x = Math.PI / 2;
    blade.rotation.z = a + 0.28;
    blade.position.y = 0.18;
    optic.add(blade);
  }
}

export function createLens(cheapGlass) {
  const root = new THREE.Group();
  const yaw = new THREE.Group();
  const optic = new THREE.Group();

  const black = satinBlack();
  const edge = ringEdge();
  const well = wellMat();
  const glass = makeElement(cheapGlass);

  const element = new THREE.Mesh(frontElementGeometry(), glass);
  element.name = "lens";
  element.position.y = 0.62;
  optic.add(element);

  const ca = new THREE.Mesh(new THREE.TorusGeometry(1.215, 0.014, 8, 64), spectralRim());
  ca.rotation.x = Math.PI / 2;
  ca.position.y = 0.66;
  optic.add(ca);

  const rings = [
    [1.24, 0.034, 0.64, edge],
    [1.3, 0.028, 0.58, black],
    [1.36, 0.03, 0.52, edge],
    [1.42, 0.026, 0.46, black],
    [1.48, 0.03, 0.4, black],
  ];
  for (const [r, tube, y, mat] of rings) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 48), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    optic.add(ring);
  }

  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.46, 0.55, 48), black);
  sleeve.position.y = 0.12;
  optic.add(sleeve);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.44, 1.28, 0.7, 40), black);
  barrel.position.y = -0.48;
  optic.add(barrel);

  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.42, 0.85, 32, 1, true), well);
  throat.position.y = 0.28;
  optic.add(throat);

  const baffle = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.016, 6, 24), well);
  baffle.rotation.x = Math.PI / 2;
  baffle.position.y = 0.32;
  optic.add(baffle);

  addIris(optic, bladeMat());

  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), beadMat());
  bead.position.y = 0.1;
  optic.add(bead);

  optic.rotation.x = -Math.PI / 2;
  yaw.add(optic);
  root.add(yaw);

  return { root, yaw, optic, element };
}

function pine(ctx, x, baseY, h, w) {
  ctx.fillStyle = "#050607";
  ctx.beginPath();
  ctx.moveTo(x, baseY - h);
  ctx.lineTo(x + w * 0.18, baseY - h * 0.62);
  ctx.lineTo(x + w * 0.08, baseY - h * 0.62);
  ctx.lineTo(x + w * 0.28, baseY - h * 0.34);
  ctx.lineTo(x + w * 0.1, baseY - h * 0.34);
  ctx.lineTo(x + w * 0.38, baseY);
  ctx.lineTo(x - w * 0.38, baseY);
  ctx.lineTo(x - w * 0.1, baseY - h * 0.34);
  ctx.lineTo(x - w * 0.28, baseY - h * 0.34);
  ctx.lineTo(x - w * 0.08, baseY - h * 0.62);
  ctx.lineTo(x - w * 0.18, baseY - h * 0.62);
  ctx.closePath();
  ctx.fill();
}

export function createEnvironment(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#8ea0b4";
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = "#6d7f96";
  ctx.fillRect(0, 70, 512, 50);
  ctx.fillStyle = "#c48a48";
  ctx.fillRect(0, 118, 512, 22);
  ctx.fillStyle = "#e0a14a";
  ctx.fillRect(0, 132, 512, 16);
  ctx.fillStyle = "#8a4a22";
  ctx.fillRect(0, 148, 512, 18);
  ctx.fillStyle = "#0a0c10";
  ctx.fillRect(0, 166, 512, 90);

  ctx.fillStyle = "rgba(236, 240, 246, 0.55)";
  ctx.beginPath();
  ctx.ellipse(120, 42, 70, 7, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(300, 28, 90, 6, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(410, 50, 54, 5, -0.04, 0, Math.PI * 2);
  ctx.fill();

  pine(ctx, 46, 168, 78, 42);
  pine(ctx, 78, 168, 58, 32);
  pine(ctx, 18, 168, 50, 28);
  pine(ctx, 470, 168, 82, 44);
  pine(ctx, 436, 168, 60, 34);
  pine(ctx, 498, 168, 48, 26);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}
