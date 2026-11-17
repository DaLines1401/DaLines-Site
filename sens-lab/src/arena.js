import * as THREE from 'three';
import { GAMES, clamp, seededRandom, verticalFov } from './core.mjs';
import { Viewmodel } from './viewmodel.js';

const DEG = Math.PI / 180;
export class Arena {
  constructor(canvas, hooks) {
    this.canvas = canvas;
    this.hooks = hooks;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#273733');
    this.scene.fog = new THREE.Fog('#273733', 24, 65);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    this.camera.position.set(0, 2, 0);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.viewmodel = new Viewmodel(this.camera);
    this.scene.add(new THREE.HemisphereLight('#e1f4df', '#344038', 2.8));
    const light = new THREE.DirectionalLight('#f0fce7', 2.2);
    light.position.set(-6, 12, 3);
    this.scene.add(light);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: '#35453e', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    const grid = new THREE.GridHelper(80, 40, '#607467', '#43584b');
    grid.position.y = 0.01;
    this.scene.add(grid);
    const wallMat = new THREE.MeshStandardMaterial({ color: '#45574e', roughness: 1 });
    this.box(40, 14, 0.4, 0, 7, -29, wallMat);
    this.box(0.4, 14, 52, -20, 7, -6, wallMat);
    this.box(0.4, 14, 52, 20, 7, -6, wallMat);
    const dark = new THREE.MeshStandardMaterial({ color: '#283a31' });
    const stripe = new THREE.MeshStandardMaterial({ color: '#8aa08c', emissive: '#2a3927', emissiveIntensity: 0.25 });
    for (const x of [-16, -8, 0, 8, 16]) {
      this.box(0.08, 12, 0.1, x, 6, -28.7, stripe);
      this.box(3.8, 0.2, 0.8, x, 0.11, -27.8, dark);
    }
    for (const y of [2, 6, 10]) this.box(40, 0.06, 0.1, 0, y, -28.7, stripe);
    this.box(4.5, 2.7, 4, -13, 1.35, -20, dark);
    this.box(3, 4.2, 3, 14.5, 2.1, -24, dark);
    this.targetMaterial = new THREE.MeshStandardMaterial({ color: '#c4f16a', roughness: 0.35, emissive: '#83b83b', emissiveIntensity: 0.3 });
    this.target = new THREE.Mesh(new THREE.SphereGeometry(0.44, 28, 18), this.targetMaterial);
    this.target.position.set(0, 2, -17);
    this.scene.add(this.target);
    this.ray = new THREE.Raycaster();
    this.center = new THREE.Vector2();
    this.dir = new THREE.Vector3();
    this.toTarget = new THREE.Vector3();
    this.phase = 'idle';
    this.raw = false;
    this.yaw = 0;
    this.pitch = 0;
    this.lastFrame = performance.now();
    this.lastIdle = 0;
    this.fpsFrames = 0;
    this.fpsTime = 0;
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    document.addEventListener('mousemove', e => this.mouse(e));
    document.addEventListener('mousedown', e => { if (e.button === 0) this.shoot(); });
    document.addEventListener('keydown', e => {
      if ((e.key === 'y' || e.key === 'Y') && document.pointerLockElement === this.canvas) this.viewmodel.triggerInspect();
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== canvas && ['countdown', 'running'].includes(this.phase)) this.pause('หยุดพักแล้ว รอบนี้จะเริ่มใหม่');
    });
    window.addEventListener('blur', () => this.pause('หน้าต่างไม่ได้ใช้งาน รอบนี้จะเริ่มใหม่'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause('พักเมื่อซ่อนหน้าต่าง'); });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.pause('สนาม 3D หยุดทำงาน กรุณาเปิดโปรแกรมใหม่'); this.hooks.error('การเชื่อมต่อการ์ดจอหยุดทำงาน กรุณาเปิดโปรแกรมใหม่'); });
    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  box(w, h, d, x, y, z, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    return mesh;
  }
  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }
  configure(config) {
    this.config = { ...config };
    this.camera.fov = verticalFov(config.fov, GAMES[config.game].aspect);
    this.camera.updateProjectionMatrix();
    this.targetMaterial.color.set(config.color);
    this.targetMaterial.emissive.set(config.color);
    this.targetMaterial.emissiveIntensity = 0.18;
    this.viewmodel.applyConfig(config);
    this.render();
  }
  inspectWeapon() {
    this.viewmodel.triggerInspect();
  }
  async start(round, config) {
    if (this.phase !== 'idle') return false;
    this.configure(config);
    this.round = round;
    this.random = seededRandom(round.seed);
    this.trackPhase = this.random() * Math.PI * 2;
    this.yaw = this.pitch = 0;
    this.camera.rotation.set(0, 0, 0, 'YXZ');
    this.stats = { duration: 0, hits: 0, shots: 0, onTarget: 0, angularError: 0, pathDegrees: 0, hitTimes: [], samples: [], totalFrames: 0 };
    this.lastSample = -1;
    this.sinceHit = 0;
    this.raw = false;
    try {
      await this.canvas.requestPointerLock({ unadjustedMovement: true });
      this.raw = true;
    } catch (error) {
      if (!round.practice) throw new Error('ระบบไม่รองรับ Raw input หรือไม่ได้อนุญาตให้จับเมาส์ ลองกดเริ่มอีกครั้ง หรือใช้โหมดฝึกอิสระ');
      await this.canvas.requestPointerLock();
    }
    if (document.pointerLockElement !== this.canvas) throw new Error('จับเมาส์ไม่สำเร็จ กดเริ่มอีกครั้ง');
    this.phase = 'countdown';
    this.countdown = 3;
    this.lastFrame = performance.now();
    this.viewmodel.resetMotion();
    this.resetTarget();
    this.hooks.locked(this.raw);
    return true;
  }
  resetTarget() {
    if (this.round.mode === 'tracking') { this.moveTarget(0); return; }
    const old = this.target.position.clone();
    for (let i = 0; i < 20; i++) {
      const yaw = (this.random() * 58 - 29) * DEG;
      const pitch = (this.random() * 20 - 4) * DEG;
      const distance = 17;
      this.target.position.set(-Math.sin(yaw) * Math.cos(pitch) * distance, 2 + Math.sin(pitch) * distance, -Math.cos(yaw) * Math.cos(pitch) * distance);
      if (this.target.position.distanceTo(old) > 3.4) break;
    }
    this.target.updateMatrixWorld(true);
  }
  moveTarget(t) {
    const phase = this.trackPhase;
    this.target.position.set(6.5 * Math.sin(t * 0.83 + phase) + 1.6 * Math.sin(t * 1.97 + phase * 0.5), 2.6 + 1.4 * Math.sin(t * 1.25 + phase), -17 + 1.2 * Math.sin(t * 0.49));
    this.target.updateMatrixWorld(true);
  }
  mouse(event) {
    if (document.pointerLockElement !== this.canvas || !['running', 'countdown'].includes(this.phase)) return;
    const multiplier = this.round.sens * GAMES[this.config.game].yaw * DEG;
    this.yaw -= event.movementX * multiplier;
    this.pitch = clamp(this.pitch - event.movementY * multiplier, -85 * DEG, 85 * DEG);
    this.yaw = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw));
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.updateMatrixWorld(true);
    this.viewmodel.onMouseDelta(event.movementX, event.movementY);
    if (this.phase === 'running') this.stats.pathDegrees += Math.hypot(event.movementX, event.movementY) * multiplier / DEG;
  }
  onTarget() {
    this.camera.updateMatrixWorld(true);
    this.target.updateMatrixWorld(true);
    this.ray.setFromCamera(this.center, this.camera);
    return this.ray.intersectObject(this.target, false).length > 0;
  }
  shoot() {
    if (document.pointerLockElement !== this.canvas || this.phase !== 'running' || this.round.mode !== 'flick') return;
    this.stats.shots++;
    this.viewmodel.triggerShot();
    if (this.onTarget()) {
      this.stats.hits++;
      this.stats.hitTimes.push(this.sinceHit);
      this.sinceHit = 0;
      this.hooks.hit();
      this.resetTarget();
    }
  }
  pause(message) {
    if (!['running', 'countdown'].includes(this.phase)) return;
    this.phase = 'idle';
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.hooks.paused(message);
  }
  stop() {
    this.phase = 'idle';
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }
  finish() {
    this.phase = 'idle';
    const result = { ...this.round, ...this.stats, raw: this.raw, complete: true };
    result.angularError /= Math.max(result.duration, 0.001);
    result.meanHitMs = result.hitTimes.length ? result.hitTimes.reduce((a, b) => a + b) / result.hitTimes.length * 1000 : null;
    result.fps = result.totalFrames / Math.max(result.duration, 0.001);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.hooks.finished(result);
  }
  render() { this.renderer.render(this.scene, this.camera); }
  loop(now) {
    requestAnimationFrame(this.loop);
    const elapsed = Math.max(0, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (this.phase === 'idle') {
      const inspecting = this.viewmodel.inspectTime > 0;
      if (inspecting) this.viewmodel.update(Math.min(elapsed, 0.05), now);
      if (!document.hidden && (inspecting || now - this.lastIdle > 100)) { this.viewmodel.update(Math.min(elapsed, 0.05), now); this.render(); this.lastIdle = now; }
      return;
    }
    if (elapsed > 0.3) { this.pause('เฟรมหยุดนานเกินไป รอบนี้จะเริ่มใหม่เพื่อให้คะแนนเทียบกันได้'); return; }
    this.viewmodel.update(Math.min(elapsed, 0.05), now);
    if (this.phase === 'countdown') {
      this.countdown -= elapsed;
      this.hooks.countdown(Math.ceil(this.countdown));
      if (this.countdown <= 0) { this.phase = 'running'; this.hooks.countdown(0); }
    } else {
      const dt = Math.min(elapsed, this.config.duration - this.stats.duration);
      this.stats.duration += dt;
      this.sinceHit += dt;
      this.stats.totalFrames++;
      if (this.round.mode === 'tracking') this.moveTarget(this.stats.duration);
      const hit = this.onTarget();
      if (hit) this.stats.onTarget += dt;
      this.camera.getWorldDirection(this.dir);
      this.toTarget.copy(this.target.position).sub(this.camera.position).normalize();
      const error = this.dir.angleTo(this.toTarget) / DEG;
      this.stats.angularError += error * dt;
      if (this.stats.duration - this.lastSample >= 0.1) {
        this.stats.samples.push({ t: +this.stats.duration.toFixed(3), yaw: +this.yaw.toFixed(4), pitch: +this.pitch.toFixed(4), target: this.target.position.toArray().map(n => +n.toFixed(3)), error: +error.toFixed(2) });
        this.lastSample = this.stats.duration;
      }
      this.hooks.tick(this.config.duration - this.stats.duration, this.stats, hit);
      if (this.stats.duration >= this.config.duration - 0.0001) { this.finish(); return; }
    }
    this.fpsFrames++;
    this.fpsTime += elapsed;
    if (this.fpsTime > 0.5) { this.hooks.fps(Math.round(this.fpsFrames / this.fpsTime)); this.fpsFrames = this.fpsTime = 0; }
    this.render();
  }
}
