import { Arena } from './arena.js';
import { GAMES, cm360, convert, createBlock, rankCandidates, recommendation, roundScore, sensFromCm, seededRandom, verticalFov } from './core.mjs';

const $ = id => document.getElementById(id);
const defaults = { game: 'valorant', dpi: 800, sens: 0.35, fov: 103, duration: 20, mode: 'flick', sound: true, color: '#c4f16a' };
let state = { version: 1, settings: { ...defaults }, draft: null, history: [] };
let arena, session = null, latest = null, starting = false, storageHealthy = true, pendingFinish = null, audio;
let saveChain = Promise.resolve();
let toastTimer;
const number = (n, digits = 3) => Number.isFinite(n) ? String(Number(n.toFixed(digits))) : '—';
const percent = n => `${number(n * 100, 1)}%`;
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = s => new Date(s).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
function toast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 6500);
}
function fail(message) { $('fatal-copy').textContent = message; $('fatal').hidden = false; }
function showView(name) {
  if (arena && arena.phase !== 'idle') return;
  for (const view of document.querySelectorAll('.view')) view.hidden = view.id !== `view-${name}`;
  for (const nav of document.querySelectorAll('.nav')) nav.classList.toggle('active', nav.dataset.view === name);
  $('breadcrumb').textContent = `Workspace / ${{ train: 'สนามฝึก', results: 'ผลวิเคราะห์', history: 'ประวัติการฝึก', guide: 'วิธีใช้งาน' }[name]}`;
  if (name === 'results') renderResults();
  if (name === 'history') renderHistory();
  if (name === 'train') arena?.resize();
}
function readConfig() {
  return { game: $('game').value, dpi: Number($('dpi').value), sens: Number($('sens').value), fov: Number($('fov').value), duration: Number($('duration').value), mode: $('practice-mode').value, sound: $('sound').checked, color: $('target-color').value };
}
function fillSettings(config) {
  for (const field of ['game', 'dpi', 'sens', 'fov', 'duration']) $(field).value = config[field];
  $('practice-mode').value = config.mode;
  $('sound').checked = config.sound;
  $('target-color').value = config.color;
}
function updateSettings() {
  const config = readConfig();
  $('fov-type').textContent = config.game === 'valorant' ? '16:9 H' : '4:3 H';
  if (config.dpi > 0 && config.sens > 0) {
    $('cm-value').textContent = number(cm360(config.dpi, config.sens, config.game), 2);
    $('edpi-value').textContent = `${number(config.dpi * config.sens, 1)} eDPI`;
  } else { $('cm-value').textContent = '—'; $('edpi-value').textContent = '— eDPI'; }
  $('session-note').textContent = `24 รอบ × ${config.duration} วินาที · สลับ Flick และ Tracking · พักระหว่างรอบได้`;
  if (!session) $('arena-caption').textContent = config.mode === 'flick' ? 'Flick · คลิกยิงเป้าที่ปรากฏ' : 'Tracking · เล็งตามเป้าโดยไม่ต้องคลิก';
  if (arena && arena.phase === 'idle') arena.configure(config);
}
function persist() {
  if (!storageHealthy) return Promise.reject(new Error('ยังไม่สามารถบันทึกข้อมูลได้'));
  state.settings = readConfig();
  state.draft = session?.kind === 'finder' ? session : null;
  const snapshot = structuredClone(state);
  const task = saveChain.catch(() => {}).then(() => window.desktop.save(snapshot));
  saveChain = task;
  task.catch(error => toast(`บันทึกไม่สำเร็จ: ${error.message} กรุณาตรวจสิทธิ์เขียนโฟลเดอร์`));
  return task;
}
function lockSettings(locked) {
  for (const input of $('setup').querySelectorAll('input,select')) input.disabled = locked;
  $('start-finder').disabled = locked;
  $('practice').disabled = locked;
  $('end-session').hidden = !locked;
}
function overlay(title, copy, button, hint = 'ขยับเมาส์เพื่อเล็ง · คลิกซ้ายเพื่อยิง · Esc เพื่อพัก') {
  $('overlay-title').textContent = title;
  $('overlay-copy').textContent = copy;
  $('arena-action').textContent = button;
  $('overlay-hint').textContent = hint;
  $('arena-overlay').hidden = false;
}
function updateProgress() {
  if (!session || session.kind !== 'finder') return;
  const i = session.index;
  const next = session.plan[i];
  $('progress-fill').style.width = `${Math.min(100, i / 24 * 100)}%`;
  $('session-title').textContent = next?.stage === 1 ? 'ปรับช่วงแคบ' : 'เปรียบเทียบช่วงกว้าง';
  $('session-label').textContent = `เสร็จแล้ว ${i} / 24 รอบ`;
  $('session-note').textContent = `${GAMES[session.config.game].label} · ${session.config.dpi} DPI · ${session.config.duration} วินาทีต่อรอบ`;
}
function nextOverlay(message = '') {
  const next = session?.plan[session.index];
  if (!next) return;
  updateProgress();
  const mode = next.mode === 'flick' ? 'Flick' : 'Tracking';
  $('arena-caption').textContent = `${mode} · รอบ ${session.index + 1} / 24`;
  overlay(message || `${mode} · รอบ ${session.index + 1}`, next.mode === 'flick' ? 'คลิกยิงเป้าที่ปรากฏให้เร็วและแม่น' : 'เล็งตามลูกบอลให้ต่อเนื่อง ไม่ต้องกดคลิก', 'เริ่มรอบนี้ →', 'พักได้ตามต้องการ · แต่ละรอบมีเวลาเตรียม 3 วินาที');
}
function restoreRange() {
  $('arena').classList.remove('playing');
  $('hud').hidden = true;
  $('countdown').hidden = true;
  $('crosshair').classList.remove('hit');
  $('arena-overlay').hidden = false;
  requestAnimationFrame(() => arena?.resize());
}
function beep() {
  if (!readConfig().sound) return;
  try {
    audio ||= new AudioContext();
    void audio.resume();
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(420, audio.currentTime + 0.06);
    gain.gain.setValueAtTime(0.045, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.07);
    osc.connect(gain); gain.connect(audio.destination);
    osc.start(); osc.stop(audio.currentTime + 0.08);
  } catch { /* Sound is optional; scoring is independent of audio. */ }
}
async function startRound() {
  if (!arena || starting || arena.phase !== 'idle') return;
  if (pendingFinish) {
    starting = true;
    try { if (session) await finishSession(pendingFinish); else { await persist(); pendingFinish = null; showView('results'); } }
    catch (error) { toast(`บันทึกไม่สำเร็จ: ${error.message}`); }
    finally { starting = false; }
    return;
  }
  if (!$('setup').reportValidity()) return;
  starting = true;
  try {
    if (!session) {
      const config = readConfig();
      session = { kind: 'practice', id: crypto.randomUUID(), config, index: 0, plan: [{ id: 'practice', sens: config.sens, mode: config.mode, practice: true, seed: crypto.getRandomValues(new Uint32Array(1))[0], stage: 0 }], runs: [], startedAt: new Date().toISOString() };
      lockSettings(true);
    }
    const round = session.plan[session.index];
    // Pointer lock must originate directly from the user's click.
    await arena.start(round, session.config);
  } catch (error) {
    restoreRange();
    toast(error.message);
    if (session?.kind === 'practice') { session = null; lockSettings(false); }
  } finally { starting = false; }
}
async function startFinder(event) {
  event.preventDefault();
  if (session || !$('setup').reportValidity()) return;
  const config = readConfig();
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  session = { id: crypto.randomUUID(), kind: 'finder', config, seed, plan: createBlock(config.sens, 0, seed), runs: [], index: 0, startedAt: new Date().toISOString(), status: 'active' };
  lockSettings(true);
  try { await persist(); nextOverlay('เริ่มค้นหา Sens'); }
  catch { session = null; lockSettings(false); }
}
function summary(record) {
  const stage = record.runs.some(r => r.stage === 1) ? 1 : 0;
  const rec = record.kind === 'finder' ? recommendation(record.runs, record.config.game, stage) : null;
  return { id: record.id, kind: record.kind, game: record.config.game, dpi: record.config.dpi, startedAt: record.startedAt, completedAt: record.completedAt, status: record.status, rounds: record.runs.length, bestSens: rec?.useful ? rec.best.sens : null };
}
async function saveRecord(record) {
  // Save full results first. Only then add the history entry and clear the draft.
  await window.desktop.saveSession(record);
  state.history = [summary(record), ...state.history.filter(row => row.id !== record.id)].slice(0, 300);
  latest = record;
}
async function finishSession(status) {
  pendingFinish = status;
  const finished = structuredClone(session);
  finished.status = status;
  finished.completedAt = new Date().toISOString();
  await saveRecord(finished);
  session = null;
  lockSettings(false);
  await persist();
  pendingFinish = null;
  $('progress-fill').style.width = status === 'complete' ? '100%' : '0%';
  $('session-title').textContent = status === 'complete' ? 'ทดสอบครบแล้ว' : 'บันทึกเซสชันแล้ว';
  $('session-label').textContent = `${finished.runs.length} รอบ`;
  overlay('บันทึกผลแล้ว', 'เปิดผลวิเคราะห์เพื่อดูคะแนนและค่าของแต่ละเกม', 'ฝึกอิสระอีกครั้ง →');
  showView('results');
}
async function finishedRound(run) {
  restoreRange();
  $('input-status').textContent = run.raw ? 'Raw mouse input · ไม่เร่งความเร็ว' : 'Standard input · ใช้สำหรับฝึกเท่านั้น';
  const detail = run.mode === 'flick' ? `${run.hits} hits / ${run.shots} shots · แม่นยำ ${percent(run.hits / Math.max(run.shots, 1))}` : `เวลาอยู่บนเป้า ${percent(run.onTarget / run.duration)} · คลาดเฉลี่ย ${number(run.angularError, 1)}°`;
  $('last-round').hidden = false;
  $('last-round').innerHTML = `<strong>ผลรอบล่าสุด</strong> &nbsp; ${detail}<br>คะแนน ${number(roundScore(run), 1)} / 100 · ${number(run.fps, 0)} FPS เฉลี่ย${run.raw ? '' : ' · ไม่รวมในการหา Sens'}`;
  session.runs.push(run);
  session.index++;
  try {
    if (session.kind === 'practice') { await finishSession('practice'); showView('train'); return; }
    if (session.index === 12 && session.plan.length === 12) {
      const coarse = recommendation(session.runs, session.config.game, 0);
      if (!coarse?.useful) { await finishSession('insufficient'); return; }
      session.plan.push(...createBlock(coarse.best.sens, 1, session.seed + 6007));
    }
    if (session.index >= session.plan.length) { await finishSession('complete'); return; }
    await persist();
    nextOverlay();
  } catch (error) { toast(`บันทึกไม่สำเร็จ: ${error.message}`); if (pendingFinish) overlay('บันทึกผลไม่สำเร็จ', 'ตรวจสิทธิ์เขียนไฟล์และพื้นที่ว่าง แล้วกดลองบันทึกอีกครั้ง', 'ลองบันทึกอีกครั้ง →'); else if (session) nextOverlay('กรุณาตรวจพื้นที่บันทึก แล้วเริ่มรอบถัดไป'); }
}
function drawChart(rows, config) {
  const sorted = [...rows].sort((a, b) => a.sens - b.sens);
  const w = 780, h = 200, left = 42, right = 35, top = 14, bottom = 40;
  const x = i => left + i * (w - left - right) / Math.max(sorted.length - 1, 1);
  const y = score => top + (100 - score) / 100 * (h - top - bottom);
  let svg = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="กราฟคะแนน Flick, Tracking และคะแนนรวมของแต่ละ Sens">`;
  for (const value of [0, 25, 50, 75, 100]) svg += `<line x1="${left}" y1="${y(value)}" x2="${w - right}" y2="${y(value)}" stroke="#303b32"/><text x="0" y="${y(value) + 4}">${value}</text>`;
  for (const [key, color] of [['score', '#c4f16a'], ['flickScore', '#61c3df'], ['trackingScore', '#c895e0']]) {
    svg += `<polyline points="${sorted.map((r, i) => `${x(i)},${y(r[key])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;
    sorted.forEach((r, i) => { svg += `<circle cx="${x(i)}" cy="${y(r[key])}" r="4" fill="${color}"><title>${number(r.sens)}: ${number(r[key], 1)}</title></circle>`; });
  }
  sorted.forEach((r, i) => { svg += `<text x="${x(i)}" y="${h - 15}" text-anchor="middle">${number(r.sens, 4)} · ${number(cm360(config.dpi, r.sens, config.game), 1)} cm</text>`; });
  return svg + '</svg>';
}
function renderResults() {
  $('export-results').disabled = !latest;
  const target = $('results-content');
  if (!latest) { target.innerHTML = '<div class="empty"><h2>ยังไม่มีผลการฝึก</h2><p>วอร์มมือหรือเริ่มค้นหา Sens เพื่อเก็บคะแนนของคุณ</p><button class="secondary" data-train>ไปสนามฝึก →</button></div>'; bindTrainLinks(); return; }
  const c = latest.config;
  const stage = latest.runs.some(r => r.stage === 1) ? 1 : 0;
  const rec = latest.kind === 'finder' ? recommendation(latest.runs, c.game, stage) : null;
  const final = latest.status === 'complete' && rec?.useful;
  const rows = rankCandidates(latest.runs.filter(r => r.stage === stage), c.game);
  const best = final ? rec.best.sens : c.sens;
  let status = latest.kind === 'practice' ? 'ผลจากโหมดฝึกอิสระ' : final ? rec.stable ? 'ผลแยกจากกันชัดในเซสชันนี้' : 'ผลยังใกล้กัน ควรทดสอบซ้ำ' : 'ข้อมูลยังไม่พอแนะนำ Sens';
  let advice = final ? rec.edge ? 'ค่าที่ชนะอยู่ขอบช่วงที่ทดสอบ ลองเริ่มค้นหาใหม่โดยใช้ค่านี้เป็นจุดเริ่ม แล้วเทียบผลอีกครั้ง' : rec.stable ? 'ลองค่านี้ในเกมจริงหลายวัน แล้วทดสอบซ้ำเพื่อดูความสม่ำเสมอ' : `ค่าช่วง ${number(rec.low, 4)}–${number(rec.high, 4)} ยังแยกกันไม่ชัด เลือกจากความสบายและทดสอบซ้ำเมื่อพร้อม` : 'ผลนี้ยังไม่ใช่ค่าแนะนำ เริ่มค้นหาและเล่นให้ครบทั้งสองโหมดเพื่อเปรียบเทียบได้';
  target.innerHTML = `<div class="result-lead"><div><h2>${final ? 'ค่าที่ทำคะแนนได้ดีที่สุดในรอบปรับช่วงแคบ' : 'Sens ที่ใช้เป็นจุดเริ่มต้น'}</h2><div class="result-number">${number(best, 4)}</div><p>${GAMES[c.game].label} · ${c.dpi} DPI · ${number(cm360(c.dpi, best, c.game), 2)} cm/360</p>${final ? '<button id="use-best" class="secondary">ใช้ค่านี้เพื่อทดสอบครั้งต่อไป →</button>' : ''}</div><div><div class="result-status">${status}</div><p>${advice}</p><p>${latest.runs.length} รอบ · ${escape(date(latest.startedAt))}</p><small>ผลจากสนามฝึกนี้ · Hipfire · ไม่รวม ADS / recoil</small></div></div>`;
  if (rows.length) {
    target.innerHTML += `<div class="chart-panel"><h2>${stage === 1 ? 'คะแนนในรอบปรับช่วงแคบ' : 'คะแนนในรอบช่วงกว้าง'}</h2>${drawChart(rows, c)}<div class="legend"><span>คะแนนรวม</span><span>Flick</span><span>Tracking</span></div><div class="table-wrap"><table><thead><tr><th>Sens</th><th>cm/360</th><th>Flick / 100</th><th>Tracking / 100</th><th>รวม / 100</th><th>รอบที่ใช้</th></tr></thead><tbody>${rows.map(r => `<tr><td>${number(r.sens, 4)}</td><td>${number(cm360(c.dpi, r.sens, c.game), 2)}</td><td>${number(r.flickScore, 1)}</td><td>${number(r.trackingScore, 1)}</td><td><strong>${number(r.score, 1)}</strong></td><td>${r.flick.length + r.tracking.length}${r.balanced ? '' : ' · ยังไม่ครบ'}</td></tr>`).join('')}</tbody></table></div><p>น้ำหนัก Flick ${GAMES[c.game].flickWeight * 100}% / Tracking ${Math.round((1 - GAMES[c.game].flickWeight) * 100)}% · คะแนน 0–100 เป็นเกณฑ์ของโปรแกรมนี้</p></div>`;
  }
  target.innerHTML += `<div class="conversions"><h2>${final ? 'นำค่าไปลองในเกม' : 'ค่าแปลงจาก Sens ตั้งต้น'}</h2><p>DPI ${c.dpi} เท่ากันทุกเกม · ระยะหมุนเท่ากัน · FOV และ ADS อาจให้ความรู้สึกต่างกัน</p><table><thead><tr><th>เกม</th><th>Hipfire Sens</th><th>cm/360</th><th></th></tr></thead><tbody>${Object.entries(GAMES).map(([key, game]) => { const s = convert(best, c.game, key); return `<tr><td>${game.label}</td><td><strong>${number(s, 4)}</strong></td><td>${number(cm360(c.dpi, s, key), 2)}</td><td><button class="copy" data-copy="${s.toFixed(6)}">คัดลอก</button></td></tr>`; }).join('')}</tbody></table></div>`;
  if (latest.runs.length) target.innerHTML += `<div class="conversions"><h2>รายละเอียดแต่ละรอบ</h2><div class="table-wrap"><table><thead><tr><th>รอบ</th><th>โหมด</th><th>Sens</th><th>ความแม่น / อยู่บนเป้า</th><th>เวลาเฉลี่ยต่อ hit</th><th>คลาดเฉลี่ย</th><th>FPS</th></tr></thead><tbody>${latest.runs.map((r, i) => `<tr><td>${i + 1}</td><td>${r.mode === 'flick' ? 'Flick' : 'Tracking'}${r.raw ? '' : ' (standard input)'}</td><td>${number(r.sens, 4)}</td><td>${percent(r.mode === 'flick' ? r.hits / Math.max(r.shots, 1) : r.onTarget / r.duration)}</td><td>${r.mode === 'flick' && r.meanHitMs ? number(r.meanHitMs, 0) + ' ms' : '—'}</td><td>${number(r.angularError, 1)}°</td><td>${number(r.fps, 0)}</td></tr>`).join('')}</tbody></table></div></div>`;
  for (const button of target.querySelectorAll('[data-copy]')) button.onclick = async () => { try { await window.desktop.copySens(button.dataset.copy); toast('คัดลอก Sens แล้ว'); } catch { toast(`Sens: ${button.dataset.copy}`); } };
  if ($('use-best')) $('use-best').onclick = async () => {
    if (session) { toast('ยุติเซสชันที่กำลังฝึกก่อนเปลี่ยนค่า'); return; }
    fillSettings({ ...c, sens: best }); updateSettings(); await persist(); showView('train'); toast('ตั้งค่าเริ่มต้นจากผลครั้งนี้แล้ว');
  };
}
function bindTrainLinks() { for (const button of document.querySelectorAll('[data-train]')) button.onclick = () => showView('train'); }
function renderHistory() {
  const target = $('history-content');
  if (!state.history.length) { target.innerHTML = '<div class="empty"><h2>ยังไม่มีประวัติการฝึก</h2><p>ผลที่เล่นจบจะบันทึกไว้ในเครื่องนี้อัตโนมัติ</p></div>'; return; }
  target.innerHTML = state.history.map(r => `<div class="history-entry"><div><h2>${GAMES[r.game]?.label || escape(r.game)} · ${r.kind === 'finder' ? 'Sensitivity finder' : 'Free practice'}</h2><p>${escape(date(r.startedAt))} · ${r.dpi} DPI · ${r.rounds} รอบ · ${r.status === 'complete' ? 'ครบเซสชัน' : r.status === 'practice' ? 'ฝึกอิสระ' : 'ข้อมูลบางส่วน'}${r.bestSens && r.status === 'complete' ? ` · Sens ${number(r.bestSens, 4)}` : ''}</p></div><button class="secondary" data-session="${escape(r.id)}">ดูผล →</button></div>`).join('');
  for (const button of target.querySelectorAll('[data-session]')) button.onclick = async () => { try { const loaded = await window.desktop.readSession(button.dataset.session); if (!loaded) { toast('ไม่พบไฟล์ผลการฝึกนี้'); return; } latest = loaded; showView('results'); } catch (error) { toast(error.message); } };
}
async function init() {
  if (!window.desktop) { fail('กรุณาเปิดผ่านโปรแกรม DaLines Sens Lab.exe'); return; }
  try {
    const saved = await window.desktop.load();
    if (saved) {
      if (saved.version !== 1 || !Array.isArray(saved.history) || !saved.settings || !GAMES[saved.settings.game]) throw new Error('รูปแบบไฟล์ข้อมูลไม่ถูกต้อง กรุณาสำรองโฟลเดอร์ data');
      state = saved;
      state.settings = { ...defaults, ...saved.settings };
      session = state.draft;
      if (session && (!session.plan || !Array.isArray(session.runs) || !Number.isInteger(session.index))) throw new Error('ข้อมูลเซสชันที่พักไว้ไม่ถูกต้อง');
    }
    fillSettings(session?.config || state.settings);
    if (state.history[0]) latest = await window.desktop.readSession(state.history[0].id);
    arena = new Arena($('scene'), {
      locked: raw => {
        $('arena').classList.add('playing'); $('arena-overlay').hidden = true; $('hud').hidden = false; $('countdown').hidden = false;
        $('hud-mode').textContent = `${session.plan[session.index].mode === 'flick' ? 'Flick' : 'Tracking'}${session.kind === 'finder' ? ` · รอบ ${session.index + 1}/24` : ' · ฝึกอิสระ'}`;
        $('hud-stat').textContent = 'เตรียมพร้อม'; $('hud-time').textContent = number(session.config.duration, 1);
        $('input-status').textContent = raw ? 'Raw mouse input' : 'Standard input · ฝึกอิสระ';
        arena.resize();
      },
      countdown: value => { $('countdown').hidden = value <= 0; $('countdown').textContent = value > 0 ? value : ''; },
      tick: (remaining, stats, hit) => {
        $('hud-time').textContent = remaining.toFixed(1);
        $('hud-stat').textContent = session.plan[session.index].mode === 'flick' ? `${stats.hits} hits · ${percent(stats.hits / Math.max(stats.shots, 1))}` : `${percent(stats.onTarget / Math.max(stats.duration, 0.001))} on target`;
        $('crosshair').classList.toggle('hit', hit);
      },
      hit: beep,
      fps: value => { $('fps').textContent = `${value} FPS`; },
      paused: message => { restoreRange(); if (session?.kind === 'finder') nextOverlay('พักรอบนี้'); else overlay('พักรอบนี้', 'รอบที่ยังไม่จบจะไม่นับคะแนน', 'เริ่มรอบใหม่ →'); toast(message); },
      finished: run => { void finishedRound(run); },
      error: fail
    });
    updateSettings();
    if (session) { lockSettings(true); nextOverlay('ฝึกต่อจากเซสชันที่บันทึกไว้'); }
    await persist();
  } catch (error) { storageHealthy = false; fail(error.message); }
  for (const nav of document.querySelectorAll('.nav')) nav.onclick = () => showView(nav.dataset.view);
  document.querySelector('.brand').onclick = e => { e.preventDefault(); showView('train'); };
  $('fullscreen').onclick = () => window.desktop.fullscreen();
  $('arena-action').onclick = startRound;
  $('practice').onclick = startRound;
  $('setup').onsubmit = startFinder;
  $('retry').onclick = () => location.reload();
  $('end-session').onclick = async () => {
    if (!session) return;
    arena.stop(); restoreRange();
    try { if (session.runs.length) await finishSession('stopped'); else { session = null; lockSettings(false); await persist(); overlay('พร้อมเริ่มใหม่', 'ตั้งค่าเมาส์ แล้วเลือกฝึกอิสระหรือเริ่มค้นหา Sens', 'เริ่มวอร์มมือ →'); } }
    catch (error) { toast(error.message); }
  };
  $('setup').addEventListener('change', async event => {
    if (session) return;
    if (event.target.id === 'game') {
      const old = state.settings.game, next = $('game').value;
      $('sens').value = number(convert(Number($('sens').value) || defaults.sens, old, next), 6);
      $('fov').value = GAMES[next].fov;
    }
    updateSettings();
    if ($('setup').checkValidity()) await persist().catch(() => {});
  });
  $('setup').addEventListener('input', () => { if (!session) updateSettings(); });
  $('export-results').onclick = async () => { if (!latest) return; try { const saved = await window.desktop.exportResults(JSON.stringify({ format: 'dalines-sens-lab', version: 1, exportedAt: new Date().toISOString(), session: latest }, null, 2)); if (saved) toast('ส่งออกไฟล์แล้ว'); } catch (error) { toast(error.message); } };
  if (window.desktop.qaMode) window.sensLabQA = { input: async () => {
    await startRound();
    if (arena.phase !== 'countdown' || !arena.raw) throw new Error('Raw mouse pointer lock did not activate');
    const before = arena.yaw;
    arena.mouse({ movementX: 100, movementY: 0 });
    const angle = (arena.yaw - before) * 180 / Math.PI;
    const expected = -100 * session.config.sens * GAMES[session.config.game].yaw;
    if (Math.abs(angle - expected) > 1e-7) throw new Error('Raw mouse camera scaling mismatch');
    arena.pause('ทดสอบการจับเมาส์เสร็จแล้ว'); session = null; lockSettings(false); arena.camera.rotation.set(0, 0, 0); arena.yaw = arena.pitch = 0;
    overlay('พร้อมเมื่อคุณพร้อม', 'ตั้งค่าเมาส์ แล้วเริ่มวอร์มมือก่อนหา Sens', 'เริ่มวอร์มมือ ↗');
    return { rawPointerLock: true, degreesFor100Counts: angle, expected };
  }, run: async () => {
    const checks = [];
    const originalState = structuredClone(state), originalLatest = latest;
    state = { version: 1, settings: { ...defaults }, draft: null, history: [] }; latest = null; session = null;
    fillSettings(defaults); updateSettings(); await persist();
    const check = (name, condition) => { checks.push({ name, ok: Boolean(condition) }); if (!condition) throw new Error(name); };
    check('3D renderer created', Boolean(arena?.renderer.getContext()));
    check('offline bridge present', Boolean(window.desktop.saveSession));
    check('profile persistence', (await window.desktop.load()).version === 1);
    check('cm/360 conversion', Math.abs(cm360(800, 0.35, 'valorant') - cm360(800, convert(0.35, 'valorant', 'cs2'), 'cs2')) < 1e-8);
    check('FOV conversion', Math.abs(verticalFov(90, 4 / 3) - 73.739795) < 1e-4);
    // Exercise actual raycasting and the scoring/scene path without moving a user's mouse.
    arena.round = { id: 'qa', mode: 'flick', sens: 0.35, seed: 71, practice: true };
    arena.random = seededRandom(71); arena.trackPhase = 0;
    arena.target.position.set(0, 2, -17); arena.camera.rotation.set(0, 0, 0);
    check('centered target raycast hits', arena.onTarget());
    arena.camera.rotation.y = 1;
    check('off-target raycast misses', !arena.onTarget());
    arena.camera.rotation.set(0, 0, 0);
    arena.resetTarget();
    check('flick target remains in arena', arena.target.position.z < -10);
    arena.round.mode = 'tracking'; arena.moveTarget(3);
    check('tracking path finite', arena.target.position.toArray().every(Number.isFinite));
    const fixture = { id: 'qa-persistence', kind: 'practice', config: defaults, runs: [], startedAt: new Date().toISOString(), status: 'practice' };
    await window.desktop.saveSession(fixture);
    check('separate JSON session roundtrip', (await window.desktop.readSession(fixture.id)).id === fixture.id);
    showView('results'); check('empty results UI', $('results-content').textContent.includes('ยังไม่มีผล'));
    showView('history'); check('empty history UI', $('history-content').textContent.includes('ยังไม่มีประวัติ'));
    showView('guide'); check('guide UI', !$('view-guide').hidden);
    await startFinder({ preventDefault() {} });
    check('finder draft saved before first round', (await window.desktop.load()).draft.plan.length === 12);
    for (let i = 0; i < 24; i++) {
      const r = session.plan[session.index];
      const center = r.id.endsWith('-1');
      await finishedRound({ ...r, complete: true, raw: true, duration: 20, hits: center ? 40 : 10, shots: center ? 42 : 30, onTarget: center ? 16 : 5, angularError: 2, pathDegrees: 10, meanHitMs: 500, fps: 120, totalFrames: 2400, hitTimes: [], samples: [] });
      if (i === 11) check('fine block adapts only after twelve balanced rounds', session.plan.length === 24 && session.plan[12].stage === 1);
    }
    check('finder completes all twenty-four rounds', latest.runs.length === 24 && latest.status === 'complete' && session === null);
    check('actual results page renders the best setting', $('results-content').textContent.includes('0.35') && $('results-content').querySelector('svg'));
    check('full session persisted separately', (await window.desktop.readSession(latest.id)).runs.length === 24);
    renderHistory(); check('completed history links to results', Boolean($('history-content').querySelector('[data-session]')));
    const files = await window.desktop.load();
    check('completed session clears resumable draft', files.draft === null && files.history.length === 1);
    state = originalState; latest = originalLatest; session = null; fillSettings(state.settings); lockSettings(false); updateSettings(); await persist();
    $('progress-fill').style.width = '0%'; $('session-title').textContent = 'เส้นทางหา Sens'; $('session-label').textContent = 'วอร์มมือ → เทียบช่วงกว้าง → ปรับช่วงแคบ'; $('last-round').hidden = true;
    overlay('พร้อมเมื่อคุณพร้อม', 'ตั้งค่าเมาส์ แล้วเริ่มวอร์มมือก่อนหา Sens', 'เริ่มวอร์มมือ ↗');
    showView('train');
    arena.round = null; arena.target.position.set(0, 2, -17); arena.render();
    check('no horizontal layout overflow', document.documentElement.scrollWidth <= innerWidth);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { ok: true, checks, renderer: arena.renderer.info.render, size: { width: innerWidth, height: innerHeight } };
  } };
}
window.sensLabReady = init();
