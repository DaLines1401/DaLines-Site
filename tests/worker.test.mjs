import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const workerSource = await readFile(new URL('worker.js', root), 'utf8');

function createWorker(upstream = async () => new Response('Diamond 2 - 42 RR')) {
  const requests = [];
  const timers = new Map();
  let sequence = 0;
  const context = vm.createContext({
    URL, Request, Response, Headers, AbortController, console,
    setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch: async (url, init) => { requests.push({ url, init }); return upstream(url, init); }
  });
  // The Worker has a single default export. Isolate each test's module state
  // without importing it into Node's shared module cache or making real requests.
  vm.runInContext(workerSource.replace(/\bexport default\b/, 'globalThis.worker ='), context, { filename: 'worker.js' });
  return { worker: context.worker, requests, timers };
}


test('Worker configuration dispatches only API routes before static assets', async () => {
  const config = JSON.parse(await readFile(new URL('wrangler.jsonc', root), 'utf8'));
  assert.equal(config.main, './worker.js');
  assert.equal(config.assets.directory, './dist');
  assert.equal(config.assets.binding, 'ASSETS');
  assert.deepEqual(config.assets.run_worker_first, ['/api/*']);
});

test('API OPTIONS preflight returns CORS headers without an upstream request', async () => {
  const { worker, requests } = createWorker();
  const response = await worker.fetch(new Request('https://dalines.test/api/valorant', { method: 'OPTIONS' }), {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.match(response.headers.get('access-control-allow-methods'), /GET/);
  assert.equal(await response.text(), '');
  assert.equal(requests.length, 0);
});

test('both Valorant GET aliases return profile data and retain background refresh caching', async () => {
  const { worker, requests } = createWorker();
  const background = [];
  const context = { waitUntil(promise) { background.push(promise); } };
  const first = await worker.fetch(new Request('https://dalines.test/api/valorant'), {}, context);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('access-control-allow-origin'), '*');
  assert.match(first.headers.get('cache-control'), /max-age=30/);
  const profile = await first.json();
  assert.equal(profile.status, 'success');
  assert.equal(profile.data.riotId, 'DaLines#TTV');
  assert.ok(profile.data.stats.kd);
  await Promise.all(background);
  const refreshed = await worker.fetch(new Request('https://dalines.test/api/valorant-tracker'), {}, context);
  const current = await refreshed.json();
  assert.equal(current.data.currentTier, 'Diamond 2');
  assert.equal(current.data.currentRR, 42);
  assert.equal(requests.length, 1, 'Repeated requests should use the existing upstream refresh window');
});

test('Valorant viewer lookup retains encoded player names and result fields', async () => {
  const { worker, requests } = createWorker(async () => new Response('Ascendant 3 - 77 RR MMR Elo: 2077'));
  const response = await worker.fetch(new Request('https://dalines.test/api/valorant?name=Player%20One&tag=AB%231&region=AP'), {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.isPlayerLookup, true);
  assert.equal(payload.data.riotId, 'Player One#AB#1');
  assert.equal(payload.data.currentTier, 'Ascendant 3');
  assert.equal(payload.data.currentRR, 77);
  assert.equal(payload.data.elo, 2077);
  assert.match(requests[0].url, /\/ap\/Player%20One\/AB%231\?/);
});

test('static paths pass the original request to ASSETS without rewriting or redirecting', async () => {
  const { worker, requests } = createWorker();
  for (const pathname of ['/', '/dance/', '/dance', '/tts', '/tts/', '/story/', '/party', '/missing-page']) {
    const request = new Request('https://dalines.test' + pathname + '?from=test');
    const expected = new Response('static asset: ' + pathname, { status: 200, headers: { 'content-type': 'text/html' } });
    let received;
    const response = await worker.fetch(request, { ASSETS: { fetch(original) { received = original; return expected; } } });
    assert.equal(received, request, `Worker must preserve ${pathname} for Static Assets canonical handling`);
    assert.equal(response, expected);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
    assert.equal(new URL(received.url).pathname, pathname);
  }
  assert.equal(requests.length, 0, 'Static requests must not contact an external service');
});

test('TTS API proxy preserves its path, query, method, credentials and response', async () => {
  const { worker, requests } = createWorker(async () => new Response('{"ok":true}', { status: 202, headers: { 'content-type': 'application/json' } }));
  const request = new Request('https://dalines.test/api/tts/speak?voice=th', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer test-only' }, body: '{"message":"hello"}'
  });
  const response = await worker.fetch(request, { TTS_BOT_ORIGIN: 'https://bot.invalid' });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://bot.invalid/api/speak?voice=th');
  assert.equal(requests[0].init.method, 'POST');
  assert.equal(requests[0].init.headers.get('authorization'), 'Bearer test-only');
  assert.equal(requests[0].init.body, '{"message":"hello"}');
  assert.equal(response.status, 202);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.deepEqual(await response.json(), { ok: true });
});

test('Twitch live status endpoint returns parsed stream state and caches upstream checks', async () => {
  const { worker, requests } = createWorker(async (url) => {
    if (String(url).includes('/uptime/')) return new Response('2 hours, 15 minutes');
    if (String(url).includes('/game/')) return new Response('VALORANT');
    return new Response('');
  });
  const first = await worker.fetch(new Request('https://dalines.test/api/twitch-status'), {}, {});
  assert.equal(first.status, 200);
  assert.match(first.headers.get('cache-control'), /max-age=30/);
  const body = await first.json();
  assert.equal(body.status, 'success');
  assert.equal(body.data.isLive, true);
  assert.equal(body.data.uptime, '2 hours, 15 minutes');
  assert.equal(body.data.game, 'VALORANT');
  assert.equal(requests.length, 2);

  const second = await worker.fetch(new Request('https://dalines.test/api/twitch-status'), {}, {});
  assert.equal(second.status, 200);
  assert.equal(requests.length, 2, 'Cached window should avoid duplicate upstream requests');
});
