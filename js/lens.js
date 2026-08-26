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

function beadMat() {
  return new THREE.MeshStandardMaterial({
    color: 0xdde4ee,
    metalness: 0.95,
    roughness: 0.08,
    envMapIntensity: 1.1,
  });
}

function makeElement(cheap) {
  if (cheap) {
    return new THREE.MeshPhysicalMaterial({
      color: 0xcfd8e4,
      metalness: 0,
      roughness: 0.05,
      ior: 1.5,
      thickness: 1.15,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      opacity: 1,
      transparent: false,
      envMapIntensity: 1.05,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.018,
    transmission: 1,
    opacity: 1,
    transparent: false,
    thickness: 1.45,
    ior: 1.52,
    dispersion: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    attenuationColor: new THREE.Color(0x9aadc2),
    attenuationDistance: 0.42,
    envMapIntensity: 0.95,
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
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.8);
        float lobe = 0.4 + 0.8 * pow(abs(sin(vA)), 1.15);
        float a = clamp(f * lobe, 0.0, 1.0);
        vec3 c = hue(fract(0.02 + vA * 0.18));
        gl_FragColor = vec4(c * a, a);
      }
    `,
  });
}

function frontElementGeometry() {
  const R = 1.05;
  const pts = [];
  for (let i = 0; i <= 18; i += 1) {
    const t = i / 18;
    pts.push(new THREE.Vector2(R * t, -0.2 * (1 - t * t)));
  }
  for (let i = 18; i >= 0; i -= 1) {
    const t = i / 18;
    const r = Math.max(R * t, 0.0008);
    pts.push(new THREE.Vector2(r, 0.3 * (1 - t * t)));
  }
  return new THREE.LatheGeometry(pts, 64);
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
    blade.position.y = 0.28;
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

  const retain = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.055, 10, 64), lip);
  retain.rotation.x = Math.PI / 2;
  retain.position.y = 1.0;
  optic.add(retain);

  const recessWall = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.08, 0.22, 64, 1, true),
    well
  );
  recessWall.position.y = 0.88;
  optic.add(recessWall);

  const element = new THREE.Mesh(frontElementGeometry(), glass);
  element.name = "lens";
  element.position.y = 0.82;
  optic.add(element);

  const ca = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.016, 8, 64), spectralRim());
  ca.rotation.x = Math.PI / 2;
  ca.position.y = 0.84;
  optic.add(ca);

  const rings = [
    [1.2, 0.032, 0.92, lip],
    [1.28, 0.028, 0.82, black],
    [1.36, 0.03, 0.72, lip],
    [1.44, 0.026, 0.62, black],
    [1.52, 0.03, 0.52, black],
  ];
  for (const [r, tube, y, mat] of rings) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 48), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    optic.add(ring);
  }

  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(1.54, 1.48, 0.7, 48), black);
  sleeve.position.y = 0.22;
  optic.add(sleeve);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.46, 1.3, 0.65, 40), black);
  barrel.position.y = -0.42;
  optic.add(barrel);

  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.36, 0.7, 32, 1, true), well);
  throat.position.y = 0.42;
  optic.add(throat);

  const baffle = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.018, 6, 28), well);
  baffle.rotation.x = Math.PI / 2;
  baffle.position.y = 0.48;
  optic.add(baffle);

  addIris(optic, bladeMat());

  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), beadMat());
  bead.position.y = 0.22;
  optic.add(bead);

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
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#7d8ea4";
  ctx.fillRect(0, 0, 512, 88);
  ctx.fillStyle = "#66758c";
  ctx.fillRect(0, 88, 512, 36);
  ctx.fillStyle = "#b67a3c";
  ctx.fillRect(0, 124, 512, 18);
  ctx.fillStyle = "#d89a46";
  ctx.fillRect(0, 138, 512, 12);
  ctx.fillStyle = "#6a3818";
  ctx.fillRect(0, 150, 512, 16);
  ctx.fillStyle = "#08090c";
  ctx.fillRect(0, 166, 512, 90);

  ctx.fillStyle = "rgba(230, 236, 244, 0.4)";
  ctx.beginPath();
  ctx.ellipse(96, 36, 58, 5, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(210, 22, 40, 4, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(340, 40, 72, 5, 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(455, 18, 36, 3, -0.06, 0, Math.PI * 2);
  ctx.fill();

  pine(ctx, 40, 168, 86, 44);
  pine(ctx, 72, 168, 62, 30);
  pine(ctx, 14, 168, 52, 26);
  pine(ctx, 474, 168, 88, 46);
  pine(ctx, 440, 168, 64, 32);
  pine(ctx, 500, 168, 50, 24);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}
