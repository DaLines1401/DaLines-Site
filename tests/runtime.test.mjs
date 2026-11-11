import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

const root = new URL(process.env.SITE_TEST_DIST === '1' ? '../dist/' : '../', import.meta.url);
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

// linkedom supplies the DOM. Only platform services it does not implement are
// stubbed: canvas, clipboard, storage, timers and network. The actual app startup
// and event listeners run unchanged in an isolated context for every test.
async function createSite(options = {}) {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const { window: domWindow, document } = parseHTML(html);
  Object.defineProperty(domWindow.HTMLElement.prototype, 'innerText', {
    configurable: true, get() { return this.textContent; }, set(value) { this.textContent = String(value); }
  });
  Object.defineProperty(document, 'activeElement', { configurable: true, writable: true, value: document.body });
  Object.defineProperty(document, 'readyState', { configurable: true, writable: true, value: 'loading' });
  Object.defineProperty(document, 'hidden', { configurable: true, writable: true, value: false });
  domWindow.HTMLElement.prototype.focus = function () { this.ownerDocument.activeElement = this; };
  domWindow.HTMLTextAreaElement.prototype.select = function () {};
  document.execCommand = () => Boolean(options.legacyClipboard);
  domWindow.HTMLElement.prototype.scrollIntoView = function () {};
  domWindow.HTMLElement.prototype.getBoundingClientRect = function () { return { x: 0, y: 0, top: 0, left: 0, right: 640, bottom: 360, width: 640, height: 360 }; };
  const mediaCalls = [];
  for (const video of document.querySelectorAll('video, audio')) {
    Object.assign(video, { duration: 15, currentTime: 0, paused: true, muted: true, readyState: 1 });
    video.play = async () => { video.paused = false; mediaCalls.push('play'); };
    video.pause = () => { video.paused = true; mediaCalls.push('pause'); };
    video.load = () => mediaCalls.push('load');
  }
  const heroTrack = document.getElementById('hero-scroll-track');
  if (heroTrack) Object.defineProperty(heroTrack, 'offsetHeight', { configurable: true, value: 2400 });

  let sequence = 0;
  const frames = new Map();
  const timers = new Map();
  const requests = [];
  const canvasCalls = [];
  const drawing = new Proxy({}, {
    get(target, key) { return key in target ? target[key] : (...args) => canvasCalls.push([key, ...args]); },
    set(target, key, value) { target[key] = value; canvasCalls.push([key, value]); return true; }
  });
  domWindow.HTMLCanvasElement.prototype.getContext = () => drawing;
  const storage = new Map(Object.entries({ dalines_sound: 'false', ...options.storage }));
  const localStorage = {
    getItem(key) { if (options.blockStorage) throw new Error('Storage blocked'); return storage.get(key) ?? null; },
    setItem(key, value) { if (options.blockStorage) throw new Error('Storage blocked'); storage.set(key, String(value)); }
  };
  const media = new Map();
  function matchMedia(query) {
    if (!media.has(query)) media.set(query, {
      matches: query.includes('prefers-reduced-motion') ? Boolean(options.reducedMotion) : false,
      addEventListener() {}, removeEventListener() {}
    });
    return media.get(query);
  }
  const sandbox = {
    document, console, URL, URLSearchParams, AbortController, Promise, Intl,
    Event: domWindow.Event, CustomEvent: domWindow.CustomEvent,
    HTMLElement: domWindow.HTMLElement, Element: domWindow.Element,
    location: { hostname: 'localhost', href: 'http://localhost:8787/', origin: 'http://localhost:8787', protocol: 'http:', hash: options.hash || '' },
    navigator: {
      onLine: true, connection: { saveData: Boolean(options.saveData), addEventListener() {} },
      clipboard: { writeText: options.clipboard || (async () => {}) }
    },
    localStorage, matchMedia, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 2,
    performance: { now: () => 0 },
    getComputedStyle: () => ({ getPropertyValue: () => '#10b981' }),
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(callback, delay) { const id = ++sequence; timers.set(id, { callback, delay, interval: true }); return id; },
    clearInterval(id) { timers.delete(id); },
    fetch: async (url, init) => {
      requests.push({ url, init });
      if (options.fetch) return options.fetch(url, init);
      return { ok: true, text: async () => url.includes('/game/') ? 'VALORANT' : (options.uptime || 'dalines is offline') };
    },
    addEventListener: domWindow.addEventListener.bind(domWindow),
    removeEventListener: domWindow.removeEventListener.bind(domWindow),
    dispatchEvent: domWindow.dispatchEvent.bind(domWindow),
    scrollY: 0, pageYOffset: 0, scrollTo() {}, open() {}
  };
  sandbox.history = { replaceState(_state, _title, url) { sandbox.location.hash = String(url).startsWith('#') ? String(url) : new URL(url, sandbox.location.href).hash; } };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  const context = vm.createContext(sandbox);
  const scriptFiles = [...document.querySelectorAll('script[src]')].map(script => script.getAttribute('src')).filter(src => src.startsWith('assets/') && src.endsWith('.js'));
  assert.equal(scriptFiles.length, 3, 'Expected app, effects and hero classic scripts');
  for (const name of scriptFiles) {
    vm.runInContext(await readFile(new URL(name, root), 'utf8'), context, { filename: name });
  }
  document.dispatchEvent(new domWindow.Event('DOMContentLoaded'));
  await settle();
  return {
    context, document, requests, frames, timers, storage, canvasCalls, mediaCalls,
    clickTab(name) { document.querySelector(`[data-tab="${name}"]`).click(); },
    keyTab(name, key) {
      const event = new domWindow.Event('keydown', { bubbles: true, cancelable: true });
      event.key = key;
      document.querySelector(`[data-tab="${name}"]`).dispatchEvent(event);
    },
    frame(timestamp = 100) {
      const pending = [...frames.values()]; frames.clear();
      for (const callback of pending) callback(timestamp);
    },
    setHash(value) { sandbox.location.hash = value; sandbox.dispatchEvent(new domWindow.Event('hashchange')); },
    setHidden(value) { document.hidden = value; document.dispatchEvent(new domWindow.Event('visibilitychange')); },
    evaluate(code) { return vm.runInContext(code, context); }
  };
}

