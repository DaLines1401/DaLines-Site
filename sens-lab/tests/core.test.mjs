import test from 'node:test';
import assert from 'node:assert/strict';
import { cm360, sensFromCm, convert, createBlock, rankCandidates, recommendation, roundScore, verticalFov, seededRandom, repeatsFor, ROUND_COUNTS } from '../src/core.mjs';
test('physical distance is conserved across three games and DPI changes', () => {
  assert.ok(Math.abs(cm360(800, 0.35, 'valorant') - 46.6530612245) < 1e-8);
  for (const from of ['valorant', 'cs2', 'apex']) for (const to of ['valorant', 'cs2', 'apex']) {
    const converted = convert(0.4, from, to);
    assert.ok(Math.abs(cm360(1600, 0.4, from) - cm360(1600, converted, to)) < 1e-9);
    assert.ok(Math.abs(convert(converted, to, from) - 0.4) < 1e-10);
    assert.ok(Math.abs(sensFromCm(cm360(800, 0.4, from), 1600, from) - 0.2) < 1e-10);
  }
});
test('invalid physical inputs cannot generate a recommendation', () => {
  for (const value of [0, -1, NaN, Infinity, 'nope']) assert.throws(() => cm360(value, 1, 'cs2'));
  assert.throws(() => cm360(800, 0, 'cs2'));
  assert.throws(() => createBlock(0));
});
test('Source 4:3 and Valorant 16:9 FOV become correct vertical angles', () => {
  assert.ok(Math.abs(verticalFov(90, 4 / 3) - 73.7397952917) < 1e-8);
  assert.ok(Math.abs(verticalFov(103, 16 / 9) - 70.5328001076) < 1e-5);
});
test('balanced plan uses identical task seeds and reverses order', () => {
  for (const stage of [0, 1]) {
    const plan = createBlock(0.35, stage, 187);
    assert.equal(plan.length, 12);
    const ids = [...new Set(plan.map(r => r.id))];
    assert.equal(ids.length, 3);
    for (const id of ids) for (const mode of ['flick', 'tracking']) {
      const runs = plan.filter(r => r.id === id && r.mode === mode);
      assert.equal(runs.length, 2);
      for (const repeat of [0, 1]) {
        assert.equal(new Set(plan.filter(r => r.mode === mode && r.repeat === repeat).map(r => r.seed)).size, 1);
      }
    }
    assert.deepEqual(plan.slice(0, 6).filter(r => r.mode === 'flick').map(r => r.id), plan.slice(6).filter(r => r.mode === 'flick').map(r => r.id).reverse());
    assert.deepEqual(plan, createBlock(0.35, stage, 187));
  }
});
test('click spam does not beat accurate firing at identical hit rates', () => {
  const base = { mode: 'flick', hits: 20, duration: 20 };
  assert.ok(roundScore({ ...base, shots: 20 }) > roundScore({ ...base, shots: 200 }));
  assert.equal(roundScore({ ...base, hits: 0, shots: 0 }), 0);
  assert.equal(roundScore({ mode: 'tracking', onTarget: 10, duration: 20 }), 50);
});
function resultFixture() {
  return createBlock(0.35, 1, 98).map(r => ({ ...r, complete: true, raw: true, practice: false, duration: 20, hits: r.id === '1-1' ? 40 : 10, shots: r.id === '1-1' ? 42 : 30, onTarget: r.id === '1-1' ? 16 : 5 }));
}
test('completed balanced trials select the strongest center and exclude practice, standard input and incomplete trials', () => {
  const runs = resultFixture();
  const rec = recommendation(runs, 'valorant');
  assert.equal(rec.best.id, '1-1');
  assert.equal(rec.stable, true);
  assert.equal(rec.edge, false);
  for (const key of ['practice', 'raw', 'complete']) {
    const bad = runs.map((r, i) => i === 0 ? { ...r, [key]: key === 'practice' } : r);
    assert.equal(recommendation(bad, 'valorant'), null);
  }
});
test('ties, zero activity and edge winners do not claim a stable optimum', () => {
  const tied = resultFixture().map(r => ({ ...r, hits: 20, shots: 25, onTarget: 10 }));
  assert.equal(recommendation(tied, 'apex').stable, false);
  const empty = tied.map(r => ({ ...r, hits: 0, shots: 0, onTarget: 0 }));
  assert.equal(recommendation(empty, 'cs2').useful, false);
  const edge = resultFixture().map(r => ({ ...r, hits: r.id === '1-2' ? 50 : 5, shots: 50, onTarget: r.id === '1-2' ? 18 : 2 }));
  assert.equal(recommendation(edge, 'cs2').edge, true);
  assert.equal(recommendation(edge, 'cs2').stable, false);
  assert.equal(recommendation(tied.slice(0, 11), 'apex'), null);
});
test('game preference can change ranking without changing raw task scores', () => {
  const runs = resultFixture().map(r => ({ ...r, hits: r.id === '1-0' ? 60 : 10, shots: r.id === '1-0' ? 60 : 20, onTarget: r.id === '1-2' ? 19 : 2 }));
  assert.equal(rankCandidates(runs, 'valorant')[0].id, '1-0');
  assert.equal(rankCandidates(runs, 'apex')[0].id, '1-2');
});
test('target random streams are reproducible for matched trials', () => {
  const a = seededRandom(42), b = seededRandom(42);
  assert.deepEqual(Array.from({ length: 100 }, a), Array.from({ length: 100 }, b));
});

