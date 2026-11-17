import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { resolveStorageLayout, importPortableData, isProtectedInstallDir } = require('../desktop/storage.cjs');

test('resolveStorageLayout preserves portable, dev, qa and uses AppData for Store/protected installs', () => {
  const appData = 'C:\\Users\\Test\\AppData\\Roaming';
  const portable = resolveStorageLayout({
    isPackaged: true,
    selfTest: false,
    execPath: 'D:\\Games\\SensLab\\DaLines Sens Lab.exe',
    appDataPath: appData,
    windowsStore: false,
    isWritable: () => true
  });
  assert.equal(portable.mode, 'portable');
  assert.equal(portable.userDataDir, path.join('D:\\Games\\SensLab', 'data'));

  const store = resolveStorageLayout({
    isPackaged: true,
    selfTest: false,
    execPath: 'C:\\Program Files\\WindowsApps\\DaLines.SensLab_0.2.2.0_x64__abc\\DaLines Sens Lab.exe',
    appDataPath: appData,
    windowsStore: true,
    isWritable: () => true
  });
  assert.equal(store.mode, 'store');
  assert.equal(store.userDataDir, path.join(appData, 'DaLines Sens Lab', 'data'));

  const fallback = resolveStorageLayout({
    isPackaged: true,
    selfTest: false,
    execPath: 'C:\\Program Files\\DaLines Sens Lab\\DaLines Sens Lab.exe',
    appDataPath: appData,
    windowsStore: false,
    isWritable: () => false
  });
  assert.equal(fallback.mode, 'appdata');
  assert.equal(fallback.userDataDir, path.join(appData, 'DaLines Sens Lab', 'data'));

  const dev = resolveStorageLayout({
    isPackaged: false,
    selfTest: false,
    projectRoot: 'C:\\repo\\sens-lab',
    appDataPath: appData
  });
  assert.equal(dev.mode, 'dev');
  assert.equal(dev.userDataDir, path.join('C:\\repo\\sens-lab', '.local-data'));

  assert.equal(isProtectedInstallDir('C:\\Program Files\\WindowsApps\\App'), true);
  assert.equal(isProtectedInstallDir('C:\\Users\\User\\Downloads\\SensLab'), false);
});

test('importPortableData safely copies sessions and merges history without modifying source', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'senslab-migrate-'));
  try {
    const srcRoot = path.join(tmp, 'old-portable');
    const srcRecords = path.join(srcRoot, 'data', 'records');
    const srcSessions = path.join(srcRecords, 'sessions');
    await fs.mkdir(srcSessions, { recursive: true });

    const oldSession = { id: 'sess-old-1', kind: 'finder', config: { game: 'valorant', dpi: 800, sens: 0.35 }, runs: [], startedAt: '2026-11-10T10:00:00.000Z', status: 'complete' };
    await fs.writeFile(path.join(srcSessions, 'sess-old-1.json'), JSON.stringify(oldSession), 'utf8');
    await fs.writeFile(path.join(srcRecords, 'workspace.json'), JSON.stringify({
      version: 1,
      settings: { game: 'valorant', dpi: 1600, sens: 0.2 },
      draft: null,
      history: [{ id: 'sess-old-1', kind: 'finder', game: 'valorant', dpi: 800, startedAt: '2026-11-10T10:00:00.000Z', status: 'complete', rounds: 24, bestSens: 0.35 }]
    }), 'utf8');

    const targetRecords = path.join(tmp, 'store-appdata', 'data', 'records');
    await fs.mkdir(path.join(targetRecords, 'sessions'), { recursive: true });
    await fs.writeFile(path.join(targetRecords, 'workspace.json'), JSON.stringify({
      version: 1,
      settings: { game: 'cs2', dpi: 800, sens: 1.1 },
      draft: null,
      history: [{ id: 'sess-new-1', kind: 'practice', game: 'cs2', dpi: 800, startedAt: '2026-11-17T10:00:00.000Z', status: 'practice', rounds: 1, bestSens: null }]
    }), 'utf8');

    const res = await importPortableData(srcRoot, targetRecords);
    assert.equal(res.ok, true);
    assert.equal(res.importedSessions, 1);
    assert.equal(res.totalHistory, 2);
    assert.equal(res.adoptedSettings, false);

    const merged = JSON.parse(await fs.readFile(path.join(targetRecords, 'workspace.json'), 'utf8'));
    assert.equal(merged.settings.game, 'cs2');
    assert.deepEqual(merged.history.map(h => h.id), ['sess-new-1', 'sess-old-1']);

    const copiedSession = JSON.parse(await fs.readFile(path.join(targetRecords, 'sessions', 'sess-old-1.json'), 'utf8'));
    assert.equal(copiedSession.id, 'sess-old-1');

    // Source files remain untouched.
    const srcCheck = JSON.parse(await fs.readFile(path.join(srcRecords, 'workspace.json'), 'utf8'));
    assert.equal(srcCheck.history.length, 1);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