function assertSelected(site, name) {
  const buttons = [...site.document.querySelectorAll('[role="tab"]')];
  assert.equal(buttons.filter(button => button.getAttribute('aria-selected') === 'true').length, 1);
  for (const button of buttons) {
    const selected = button.dataset.tab === name;
    assert.equal(button.getAttribute('aria-selected'), String(selected));
    // linkedom's tabIndex getter treats zero as -1; verify the reflected HTML value.
    assert.equal(button.getAttribute('tabindex'), selected ? '0' : '-1');
    const panel = site.document.getElementById(button.getAttribute('aria-controls'));
    assert.equal(panel.hidden, !selected);
    assert.equal(panel.classList.contains('active'), selected);
    assert.equal(panel.getAttribute('aria-labelledby'), button.id);
  }
}

test('startup keeps hidden panels and third-party players idle, then initializes every tab', async () => {
  const site = await createSite();
  assertSelected(site, 'links');
  assert.equal(site.document.querySelectorAll('script[src*="peerjs"]').length, 0);
  assert.ok(!site.document.getElementById('twitch-main-player').getAttribute('src') || site.document.getElementById('twitch-main-player').getAttribute('src') === 'about:blank');
  assert.equal(site.document.getElementById('clips-grid').children.length, 0);
  for (const tab of ['stream', 'pc', 'gear', 'rules', 'links']) {
    site.clickTab(tab);
    assertSelected(site, tab);
  }
  assert.ok(site.document.getElementById('clips-grid').children.length > 0);
  assert.ok(site.document.getElementById('sens-results-grid').children.length > 0);
  assert.ok(site.document.getElementById('bot-commands-grid').children.length > 0);
});

test('keyboard navigation wraps and maintains the accessible tab selection', async () => {
  const site = await createSite();
  site.keyTab('links', 'ArrowLeft'); assertSelected(site, 'rules');
  assert.equal(site.document.activeElement.dataset.tab, 'rules');
  site.keyTab('rules', 'ArrowRight'); assertSelected(site, 'links');
  site.keyTab('links', 'End'); assertSelected(site, 'rules');
  site.keyTab('rules', 'Home'); assertSelected(site, 'links');
});

