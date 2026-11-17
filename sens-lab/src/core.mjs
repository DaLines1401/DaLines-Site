export const GAMES = Object.freeze({
  valorant: { label: 'Valorant', yaw: 0.07, fov: 103, aspect: 16 / 9, flickWeight: 0.7, defaultSens: 0.35 },
  cs2: { label: 'Counter-Strike 2', yaw: 0.022, fov: 90, aspect: 4 / 3, flickWeight: 0.7, defaultSens: 1.113636 },
  apex: { label: 'Apex Legends', yaw: 0.022, fov: 104, aspect: 4 / 3, flickWeight: 0.35, defaultSens: 1.113636 }
});
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export function positive(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} ต้องมากกว่า 0`);
  return n;
}
export function cm360(dpi, sens, game) { return 914.4 / (positive(dpi, 'DPI') * positive(sens, 'Sens') * GAMES[game].yaw); }
export function sensFromCm(cm, dpi, game) { return 914.4 / (positive(cm, 'cm/360') * positive(dpi, 'DPI') * GAMES[game].yaw); }
export function convert(sens, from, to) { return positive(sens, 'Sens') * GAMES[from].yaw / GAMES[to].yaw; }
export function verticalFov(fov, aspect) { return 2 * Math.atan(Math.tan(fov * Math.PI / 360) / aspect) * 180 / Math.PI; }
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function createBlock(center, stage = 0, seed = 1) {
  positive(center, 'Sensitivity');
  const factors = stage === 0 ? [1 / 1.4, 1, 1.4] : [1 / 1.12, 1, 1.12];
  const candidates = factors.map((factor, i) => ({ id: `${stage}-${i}`, sens: center * factor }));
  const rng = seededRandom(seed);
  const order = [0, 1, 2]; // Fisher-Yates keeps order independent of performance.
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const result = [];
  // Each candidate sees the same two task seeds. Reverse the second block to
  // reduce order/fatigue effects. Every candidate has both tasks twice.
  for (let repeat = 0; repeat < 2; repeat++) {
    const slots = repeat === 0 ? order : [...order].reverse();
    for (const i of slots) {
      for (const mode of repeat === 0 ? ['flick', 'tracking'] : ['tracking', 'flick']) {
        result.push({ ...candidates[i], mode, repeat, stage, seed: seed + repeat * 701 + (mode === 'flick' ? 19 : 193) });
      }
    }
  }
  return result;
}
export function roundScore(run) {
  if (run.mode === 'tracking') return clamp(run.onTarget / Math.max(run.duration, 0.01), 0, 1) * 100;
  const accuracy = run.hits / Math.max(run.shots, 1);
  // Bounded hit rate rewards fast, accurate hits; spam lowers accuracy.
  return 100 * (1 - Math.exp(-(run.hits / Math.max(run.duration, 0.01)) / 1.5)) * Math.sqrt(accuracy);
}
const mean = values => values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
export function rankCandidates(runs, game) {
  const groups = new Map();
  for (const run of runs.filter(r => r.complete && r.raw && !r.practice)) {
    if (!groups.has(run.id)) groups.set(run.id, { id: run.id, sens: run.sens, flick: [], tracking: [] });
    groups.get(run.id)[run.mode].push(roundScore(run));
  }
  return [...groups.values()].map(row => {
    const flick = mean(row.flick), tracking = mean(row.tracking);
    return { ...row, flickScore: flick, trackingScore: tracking, score: flick * GAMES[game].flickWeight + tracking * (1 - GAMES[game].flickWeight), balanced: row.flick.length >= 2 && row.tracking.length >= 2 };
  }).sort((a, b) => b.score - a.score);
}
export function recommendation(runs, game, stage = 1) {
  const rows = rankCandidates(runs.filter(r => r.stage === stage), game);
  if (rows.length !== 3 || !rows.every(row => row.balanced)) return null;
  const best = rows[0];
  const gap = best.score - rows[1].score;
  const noise = Math.max(...rows.map(row => Math.max(Math.abs(row.flick[0] - row.flick[1]), Math.abs(row.tracking[0] - row.tracking[1]))));
  const useful = best.score >= 8 && rows.some(row => row.flickScore > 0) && rows.some(row => row.trackingScore > 0);
  const edge = best.sens === Math.min(...rows.map(r => r.sens)) || best.sens === Math.max(...rows.map(r => r.sens));
  const stable = useful && gap > Math.max(3, noise * 0.5) && !edge;
  return { best, rows, gap, noise, edge, useful, stable, low: Math.min(...rows.filter(row => best.score - row.score <= Math.max(3, noise * 0.5)).map(r => r.sens)), high: Math.max(...rows.filter(row => best.score - row.score <= Math.max(3, noise * 0.5)).map(r => r.sens)) };
}
