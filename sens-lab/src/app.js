import { Arena } from './arena.js';
import { GAMES, cm360, convert, createBlock, rankCandidates, recommendation, roundScore, repeatsFor, seededRandom, verticalFov } from './core.mjs';

const $ = id => document.getElementById(id);
const defaults = { game: 'valorant', dpi: 800, sens: 0.35, fov: 103, duration: 20, rounds: 24, mode: 'flick', sound: true, discord: true, color: '#c4f16a', crosshairColor: '#eef3ee', crosshairSize: 'medium', crosshairDot: true };
let state = { version: 1, settings: { ...defaults }, draft: null, history: [] };
let arena, session = null, latest = null, starting = false, storageHealthy = true, pendingFinish = null, audio, historyFilter = 'all';
let saveChain = Promise.resolve();
let toastTimer;
const number = (n, digits = 3) => Number.isFinite(n) ? String(Number(n.toFixed(digits))) : '—';
const percent = n => `${number(n * 100, 1)}%`;
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = s => new Date(s).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
// Older settings, saved sessions and resumable drafts use the original 24 rounds.
const totalRounds = config => config.rounds ?? defaults.rounds;
const sessionRepeats = config => repeatsFor(totalRounds(config));
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
  return {
    game: $('game').value, dpi: Number($('dpi').value), sens: Number($('sens').value), fov: Number($('fov').value),
    duration: Number($('duration').value), rounds: Number($('rounds').value), mode: $('practice-mode').value,
    sound: $('sound').checked, discord: $('discord').checked, color: $('target-color').value,
    crosshairColor: $('crosshair-color').value, crosshairSize: $('crosshair-size').value, crosshairDot: $('crosshair-dot').checked
  };
}
function fillSettings(config) {
  for (const field of ['game', 'dpi', 'sens', 'fov', 'duration']) $(field).value = config[field];
  $('rounds').value = totalRounds(config);
  $('practice-mode').value = config.mode;
  $('sound').checked = config.sound;
  $('discord').checked = config.discord ?? defaults.discord;
  $('target-color').value = config.color;
  $('crosshair-color').value = config.crosshairColor || defaults.crosshairColor;
  $('crosshair-size').value = config.crosshairSize || defaults.crosshairSize;
  $('crosshair-dot').checked = config.crosshairDot ?? defaults.crosshairDot;
}
function applyCrosshair(config) {
  const el = $('crosshair');
  const sizes = { small: ['4px', '3px'], medium: ['6px', '4px'], large: ['9px', '5px'] };
  const [len, gap] = sizes[config.crosshairSize] || sizes.medium;
  el.style.setProperty('--ch-color', config.crosshairColor || defaults.crosshairColor);
  el.style.setProperty('--ch-len', len);
  el.style.setProperty('--ch-gap', gap);
  el.style.setProperty('--ch-dot', config.crosshairDot ? 'block' : 'none');
}
function updateSettings() {
  const config = readConfig();
  applyCrosshair(config);
  $('fov-type').textContent = config.game === 'valorant' ? '16:9 H' : '4:3 H';
  if (config.dpi > 0 && config.sens > 0) {
    $('cm-value').textContent = number(cm360(config.dpi, config.sens, config.game), 2);
    $('edpi-value').textContent = `${number(config.dpi * config.sens, 1)} eDPI`;
  } else { $('cm-value').textContent = '—'; $('edpi-value').textContent = '— eDPI'; }
  const repeats = sessionRepeats(config);
  $('session-estimate').textContent = `เวลาเล่น ${number(config.rounds * config.duration / 60, 1)} นาที · ไม่รวมเวลาเตรียมและพัก`;
  $('rounds-help').textContent = repeats === 1 ? 'แบบสั้น: แต่ละโหมดเล่นครั้งเดียวต่อค่าในแต่ละช่วง ผลเป็นเพียงเบื้องต้น แนะนำทดสอบซ้ำแบบ 24 รอบขึ้นไป' : `แต่ละค่าเล่น Flick และ Tracking อย่างละ ${repeats} รอบต่อช่วง`;
  $('rounds-help').classList.toggle('quick-warning', repeats === 1);
  if (!session) $('session-note').textContent = `${config.rounds} รอบ × ${config.duration} วินาที · สลับ Flick และ Tracking · พักระหว่างรอบได้`;
  if (!session) $('arena-caption').textContent = config.mode === 'flick' ? 'Flick · คลิกยิงเป้าที่ปรากฏ' : 'Tracking · เล็งตามเป้าโดยไม่ต้องคลิก';
  if (arena && arena.phase === 'idle') arena.configure(config);
  void window.desktop.setDiscordPresence(config.discord).catch(() => {});
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
  const total = totalRounds(session.config);
  $('progress-fill').style.width = `${Math.min(100, i / total * 100)}%`;
  $('session-title').textContent = next?.stage === 1 ? 'ปรับช่วงแคบ' : 'เปรียบเทียบช่วงกว้าง';
  $('session-label').textContent = `เสร็จแล้ว ${i} / ${total} รอบ`;
  $('session-note').textContent = `${GAMES[session.config.game].label} · ${session.config.dpi} DPI · ${session.config.duration} วินาทีต่อรอบ`;
}
function nextOverlay(message = '') {
  const next = session?.plan[session.index];
  if (!next) return;
  updateProgress();
  const mode = next.mode === 'flick' ? 'Flick' : 'Tracking';
  $('arena-caption').textContent = `${mode} · รอบ ${session.index + 1} / ${totalRounds(session.config)}`;
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
  session = { id: crypto.randomUUID(), kind: 'finder', config, seed, plan: createBlock(config.sens, 0, seed, sessionRepeats(config)), runs: [], index: 0, startedAt: new Date().toISOString(), status: 'active' };
  lockSettings(true);
  try { await persist(); nextOverlay('เริ่มค้นหา Sens'); }
  catch { session = null; lockSettings(false); }
}
function summary(record) {
  const stage = record.runs.some(r => r.stage === 1) ? 1 : 0;
  const rec = record.kind === 'finder' ? recommendation(record.runs, record.config.game, stage, sessionRepeats(record.config)) : null;
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
    const half = totalRounds(session.config) / 2;
    const repeats = sessionRepeats(session.config);
    if (session.index === half && session.plan.length === half) {
      const coarse = recommendation(session.runs, session.config.game, 0, repeats);
      if (!coarse?.useful) { await finishSession('insufficient'); return; }
      session.plan.push(...createBlock(coarse.best.sens, 1, session.seed + 6007, repeats));
    }
    if (session.index >= session.plan.length) { await finishSession('complete'); return; }
    await persist();
    nextOverlay();
  } catch (error) { toast(`บันทึกไม่สำเร็จ: ${error.message}`); if (pendingFinish) overlay('บันทึกผลไม่สำเร็จ', 'ตรวจสิทธิ์เขียนไฟล์และพื้นที่ว่าง แล้วกดลองบันทึกอีกครั้ง', 'ลองบันทึกอีกครั้ง →'); else if (session) nextOverlay('กรุณาตรวจพื้นที่บันทึก แล้วเริ่มรอบถัดไป'); }
}
function scoreMetric(label, score, tone = '') {
  return `<div class="score-metric ${tone}"><div><span>${label}</span><strong>${number(score, 1)}<small> / 100</small></strong></div><div class="score-track"><span style="width:${Math.max(0, Math.min(100, score))}%"></span></div></div>`;
}
function renderResults() {
  $('export-results').disabled = !latest;
  const target = $('results-content');
  if (!latest) { target.innerHTML = '<div class="empty"><h2>ยังไม่มีผลการฝึก</h2><p>วอร์มมือหรือเริ่มค้นหา Sens เพื่อเก็บคะแนนของคุณ</p><button class="secondary" data-train>ไปสนามฝึก →</button></div>'; bindTrainLinks(); return; }
  const c = latest.config;
  const practice = latest.kind === 'practice';
  const stage = latest.runs.some(r => r.stage === 1) ? 1 : 0;
  const repeats = sessionRepeats(c);
  const rec = practice ? null : recommendation(latest.runs, c.game, stage, repeats);
  const final = latest.status === 'complete' && rec?.useful;
  const rows = rankCandidates(latest.runs.filter(r => r.stage === stage), c.game, practice ? 1 : repeats);
  const best = final ? rec.best.sens : c.sens;
  const change = (best / c.sens - 1) * 100;
  const changeText = Math.abs(change) < 0.05 ? 'เท่ากับค่าเริ่มต้น' : `${change > 0 ? 'เร็วขึ้น' : 'ช้าลง'} ${number(Math.abs(change), 1)}% จากค่าเริ่มต้น ${number(c.sens, 4)}`;
  const status = practice ? 'ฝึกอิสระ · ยังไม่ได้เทียบค่า Sens' : !final ? 'ยังสรุปค่า Sens ไม่ได้' : !rec.repeated ? 'ผลเบื้องต้น · ยังไม่มีรอบซ้ำ' : rec.gap <= 3 ? 'คะแนนยังแยกกันไม่ชัด · ควรทดสอบซ้ำ' : rec.edge ? 'ค่าที่ได้อยู่ขอบช่วง · ควรทดสอบต่อ' : rec.stable ? 'คะแนนแยกกันชัดในครั้งนี้' : 'คะแนนยังแยกกันไม่ชัด · ควรทดสอบซ้ำ';
  const advice = practice ? 'ผลนี้บอกผลงานการฝึกของคุณ หากต้องการเทียบค่า Sens ให้เลือกเริ่มค้นหา Sens ในสนามฝึก' : !final ? latest.status === 'insufficient' ? 'ข้อมูลการยิงหรือการตามเป้ายังไม่พอ ลองวอร์มมือให้คุ้น แล้วเริ่มค้นหาใหม่และเล่นให้ครบทั้งสองโหมด' : `เล่นจบแล้ว ${latest.runs.length} จาก ${totalRounds(c)} รอบ เริ่มค้นหาใหม่และเล่นให้ครบ เพื่อให้แต่ละค่าได้ทดสอบเท่ากัน` : !rec.repeated ? `ลอง Sens ${number(best, 4)} ได้ก่อน แล้วทดสอบแบบ 24 รอบขึ้นไปเพื่อดูว่าผลยังเหมือนเดิมหรือไม่${rec.edge ? ' ค่านี้ยังอยู่ขอบช่วงที่ทดสอบด้วย' : ''}` : rec.gap <= 3 ? `ช่วง Sens ${number(rec.low, 4)}–${number(rec.high, 4)} ยังได้คะแนนใกล้กัน เลือกค่าที่ถนัดแล้วทดสอบซ้ำ` : rec.edge ? 'ใช้ค่านี้เป็นค่าเริ่มต้นแล้วค้นหาอีกครั้ง เพราะอาจมีค่าที่เหมาะกว่านอกช่วงที่เพิ่งทดสอบ' : rec.stable ? 'คัดลอก Sens ไปลองในเกมจริง แล้วทดสอบซ้ำอีกวันเพื่อดูว่าคุณยังควบคุมได้ถนัด' : rec.noise * 0.5 >= Math.max(3, rec.gap) ? 'คะแนนแต่ละรอบยังแกว่ง ลองพักแล้วทดสอบซ้ำด้วยจำนวนรอบที่มากขึ้น ก่อนตัดสินใจเปลี่ยนค่า' : `ช่วง Sens ${number(rec.low, 4)}–${number(rec.high, 4)} ยังได้คะแนนใกล้กัน เลือกค่าที่ถนัดแล้วทดสอบซ้ำ`;
  target.innerHTML = `<p class="result-meta">${GAMES[c.game].label} · ${c.dpi} DPI · ${practice ? `${latest.runs.length} รอบฝึก` : `${latest.runs.length} / ${totalRounds(c)} รอบ`} · ${escape(date(latest.startedAt))}</p>
    <div class="result-lead ${final && rec.stable ? 'is-clear' : 'is-provisional'}">
      <div class="result-setting"><h2>${final ? 'Sens ที่ทำคะแนนได้ดีที่สุด' : practice ? 'Sens ที่ใช้ฝึก' : 'Sens ตั้งต้นของคุณ'}</h2><div class="result-number">${number(best, 4)}</div><p class="result-game">${GAMES[c.game].label} <span>ที่ ${c.dpi} DPI</span></p><p>${final ? changeText : 'ค่านี้ยังไม่ใช่ผลแนะนำจากการค้นหา'}</p><p class="distance-note">ลากเมาส์ ${number(cm360(c.dpi, best, c.game), 2)} ซม. เพื่อหมุนครบ 360°</p>${final ? `<button class="primary" data-copy="${best.toFixed(6)}">คัดลอก Sens ${number(best, 4)} <span>↗</span></button>` : ''}</div>
      <div class="result-advice"><div class="result-status">${status}</div><h2>ทำอะไรต่อดี?</h2><p>${advice}</p>${final ? '<button id="use-best" class="secondary">ใช้ค่านี้เริ่มค้นหาครั้งต่อไป →</button>' : '<button class="secondary" data-train>กลับไปสนามฝึก →</button>'}<small>ผลจากสนามฝึกนี้เป็นจุดเริ่มต้นสำหรับลองในเกม<br>ใช้กับ Hipfire · ไม่รวม ADS และแรงดีดปืน</small></div>
    </div>`;
  if (practice) {
    const run = latest.runs.at(-1);
    if (run) target.innerHTML += `<section class="result-section practice-result"><h2>ผลงานรอบฝึกของคุณ</h2><p>${run.mode === 'flick' ? 'Flick · ย้ายเป้าแล้วยิง' : 'Tracking · เล็งตามเป้า'}${run.raw ? '' : ' · Standard input (ไม่นำไปแนะนำ Sens)'}</p><div class="practice-stats"><div><span>คะแนนรอบนี้</span><strong>${number(roundScore(run), 1)}<small> / 100</small></strong></div><div><span>${run.mode === 'flick' ? 'ยิงโดน / ยิงทั้งหมด' : 'เวลาที่เล็งอยู่บนเป้า'}</span><strong>${run.mode === 'flick' ? `${run.hits} / ${run.shots}` : percent(run.onTarget / run.duration)}</strong></div><div><span>${run.mode === 'flick' ? 'ความแม่นยำ' : 'เวลาฝึก'}</span><strong>${run.mode === 'flick' ? percent(run.hits / Math.max(run.shots, 1)) : `${number(run.duration, 1)} วินาที`}</strong></div></div></section>`;
  } else if (rows.length) {
    target.innerHTML += `<section class="result-section"><div class="section-heading"><h2>เทียบ 3 ค่า Sens</h2><span>${stage === 1 ? 'ช่วงปรับละเอียด' : 'ช่วงกว้าง'} · ${final ? 'เล่นครบแล้ว' : 'ข้อมูลบางส่วน'}</span></div><p>คะแนนยิ่งสูง ยิ่งทำได้ดีในสนามนี้ · คะแนนรวมไม่ใช่เปอร์เซ็นต์ความแม่นยำ</p><div class="candidate-grid">${rows.map((r, i) => `<article class="candidate-card ${final && i === 0 ? 'best-candidate' : ''}"><div class="candidate-heading"><span>อันดับ ${i + 1}</span>${final && i === 0 ? '<span class="best-label">คะแนนสูงสุด</span>' : ''}</div><h3>Sens <strong>${number(r.sens, 4)}</strong></h3>${scoreMetric('คะแนนรวม', r.score, 'total-score')}${scoreMetric('Flick · ย้ายเป้าแล้วยิง', r.flickScore, 'flick-score')}${scoreMetric('Tracking · เล็งตามเป้า', r.trackingScore, 'tracking-score')}<p class="candidate-rounds">${r.flick.length + r.tracking.length} / ${repeats * 2} รอบ${r.balanced ? ' · ครบทั้งสองโหมด' : ' · ยังไม่ครบ'}</p></article>`).join('')}</div><p class="score-explanation">คะแนนรวมให้น้ำหนัก Flick ${GAMES[c.game].flickWeight * 100}% และ Tracking ${Math.round((1 - GAMES[c.game].flickWeight) * 100)}% สำหรับ ${GAMES[c.game].label}</p></section>`;
  }
  target.innerHTML += `<details class="result-details conversions"><summary>${final ? 'แปลง Sens ไปเกมอื่น' : 'ดูค่าแปลงจาก Sens ตั้งต้น'}</summary><div class="details-body"><p>ใช้ DPI ${c.dpi} เท่ากันทุกเกม · ระยะหมุนเท่ากัน · FOV และ ADS อาจให้ความรู้สึกต่างกัน</p><div class="table-wrap"><table><thead><tr><th scope="col">เกม</th><th scope="col">Hipfire Sens</th><th scope="col">ซม. ต่อ 360°</th><th scope="col">คัดลอกค่า</th></tr></thead><tbody>${Object.entries(GAMES).map(([key, game]) => { const s = convert(best, c.game, key); return `<tr><td>${game.label}</td><td><strong>${number(s, 4)}</strong></td><td>${number(cm360(c.dpi, s, key), 2)}</td><td><button class="copy" data-copy="${s.toFixed(6)}" aria-label="คัดลอก Sens สำหรับ ${game.label}">คัดลอก</button></td></tr>`; }).join('')}</tbody></table></div></div></details>`;
  if (latest.runs.length) target.innerHTML += `<details class="result-details"><summary>รายละเอียดการทดสอบ ${latest.runs.length} รอบ</summary><div class="details-body"><p>Flick: ความแม่นคือจำนวนที่ยิงโดนเทียบกับที่ยิงทั้งหมด · Tracking: เปอร์เซ็นต์เวลาที่เล็งอยู่บนเป้า</p><div class="table-wrap"><table><thead><tr><th scope="col">รอบ</th><th scope="col">โหมด</th><th scope="col">Sens</th><th scope="col">ความแม่น / อยู่บนเป้า</th><th scope="col">เวลาเฉลี่ยต่อ hit</th><th scope="col">คลาดเฉลี่ย</th><th scope="col">FPS</th></tr></thead><tbody>${latest.runs.map((r, i) => `<tr><td>${i + 1}</td><td>${r.mode === 'flick' ? 'Flick' : 'Tracking'}${r.raw ? '' : ' (standard input)'}</td><td>${number(r.sens, 4)}</td><td>${percent(r.mode === 'flick' ? r.hits / Math.max(r.shots, 1) : r.onTarget / r.duration)}</td><td>${r.mode === 'flick' && r.meanHitMs ? number(r.meanHitMs, 0) + ' ms' : '—'}</td><td>${number(r.angularError, 1)}°</td><td>${number(r.fps, 0)}</td></tr>`).join('')}</tbody></table></div></div></details>`;
  bindTrainLinks();
  for (const button of target.querySelectorAll('[data-copy]')) button.onclick = async () => { try { await window.desktop.copySens(button.dataset.copy); toast('คัดลอก Sens แล้ว'); } catch { toast(`Sens: ${button.dataset.copy}`); } };
  if ($('use-best')) $('use-best').onclick = async () => {
    if (session) { toast('ยุติเซสชันที่กำลังฝึกก่อนเปลี่ยนค่า'); return; }
    fillSettings({ ...c, sens: best }); updateSettings(); await persist(); showView('train'); toast('ตั้งค่าเริ่มต้นจากผลครั้งนี้แล้ว');
  };
}
function bindTrainLinks() { for (const button of document.querySelectorAll('[data-train]')) button.onclick = () => showView('train'); }
function renderHistory() {
  const controls = $('history-controls');
  const target = $('history-content');
  if (!state.history.length) {
    controls.hidden = true;
    target.innerHTML = '<div class="empty"><h2>ยังไม่มีประวัติการฝึก</h2><p>ผลที่เล่นจบจะบันทึกไว้ในเครื่องนี้อัตโนมัติ หรือนำเข้าข้อมูลจากรุ่น Portable ได้จากปุ่มด้านบน</p></div>';
    return;
  }
  const filtered = historyFilter === 'all' ? state.history : state.history.filter(r => r.game === historyFilter);
  const latestBest = filtered.find(r => r.bestSens && r.status === 'complete');
  controls.hidden = false;
  controls.innerHTML = `<div class="history-filters">${[['all', 'ทั้งหมด'], ...Object.entries(GAMES).map(([k, g]) => [k, g.label])].map(([key, label]) => `<button type="button" class="filter-chip ${historyFilter === key ? 'active' : ''}" data-filter="${key}">${label}</button>`).join('')}</div><span class="history-summary">${filtered.length} เซสชัน${latestBest ? ` · ค่าแนะนำล่าสุด <strong>${number(latestBest.bestSens, 4)}</strong>` : ''}</span>`;
  for (const btn of controls.querySelectorAll('[data-filter]')) btn.onclick = () => { historyFilter = btn.dataset.filter; renderHistory(); };
  if (!filtered.length) {
    target.innerHTML = '<div class="empty"><h2>ยังไม่มีประวัติในเกมนี้</h2><p>ลองเลือกดูทั้งหมด หรือเริ่มฝึกในเกมที่ต้องการ</p></div>';
    return;
  }
  target.innerHTML = filtered.map(r => `<div class="history-entry"><div><h2>${GAMES[r.game]?.label || escape(r.game)} · ${r.kind === 'finder' ? 'Sensitivity finder' : 'Free practice'}</h2><p>${escape(date(r.startedAt))} · ${r.dpi} DPI · ${r.rounds} รอบ · ${r.status === 'complete' ? 'ครบเซสชัน' : r.status === 'practice' ? 'ฝึกอิสระ' : 'ข้อมูลบางส่วน'}${r.bestSens && r.status === 'complete' ? ` · Sens ${number(r.bestSens, 4)}` : ''}</p></div><button class="secondary" data-session="${escape(r.id)}">ดูผล →</button></div>`).join('');
  for (const button of target.querySelectorAll('[data-session]')) button.onclick = async () => { try { const loaded = await window.desktop.readSession(button.dataset.session); if (!loaded) { toast('ไม่พบไฟล์ผลการฝึกนี้'); return; } latest = loaded; showView('results'); } catch (error) { toast(error.message); } };
}
async function init() {
  if (!window.desktop) { fail('กรุณาเปิดผ่านโปรแกรม DaLines Sens Lab.exe'); return; }
  try {
    const info = await window.desktop.getStorageInfo?.();
    if (info) {
      const modeLabel = { portable: 'Portable', store: 'Microsoft Store', appdata: 'AppData', dev: 'Dev', qa: 'QA' }[info.mode] || 'Portable';
      $('app-version').textContent = `${modeLabel} · v${info.version || window.desktop.version}`;
      if (info.mode === 'store' || info.mode === 'appdata') $('storage-subtitle').textContent = 'เก็บข้อมูลใน AppData ของ Windows';
    }
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
        $('hud-mode').textContent = `${session.plan[session.index].mode === 'flick' ? 'Flick' : 'Tracking'}${session.kind === 'finder' ? ` · รอบ ${session.index + 1}/${totalRounds(session.config)}` : ' · ฝึกอิสระ'}`;
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
  $('open-data-dir').onclick = async () => { try { await window.desktop.openDataFolder(); } catch (error) { toast(error.message); } };
  $('import-portable').onclick = async () => {
    if (session) { toast('กรุณายุติเซสชันที่กำลังฝึกก่อนนำเข้าข้อมูล'); return; }
    try {
      const res = await window.desktop.importPortableData();
      if (res?.canceled) return;
      if (res?.workspace) {
        state = { version: 1, settings: { ...defaults, ...res.workspace.settings }, draft: res.workspace.draft || null, history: res.workspace.history || [] };
        fillSettings(state.settings); updateSettings();
        if (state.history[0]) latest = await window.desktop.readSession(state.history[0].id);
        renderHistory();
      }
      toast(`นำเข้าสำเร็จ: เพิ่ม ${res.importedSessions} เซสชัน (รวม ${res.totalHistory} รายการ)`);
    } catch (error) { toast(error.message); }
  };
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
  }, preview: async (variant = 'complete') => {
    const c = { ...defaults, rounds: variant === 'quick' ? 12 : 24 };
    const repeats = sessionRepeats(c);
    let runs = [0, 1].flatMap(stage => createBlock(c.sens, stage, 98 + stage, repeats)).map(r => {
      const wins = r.id.endsWith(variant === 'edge' ? '-2' : '-1');
      return { ...r, complete: true, raw: true, duration: c.duration, hits: variant === 'tied' ? 20 : wins ? 40 : 10, shots: variant === 'tied' ? 25 : wins ? 42 : 30, onTarget: variant === 'tied' ? 10 : wins ? 16 : 5, meanHitMs: 500, angularError: 2, fps: 120 };
    });
    let status = 'complete', kind = 'finder';
    if (variant === 'stopped') { runs = runs.slice(0, 3); status = 'stopped'; }
    if (variant === 'practice') { runs = [{ ...runs[0], practice: true, raw: false }]; kind = 'practice'; status = 'practice'; }
    latest = { id: 'qa-preview', kind, config: c, runs, status, startedAt: '2026-11-17T10:00:00.000Z' };
    session = null;
    showView('results');
    clearTimeout(toastTimer); $('toast').hidden = true;
    window.scrollTo(0, 0);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // Let the hidden Electron compositor present the updated page before capture.
    await new Promise(resolve => setTimeout(resolve, 180));
    if (document.documentElement.scrollWidth > innerWidth) throw new Error(`Results overflow: ${variant}`);
    const content = $('results-content');
    const hasBest = Boolean($('use-best'));
    if (hasBest !== (kind === 'finder' && status === 'complete')) throw new Error(`Wrong recommendation state: ${variant}`);
    if (variant === 'practice' && (!content.querySelector('.practice-stats') || content.querySelector('.candidate-card'))) throw new Error('Practice must show training stats');
    if (variant === 'quick' && !content.textContent.includes('ผลเบื้องต้น')) throw new Error('Quick results must be provisional');
    if (variant === 'edge' && !content.textContent.includes('ขอบช่วง')) throw new Error('Edge results must suggest another search');
    if (variant === 'tied' && !content.textContent.includes('ยังแยกกันไม่ชัด')) throw new Error('Tied scores must not claim a clear result');
    if (content.querySelector('[data-copy]')?.dataset.copy !== (hasBest ? recommendation(runs, c.game, 1, repeats).best.sens : c.sens).toFixed(6)) throw new Error('Copied Sens must match displayed result');
    return { variant, recommendation: hasBest, width: innerWidth, noOverflow: true };
  }, run: async () => {
    const checks = [];
    const originalState = structuredClone(state), originalLatest = latest;
    state = { version: 1, settings: { ...defaults }, draft: null, history: [] }; latest = null; session = null;
    fillSettings(defaults); updateSettings(); await persist();
    const check = (name, condition) => { checks.push({ name, ok: Boolean(condition) }); if (!condition) throw new Error(name); };
    check('3D renderer created', Boolean(arena?.renderer.getContext()));
    check('offline bridge present', Boolean(window.desktop.saveSession && window.desktop.getStorageInfo && window.desktop.importPortableData));
    check('storage mode reported', Boolean((await window.desktop.getStorageInfo())?.mode));
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
    const legacyConfig = { ...defaults }; delete legacyConfig.rounds;
    fillSettings(legacyConfig); updateSettings();
    check('legacy settings default to 24 rounds', readConfig().rounds === 24);
    $('discord').checked = false;
    $('discord').dispatchEvent(new Event('change', { bubbles: true }));
    await saveChain;
    check('Discord opt-out is persisted', (await window.desktop.load()).settings.discord === false);
    check('automated UI tests never publish Discord activity', await window.desktop.setDiscordPresence(true) === 'disabled');
    check('brand logo loads locally', document.querySelector('.brand img').complete && document.querySelector('.brand img').naturalWidth > 0);
    for (const total of [12, 24, 36, 48]) {
      for (const duration of [20, 30, 45]) {
        fillSettings({ ...defaults, rounds: total, duration }); updateSettings();
        check(`estimate for ${total} rounds at ${duration}s`, $('session-estimate').textContent.includes(`${number(total * duration / 60, 1)} นาที`));
      }
      fillSettings({ ...defaults, rounds: total }); updateSettings();
      showView('train');
      await startFinder({ preventDefault() {} });
      check(`${total}: draft saved before first round`, (await window.desktop.load()).draft.plan.length === total / 2);
      check(`${total}: settings locked during finder`, $('rounds').disabled);
      for (let i = 0; i < total; i++) {
        const r = session.plan[session.index];
        const center = r.id.endsWith('-1');
        await finishedRound({ ...r, complete: true, raw: true, duration: 20, hits: center ? 40 : 10, shots: center ? 42 : 30, onTarget: center ? 16 : 5, angularError: 2, pathDegrees: 10, meanHitMs: 500, fps: 120, totalFrames: 2400, hitTimes: [], samples: [] });
        if (i === 0 || i === total / 2) {
          // Reload the persisted draft, including a legacy 24-round config.
          const saved = await window.desktop.load();
          session = structuredClone(saved.draft);
          if (total === 24) delete session.config.rounds;
          fillSettings(session.config); lockSettings(true); updateSettings(); nextOverlay();
          check(`${total}: resumed cursor ${i + 1}`, session.index === i + 1 && session.runs.length === i + 1 && $('session-label').textContent.includes(`/ ${total}`));
          check(`${total}: progress follows chosen length`, Math.abs(parseFloat($('progress-fill').style.width) - (i + 1) / total * 100) < 0.01);
        }
        if (i === total / 2 - 1) check(`${total}: fine block starts after balanced coarse block`, session.plan.length === total && session.plan[total / 2].stage === 1);
      }
      check(`${total}: finder completes chosen round count`, latest.runs.length === total && latest.status === 'complete' && session === null);
      check(`${total}: results show best setting and comparison cards`, $('results-content').textContent.includes('0.35') && $('results-content').querySelectorAll('.candidate-card').length === 3);
      check(`${total}: quick results never claim repeat consistency`, $('results-content').textContent.includes(total === 12 ? 'ผลเบื้องต้น' : 'คะแนนแยกกันชัดในครั้งนี้'));
      check(`${total}: full session persisted separately`, (await window.desktop.readSession(latest.id)).runs.length === total);
      check(`${total}: settings unlocked after completion`, !$('rounds').disabled);
      check(`${total}: dense details collapsed by default`, [...$('results-content').querySelectorAll('details')].every(d => !d.open));
      await $('use-best').onclick();
      check(`${total}: use best retains session length`, readConfig().rounds === total && readConfig().sens === 0.35);
      const files = await window.desktop.load();
      check(`${total}: completed session clears resumable draft`, files.draft === null && files.history.length === [12, 24, 36, 48].indexOf(total) + 1);
    }
    renderHistory(); check('completed history links to results', Boolean($('history-content').querySelector('[data-session]')));
    // Zero activity stops early and cannot produce a recommendation.
    fillSettings({ ...defaults, rounds: 12 }); updateSettings();
    await startFinder({ preventDefault() {} });
    for (let i = 0; i < 6; i++) await finishedRound({ ...session.plan[session.index], complete: true, raw: true, duration: 20, hits: 0, shots: 0, onTarget: 0 });
    check('insufficient data stops without suggesting a value', latest.status === 'insufficient' && !$('use-best') && !$('results-content').querySelector('.result-setting [data-copy]'));
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