test('Twitch player and chat are released when leaving their tab', async () => {
  const site = await createSite();
  site.clickTab('stream');
  const player = site.document.getElementById('twitch-main-player');
  const chat = site.document.getElementById('twitch-chat-frame');
  assert.match(player.getAttribute('src'), /^https:\/\/player\.twitch\.tv\//);
  site.context.toggleTwitchChat();
  assert.match(chat.getAttribute('src'), /^https:\/\/www\.twitch\.tv\/embed\//);
  site.clickTab('gear');
  assert.equal(player.getAttribute('src'), 'about:blank');
  assert.equal(chat.getAttribute('src'), 'about:blank');
});

test('malformed and blocked storage do not prevent startup or preferences', async () => {
  for (const options of [
    { storage: { dalines_lang: 'invalid', dalines_theme: 'invalid', dalines_liked_clips: '{broken' } },
    { storage: { dalines_liked_clips: 'null' } },
    { blockStorage: true }
  ]) {
    const site = await createSite(options);
    site.clickTab('stream');
    assert.ok(site.document.getElementById('clips-grid').children.length > 0);
    site.context.setTheme('cyan');
    assert.equal(site.document.documentElement.dataset.theme, 'cyan');
    site.context.setLanguage('en');
    assert.equal(site.document.documentElement.lang, 'en');
  }
});

test('clipboard denial reports failure and legacy fallback reports success only when it copies', async () => {
  const denied = async () => { throw new Error('Permission denied'); };
  const site = await createSite({ clipboard: denied });
  assert.equal(await site.context.copyTextToClipboard('DaLines', 'Copied successfully'), false);
  assert.match(site.document.getElementById('toast').textContent, /ไม่สำเร็จ|failed/i);
  assert.doesNotMatch(site.document.getElementById('toast').textContent, /Copied successfully/);
  const fallback = await createSite({ clipboard: denied, legacyClipboard: true });
  assert.equal(await fallback.context.copyTextToClipboard('DaLines', 'Copied successfully'), true);
  assert.equal(fallback.document.getElementById('toast').textContent, 'Copied successfully');
});

test('canvas draws with the current theme, pauses while hidden and respects reduced motion', async () => {
  const site = await createSite();
  site.context.setTheme('purple');
  assert.doesNotThrow(() => site.frame());
  assert.ok(site.canvasCalls.some(([key, value]) => key === 'fillStyle' && String(value).includes('168, 85, 247')));
  site.setHidden(true);
  assert.equal(site.frames.size, 0);
  site.setHidden(false);
  assert.ok(site.frames.size > 0);
  const quiet = await createSite({ reducedMotion: true });
  // The hero needs one static render; reduced motion must not sustain a loop.
  quiet.frame();
  assert.equal(quiet.frames.size, 0);
});

test('offline and DecAPI errors never advertise a live stream', async () => {
  for (const uptime of ['dalines is offline', 'User not found', 'Too many requests', 'Error: rate limit']) {
    const site = await createSite({ uptime });
    assert.equal(site.evaluate('currentLiveState'), false);
    assert.doesNotMatch(site.document.getElementById('live-text-badge').textContent, /LIVE NOW/);
    assert.doesNotMatch(site.document.getElementById('hero-live-text').textContent, /LIVE ON TWITCH/);
  }
  const live = await createSite({ uptime: '1 hour, 23 minutes' });
  assert.equal(live.evaluate('currentLiveState'), true);
  assert.match(live.document.getElementById('live-text-badge').textContent, /LIVE NOW/);
  assert.match(live.document.getElementById('hero-live-text').textContent, /LIVE ON TWITCH|กำลังสตรีมสด/);
});

test('status requests stop while hidden or offline and cannot overlap', async () => {
  const site = await createSite();
  const initial = site.requests.length;
  site.setHidden(true);
  await site.context.checkTwitchLiveStatus();
  assert.equal(site.requests.length, initial);
  site.setHidden(false);
  site.context.navigator.onLine = false;
  await site.context.checkTwitchLiveStatus();
  assert.equal(site.requests.length, initial);

  const pending = await createSite({ fetch: () => new Promise(() => {}) });
  assert.equal(pending.requests.length, 2);
  await pending.context.checkTwitchLiveStatus();
  assert.equal(pending.requests.length, 2);
});

test('PeerJS loads only after an explicit OBS connection request', async () => {
  const site = await createSite();
  site.clickTab('rules');
  assert.equal(site.document.querySelectorAll('script[src*="peerjs"]').length, 0);
  site.context.handleConnectObsClick();
  const scripts = site.document.querySelectorAll('script[src*="peerjs"]');
  assert.equal(scripts.length, 1);
  scripts[0].onerror();
  await settle();
  assert.equal(site.document.getElementById('obs-sync-status-text').textContent, 'OFFLINE');
});

test('stream schedule uses Bangkok time across days and the weekly break', async () => {
  const site = await createSite();
  const next = site.evaluate(`getNextStreamStart(Date.parse('2026-11-15T12:00:00Z'))`);
  assert.equal(new Date(next.target).toISOString(), '2026-11-16T13:00:00.000Z');
  assert.equal(next.schedule.day, 1);
});


test('OBS sound names remain inert text and sound commands preserve their IDs', async () => {
  const site = await createSite();
  site.clickTab('rules');
  const name = `<img src=x onerror="alert(1)"> &quot; ' \\`;
  const id = `');alert(1);//`;
  const commands = [];
  site.context.recordObsCommand = command => commands.push(command);
  site.evaluate('isObsConnected = true; obsConn = { open: true, send: recordObsCommand };');
  site.context.renderObsCustomSounds([{ id, name }, null, { name: 'Missing ID' }]);
  const grid = site.document.getElementById('obs-custom-sounds-grid');
  assert.equal(grid.children.length, 1);
  assert.equal(grid.querySelector('img'), null);
  assert.equal(grid.querySelector('button').getAttribute('onclick'), null);
  assert.equal(grid.querySelector('span').textContent, name);
  grid.querySelector('button').click();
  assert.equal(commands.length, 1);
  assert.equal(commands[0].action, 'play_sound');
  assert.equal(commands[0].soundId, id);
  assert.equal(commands[0].soundName, name);
});

test('helper dialog traps keyboard focus and Escape returns it to the opener', async () => {
  const site = await createSite();
  site.clickTab('rules');
  const opener = site.document.querySelector('[onclick="openTtsHelperModal()"]');
  opener.focus();
  site.context.openTtsHelperModal();
  const modal = site.document.getElementById('modal-tts-helper');
  assert.equal(modal.getAttribute('role'), 'dialog');
  assert.equal(modal.getAttribute('aria-hidden'), 'false');
  const controls = [...modal.querySelectorAll('button, a[href], input, select, textarea, iframe, [tabindex="0"]')];
  assert.equal(site.document.activeElement, controls[0]);
  controls.at(-1).focus();
  const tab = new site.context.Event('keydown', { bubbles: true, cancelable: true });
  tab.key = 'Tab';
  site.document.dispatchEvent(tab);
  assert.equal(site.document.activeElement, controls[0]);
  const escape = new site.context.Event('keydown', { bubbles: true, cancelable: true });
  escape.key = 'Escape';
  site.document.dispatchEvent(escape);
  assert.equal(modal.getAttribute('aria-hidden'), 'true');
  assert.equal(site.document.activeElement, opener);
});


test('hash links restore the selected tab and browser navigation keeps it in sync', async () => {
  const site = await createSite({ hash: '#gear' });
  assertSelected(site, 'gear');
  assert.ok(site.document.getElementById('sens-results-grid').children.length > 0);
  site.clickTab('rules');
  assert.equal(site.context.location.hash, '#rules');
  site.setHash('#pc');
  assertSelected(site, 'pc');
  site.context.switchTab('unknown-tab');
  assertSelected(site, 'links');
});

test('master volume controls mute, persist, restore and update their labels', async () => {
  const site = await createSite();
  site.context.onVolumeSliderInput('35');
  assert.equal(site.evaluate('masterVolume'), .35);
  assert.equal(site.storage.get('dalines_master_volume'), '0.35');
  assert.equal(site.document.getElementById('volume-badge-text').textContent, '35%');
  site.context.setQuickVolume(0);
  assert.equal(site.evaluate('isSoundEnabled'), false);
  assert.equal(site.document.getElementById('volume-badge-text').textContent, '0%');
  site.context.setQuickVolume(80);
  assert.equal(site.evaluate('masterVolume'), .8);
  assert.equal(site.evaluate('isSoundEnabled'), true);
  site.context.toggleVolumeDropdown();
  assert.equal(site.document.getElementById('volume-dropdown-panel').classList.contains('hidden'), false);
  site.context.closeVolumeDropdown();
  assert.equal(site.document.getElementById('volume-dropdown-panel').classList.contains('hidden'), true);
  const restored = await createSite({ storage: { dalines_sound: 'true', dalines_master_volume: '0.35' } });
  assert.equal(restored.document.getElementById('volume-badge-text').textContent, '35%');
});

test('the five-tap gold theme unlock and an existing unlock both survive startup', async () => {
  const site = await createSite();
  const avatar = site.document.getElementById('profile-img');
  for (let i = 0; i < 5; i++) avatar.click();
  assert.equal(site.storage.get('dalines_unlocked_gold'), 'true');
  assert.equal(site.document.documentElement.dataset.theme, 'gold');
  assert.equal(site.document.getElementById('theme-dot-gold').classList.contains('hidden'), false);
  const restored = await createSite({ storage: { dalines_unlocked_gold: 'true', dalines_theme: 'gold' } });
  assert.equal(restored.document.documentElement.dataset.theme, 'gold');
  assert.equal(restored.document.getElementById('theme-dot-gold').classList.contains('hidden'), false);
});

test('aim challenge records hits, misses, accuracy and a high score', async () => {
  const site = await createSite();
  site.clickTab('gear');
  site.context.setAimMode('challenge');
  assert.equal(site.document.getElementById('challenge-start-card').classList.contains('hidden'), false);
  site.context.runAimChallengeGame();
  assert.equal(site.evaluate('isChallengeRunning'), true);
  assert.equal(site.document.getElementById('challenge-target').classList.contains('hidden'), false);
  site.context.hitChallengeTarget({ clientX: 200, clientY: 150, stopPropagation() {} });
  site.context.handleStageClick({ clientX: 100, clientY: 100 });
  assert.equal(site.document.getElementById('challenge-score-text').textContent, '1');
  assert.equal(site.document.getElementById('challenge-acc-text').textContent, '50%');
  site.context.endAimChallenge();
  assert.equal(site.evaluate('isChallengeRunning'), false);
  assert.equal(site.storage.get('dalines_aim_highscore'), '1');
  assert.equal(site.document.getElementById('aim-result-score').textContent, '1');
  assert.equal(site.document.getElementById('modal-aim-result').classList.contains('hidden'), false);
  site.context.closeAimResultModal();
  site.context.setAimMode('free');
  assert.equal(site.document.getElementById('free-mode-bg').classList.contains('hidden'), false);
});

test('Valorant tracker refresh and viewer search retain rank rendering and reset', async () => {
  const site = await createSite({ fetch: async url => {
    if (!String(url).includes('/api/valorant')) return new Response('dalines is offline');
    const data = String(url).includes('name=')
      ? { riotId: 'Viewer#123', region: 'ap', currentTier: 'Radiant', currentRR: 88 }
      : { currentTier: 'Ascendant 2', currentRR: 53, stats: { kd: '1.32' } };
    return new Response(JSON.stringify({ status: 'success', data }), { headers: { 'content-type': 'application/json' } });
  } });
  site.clickTab('gear');
  await site.context.refreshValorantTracker();
  assert.equal(site.document.getElementById('tracker-rank-title').textContent, 'ASCENDANT 2');
  assert.equal(site.document.getElementById('tracker-rr-current').textContent, '53');
  assert.equal(site.document.getElementById('tracker-stat-kd').textContent, '1.32');
  assert.ok(site.storage.has('dalines_val_tracker_cache_v2'));
  site.document.getElementById('val-search-input').value = 'Viewer#123';
  await site.context.searchValorantPlayer();
  assert.equal(site.document.getElementById('val-viewer-name').textContent, 'Viewer#123');
  assert.equal(site.document.getElementById('tracker-rank-title').textContent, 'RADIANT');
  assert.equal(site.document.getElementById('btn-val-search').disabled, false);
  site.context.resetToStreamerProfile();
  assert.equal(site.document.getElementById('val-viewer-banner').classList.contains('hidden'), true);
  assert.equal(site.document.getElementById('tracker-rank-title').textContent, 'ASCENDANT 2');
});

test('hero stages, video controls and the latest copy actions remain functional', async () => {
  const copied = [];
  const site = await createSite({ clipboard: async text => copied.push(text) });
  for (const [progress, stage] of [[0, 1], [.45, 2], [.9, 3]]) {
    site.context.renderHeroStages(progress);
    assert.equal(site.document.getElementById('hero-hud-stage-badge').textContent, `STAGE ${stage}/3`);
    assert.equal(site.document.getElementById(`hero-stage-${stage}`).style.pointerEvents, 'auto');
    for (const inactive of [1, 2, 3].filter(value => value !== stage)) assert.equal(site.document.getElementById(`hero-stage-${inactive}`).getAttribute('aria-hidden'), 'true');
  }
  const video = site.document.getElementById('hero-dance-video');
  site.context.setHeroAutoDance(true);
  assert.equal(video.paused, false);
  site.context.setHeroAutoDance(false);
  assert.equal(video.paused, true);
  site.context.toggleHeroDanceAudio();
  assert.equal(video.muted, false);
  site.context.toggleHeroDanceAudio();
  assert.equal(video.muted, true);
  await site.context.copyHeroBusinessEmail();
  await site.context.copyValorantCrosshairHero();
  await site.context.copyProSettingsSummary();
  await site.context.copyBankAccount();
  await settle();
  assert.ok(copied.some(text => text.includes('@')));
  assert.ok(copied.some(text => text.startsWith('0;P;')));
  assert.ok(copied.some(text => text.includes('DaLines Pro Settings')));
  assert.ok(copied.some(text => /^\d{10}$/.test(text)));
  const panel = site.document.getElementById('obs-panel-wrapper');
  site.context.toggleObsStreamerPanel();
  assert.equal(panel.classList.contains('hidden'), false);
  site.context.toggleObsStreamerPanel();
  assert.equal(panel.classList.contains('hidden'), true);
  site.context.setHeroAutoDance(true);
  site.setHidden(true);
  assert.equal(video.paused, true);
  assert.equal(site.frames.size, 0);
  site.setHidden(false);
  assert.equal(video.paused, false);
});

test('an initial stream deep link preserves the click-to-play facade', async () => {
  const site = await createSite({ hash: '#stream' });
  assertSelected(site, 'stream');
  const player = site.document.getElementById('twitch-main-player');
  assert.ok(!player.getAttribute('src') || player.getAttribute('src') === 'about:blank');
  site.context.loadTwitchPlayer('trailer');
  assert.match(player.getAttribute('src'), /^https:\/\/player\.twitch\.tv\//);
});

test('aim countdowns and running games stop when leaving the panel or hiding the page', async () => {
  const site = await createSite();
  site.clickTab('gear');
  site.context.setAimMode('challenge');
  site.context.startAimChallenge();
  const countdownTimer = site.evaluate('challengeCountdownTimer');
  assert.ok(site.timers.has(countdownTimer));
  site.clickTab('links');
  assert.equal(site.timers.has(countdownTimer), false);
  assert.equal(site.document.getElementById('challenge-countdown-overlay').classList.contains('hidden'), true);
  assert.equal(site.evaluate('isChallengeRunning'), false);
  site.clickTab('gear');
  site.context.runAimChallengeGame();
  assert.equal(site.evaluate('isChallengeRunning'), true);
  site.setHidden(true);
  assert.equal(site.evaluate('isChallengeRunning'), false);
  assert.equal(site.document.getElementById('challenge-target').classList.contains('hidden'), true);
});