for (const total of ROUND_COUNTS) test(`${total} rounds compare every sensitivity equally and require the full chosen block`, () => {
  const repeats = repeatsFor(total);
  const coarse = createBlock(0.35, 0, 187, repeats);
  const fine = createBlock(0.35, 1, 6194, repeats);
  assert.equal(coarse.length + fine.length, total);
  for (const plan of [coarse, fine]) {
    for (const id of new Set(plan.map(r => r.id))) for (const mode of ['flick', 'tracking']) {
      assert.equal(plan.filter(r => r.id === id && r.mode === mode).length, repeats);
    }
    for (let repeat = 0; repeat < repeats; repeat++) {
      for (const mode of ['flick', 'tracking']) {
        assert.equal(new Set(plan.filter(r => r.repeat === repeat && r.mode === mode).map(r => r.seed)).size, 1);
      }
      if (repeat) assert.deepEqual(plan.slice(repeat * 6, repeat * 6 + 6).filter(r => r.mode === 'flick').map(r => r.id), plan.slice((repeat - 1) * 6, repeat * 6).filter(r => r.mode === 'flick').map(r => r.id).reverse());
    }
  }
  const runs = fine.map(r => ({ ...r, complete: true, raw: true, duration: 20, hits: r.id === '1-1' ? 40 : 10, shots: 42, onTarget: r.id === '1-1' ? 16 : 5 }));
  const rec = recommendation(runs, 'valorant', 1, repeats);
  assert.equal(rec.best.id, '1-1');
  assert.equal(rec.repeated, total > 12);
  assert.equal(rec.stable, total > 12);
  assert.equal(recommendation(runs.slice(0, -1), 'valorant', 1, repeats), null);
  for (const flag of ['raw', 'complete', 'practice']) {
    const invalid = runs.map((r, i) => i === 0 ? { ...r, [flag]: flag === 'practice' } : r);
    assert.equal(recommendation(invalid, 'valorant', 1, repeats), null);
  }
});

test('consistency includes later repeats instead of only the first two', () => {
  const runs = createBlock(0.35, 1, 98, 4).map(r => ({ ...r, complete: true, raw: true, duration: 20, hits: r.id === '1-1' ? 25 : 20, shots: 30, onTarget: r.repeat === 3 ? 0 : 16 }));
  const rec = recommendation(runs, 'valorant', 1, 4);
  assert.equal(rec.noise, 80);
  assert.equal(rec.stable, false);
});

test('session length defaults to the legacy plan and rejects unsupported counts', () => {
  assert.equal(repeatsFor(), 2);
  assert.deepEqual(createBlock(0.35, 0, 1), createBlock(0.35, 0, 1, 2));
  for (const n of [0, 6, 18, 25, 60, NaN, '24']) assert.throws(() => repeatsFor(n));
  for (const n of [0, 1.5, 5]) assert.throws(() => createBlock(0.35, 0, 1, n));
});
