import * as THREE from 'three';

export const WEAPON_SKINS = Object.freeze({
  emerald: {
    label: 'Toxic Emerald',
    body: '#18241d',
    metal: '#2c3c33',
    accent: '#c4f16a',
    emissive: '#87c934',
    glove: '#1d2922'
  },
  cyan: {
    label: 'Cyber Cyan',
    body: '#15202b',
    metal: '#293b4d',
    accent: '#56d9ed',
    emissive: '#22b8cf',
    glove: '#1b2633'
  },
  gold: {
    label: 'Championship Gold',
    body: '#1b1918',
    metal: '#3a342c',
    accent: '#facc15',
    emissive: '#ca8a04',
    glove: '#221f1c'
  },
  coral: {
    label: 'Neon Protocol',
    body: '#21181d',
    metal: '#3b2b34',
    accent: '#ff8b83',
    emissive: '#e05248',
    glove: '#281d22'
  },
  arctic: {
    label: 'Arctic Frost',
    body: '#dbe4df',
    metal: '#323f38',
    accent: '#67e8a9',
    emissive: '#26a96c',
    glove: '#222b26'
  }
});

function createPatternTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(0,0,0,0.09)';
  ctx.lineWidth = 2;
  for (let i = -128; i < 256; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Viewmodel {
  constructor(camera) {
    this.camera = camera;
    this.root = new THREE.Group();
    this.anchor = new THREE.Group();
    this.weaponGroup = new THREE.Group();
    this.root.add(this.anchor);
    this.anchor.add(this.weaponGroup);
    this.camera.add(this.root);

    const patternTex = createPatternTexture();
    this.materials = {
      body: new THREE.MeshStandardMaterial({ color: '#18241d', roughness: 0.48, metalness: 0.35, map: patternTex }),
      metal: new THREE.MeshStandardMaterial({ color: '#2c3c33', roughness: 0.35, metalness: 0.72 }),
      accent: new THREE.MeshStandardMaterial({ color: '#c4f16a', roughness: 0.25, metalness: 0.4, emissive: '#87c934', emissiveIntensity: 0.55 }),
      glove: new THREE.MeshStandardMaterial({ color: '#1d2922', roughness: 0.85, metalness: 0.1 }),
      glass: new THREE.MeshStandardMaterial({ color: '#8ef5c8', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.28, emissive: '#67e8a9', emissiveIntensity: 0.35 }),
      flash: new THREE.MeshBasicMaterial({ color: '#ffe89e', transparent: true, opacity: 0.9, depthWrite: false })
    };

    this.flashMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 1), this.materials.flash);
    this.flashMesh.visible = false;

    this.rifleModel = this.buildRifle();
    this.sidearmModel = this.buildSidearm();
    this.weaponGroup.add(this.rifleModel, this.sidearmModel, this.flashMesh);

    this.type = 'rifle';
    this.hand = 'right';
    this.skin = 'emerald';
    this.swayX = 0;
    this.swayY = 0;
    this.recoilZ = 0;
    this.recoilPitch = 0;
    this.flashTimer = 0;
    this.inspectTime = 0;
    this.inspectDuration = 2.0;

    this.applyConfig({ weaponType: 'rifle', weaponHand: 'right', weaponSkin: 'emerald' });
  }

  addBox(parent, w, h, d, x, y, z, mat, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    parent.add(mesh);
    return mesh;
  }

  addCyl(parent, rTop, rBot, len, x, y, z, mat, rx = Math.PI / 2) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 12), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    parent.add(mesh);
    return mesh;
  }

  buildRifle() {
    const g = new THREE.Group();
    const { body, metal, accent, glove, glass } = this.materials;
    // Upper + lower receiver
    this.addBox(g, 0.056, 0.068, 0.36, 0, 0, -0.02, body);
    // Accent side stripes & energy core
    this.addBox(g, 0.06, 0.012, 0.25, 0, 0.016, -0.04, accent);
    this.addBox(g, 0.06, 0.014, 0.09, 0, -0.008, -0.02, accent);
    // Top Picatinny rail + Holographic optic
    this.addBox(g, 0.028, 0.014, 0.30, 0, 0.04, -0.03, metal);
    this.addBox(g, 0.038, 0.032, 0.075, 0, 0.062, 0.02, metal);
    this.addBox(g, 0.032, 0.024, 0.006, 0, 0.064, 0.02, glass);
    this.addBox(g, 0.004, 0.004, 0.004, 0, 0.064, 0.022, accent);
    // Handguard + vented shroud + barrel + compensator
    this.addBox(g, 0.048, 0.052, 0.26, 0, 0.002, -0.32, metal);
    this.addBox(g, 0.052, 0.01, 0.18, 0, 0.018, -0.31, accent);
    this.addCyl(g, 0.014, 0.014, 0.24, 0, 0.006, -0.52, metal);
    this.addBox(g, 0.026, 0.03, 0.06, 0, 0.006, -0.64, accent);
    // Curved magazine + pistol grip + stock
    this.addBox(g, 0.032, 0.13, 0.054, 0, -0.09, -0.14, metal, 0.24);
    this.addBox(g, 0.032, 0.095, 0.042, 0, -0.072, 0.08, glove, -0.25);
    this.addBox(g, 0.044, 0.072, 0.18, 0, -0.012, 0.23, body);
    // Tactical forearm & hands holding rifle
    this.addBox(g, 0.065, 0.058, 0.16, 0.02, -0.08, 0.14, glove, 0.22, -0.18);
    this.addBox(g, 0.062, 0.054, 0.16, -0.085, -0.075, -0.22, glove, 0.15, 0.55);
    return g;
  }

  buildSidearm() {
    const g = new THREE.Group();
    const { body, metal, accent, glove, glass } = this.materials;
    // Slide + frame
    this.addBox(g, 0.038, 0.042, 0.23, 0, 0.016, -0.06, body);
    this.addBox(g, 0.041, 0.01, 0.18, 0, 0.02, -0.07, accent);
    this.addBox(g, 0.034, 0.024, 0.21, 0, -0.016, -0.05, metal);
    // Barrel tip + micro reflex sight
    this.addCyl(g, 0.011, 0.011, 0.06, 0, 0.016, -0.19, metal);
    this.addBox(g, 0.028, 0.02, 0.04, 0, 0.044, 0.01, metal);
    this.addBox(g, 0.022, 0.016, 0.004, 0, 0.046, 0.01, glass);
    // Grip + hands
    this.addBox(g, 0.032, 0.105, 0.046, 0, -0.065, 0.03, glove, -0.28);
    this.addBox(g, 0.062, 0.054, 0.16, 0.02, -0.095, 0.12, glove, 0.25, -0.15);
    this.addBox(g, 0.058, 0.05, 0.14, -0.055, -0.09, 0.08, glove, 0.2, 0.35);
    return g;
  }

  applyConfig(config = {}) {
    this.type = config.weaponType === 'sidearm' ? 'sidearm' : 'rifle';
    this.hand = ['right', 'left', 'hidden'].includes(config.weaponHand) ? config.weaponHand : 'right';
    this.skin = WEAPON_SKINS[config.weaponSkin] ? config.weaponSkin : 'emerald';

    const palette = WEAPON_SKINS[this.skin];
    this.materials.body.color.set(palette.body);
    this.materials.metal.color.set(palette.metal);
    this.materials.accent.color.set(palette.accent);
    this.materials.accent.emissive.set(palette.emissive);
    this.materials.glove.color.set(palette.glove);
    this.materials.glass.color.set(palette.accent);
    this.materials.glass.emissive.set(palette.emissive);

    this.root.visible = this.hand !== 'hidden';
    this.rifleModel.visible = this.type === 'rifle';
    this.sidearmModel.visible = this.type === 'sidearm';

    const side = this.hand === 'left' ? -1 : 1;
    if (this.type === 'rifle') {
      this.anchor.position.set(side * 0.24, -0.22, -0.44);
      this.flashMesh.position.set(0, 0.008, -0.68);
    } else {
      this.anchor.position.set(side * 0.22, -0.21, -0.42);
      this.flashMesh.position.set(0, 0.016, -0.23);
    }
    this.weaponGroup.scale.x = side;
  }

  onMouseDelta(dx, dy) {
    if (!this.root.visible) return;
    this.swayX = Math.max(-0.045, Math.min(0.045, this.swayX - dx * 0.00028));
    this.swayY = Math.max(-0.035, Math.min(0.035, this.swayY + dy * 0.00024));
  }

  triggerShot() {
    if (!this.root.visible) return;
    this.recoilZ = this.type === 'rifle' ? 0.052 : 0.042;
    this.recoilPitch = this.type === 'rifle' ? 0.075 : 0.11;
    this.flashTimer = 0.048;
    this.flashMesh.visible = true;
    this.flashMesh.rotation.z = Math.random() * Math.PI * 2;
    const s = 0.8 + Math.random() * 0.45;
    this.flashMesh.scale.set(s, s, s * 1.4);
  }

  triggerInspect() {
    if (!this.root.visible) return;
    this.inspectTime = this.inspectDuration;
  }

  resetMotion() {
    this.swayX = 0;
    this.swayY = 0;
    this.recoilZ = 0;
    this.recoilPitch = 0;
    this.flashTimer = 0;
    this.flashMesh.visible = false;
    this.inspectTime = 0;
  }

  update(dt, nowMs) {
    if (!this.root.visible) return;
    const t = nowMs * 0.001;
    const decay = Math.min(1, dt * 14);
    this.swayX *= 1 - decay;
    this.swayY *= 1 - decay;
    this.recoilZ *= 1 - Math.min(1, dt * 18);
    this.recoilPitch *= 1 - Math.min(1, dt * 16);

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flashMesh.visible = false;
    }

    let inspectPosX = 0, inspectPosY = 0, inspectPosZ = 0, inspectRotY = 0, inspectRotZ = 0;
    if (this.inspectTime > 0) {
      this.inspectTime = Math.max(0, this.inspectTime - dt);
      const progress = 1 - this.inspectTime / this.inspectDuration;
      const bell = Math.sin(progress * Math.PI);
      const side = this.hand === 'left' ? -1 : 1;
      inspectPosX = -side * 0.07 * bell;
      inspectPosY = 0.05 * bell;
      inspectPosZ = 0.07 * bell;
      inspectRotY = side * 0.65 * bell;
      inspectRotZ = -side * 0.28 * bell;
    }

    const bobX = Math.sin(t * 1.7) * 0.0025;
    const bobY = Math.cos(t * 3.4) * 0.002;
    const side = this.hand === 'left' ? -1 : 1;

    this.weaponGroup.position.set(
      this.swayX + bobX + inspectPosX,
      this.swayY + bobY + inspectPosY,
      this.recoilZ + inspectPosZ
    );
    this.weaponGroup.rotation.set(
      this.recoilPitch + this.swayY * 0.9,
      side * 0.05 - this.swayX * 1.4 + inspectRotY,
      -this.swayX * 1.8 + inspectRotZ
    );
  }
}
