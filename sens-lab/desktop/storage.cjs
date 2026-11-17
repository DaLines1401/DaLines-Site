const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');

const SESSION_ID_RE = /^[a-zA-Z0-9-]{1,80}$/;

function isProtectedInstallDir(dir) {
  const normalized = path.resolve(dir).toLowerCase();
  return normalized.includes('\\windowsapps\\') ||
    normalized.endsWith('\\windowsapps') ||
    normalized.includes('\\program files\\') ||
    normalized.includes('\\program files (x86)\\');
}

function defaultWritableCheck(dir) {
  if (isProtectedInstallDir(dir)) return false;
  const probe = path.join(dir, `.senslab-write-probe-${process.pid}-${Date.now()}`);
  try {
    fs.writeFileSync(probe, 'ok', 'utf8');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function resolveStorageLayout({
  isPackaged,
  selfTest = false,
  execPath = process.execPath,
  projectRoot = path.join(__dirname, '..'),
  appDataPath = '',
  windowsStore = Boolean(process.windowsStore),
  isWritable = defaultWritableCheck
}) {
  const base = isPackaged ? path.dirname(execPath) : projectRoot;
  if (selfTest) {
    return { mode: 'qa', base, userDataDir: path.join(base, 'qa-output', 'profile') };
  }
  if (!isPackaged) {
    return { mode: 'dev', base, userDataDir: path.join(projectRoot, '.local-data') };
  }
  const appDataDir = path.join(appDataPath || base, 'DaLines Sens Lab', 'data');
  if (windowsStore) {
    return { mode: 'store', base, userDataDir: appDataDir };
  }
  if (isWritable(base)) {
    return { mode: 'portable', base, userDataDir: path.join(base, 'data') };
  }
  return { mode: 'appdata', base, userDataDir: appDataDir };
}

async function resolveSourceRecordsDir(sourceDir) {
  const candidates = [
    path.join(sourceDir, 'data', 'records'),
    path.join(sourceDir, 'records'),
    sourceDir
  ];
  for (const dir of candidates) {
    try {
      await fsp.access(path.join(dir, 'workspace.json'));
      return dir;
    } catch {
      // Try next layout candidate.
    }
  }
  throw new Error('ไม่พบไฟล์ workspace.json ในโฟลเดอร์ที่เลือก (เลือกโฟลเดอร์หลักของรุ่น Portable หรือโฟลเดอร์ data)');
}

async function atomicWriteJSON(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data), 'utf8');
  await fsp.rename(tmp, file);
}

async function importPortableData(sourceDir, targetRecordsDir) {
  const srcRecords = await resolveSourceRecordsDir(sourceDir);
  if (path.resolve(srcRecords) === path.resolve(targetRecordsDir)) {
    throw new Error('โฟลเดอร์ที่เลือกเป็นตำแหน่งข้อมูลปัจจุบันอยู่แล้ว');
  }
  let srcWorkspace;
  try {
    srcWorkspace = JSON.parse(await fsp.readFile(path.join(srcRecords, 'workspace.json'), 'utf8'));
  } catch (error) {
    throw new Error(`อ่าน workspace.json ไม่สำเร็จ: ${error.message}`);
  }
  if (!srcWorkspace || srcWorkspace.version !== 1 || !Array.isArray(srcWorkspace.history) || !srcWorkspace.settings) {
    throw new Error('รูปแบบไฟล์ workspace.json ไม่ถูกต้อง');
  }

  let targetWorkspace = null;
  try {
    targetWorkspace = JSON.parse(await fsp.readFile(path.join(targetRecordsDir, 'workspace.json'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`อ่านข้อมูลปลายทางไม่สำเร็จ: ${error.message}`);
  }

  const targetSessionsDir = path.join(targetRecordsDir, 'sessions');
  await fsp.mkdir(targetSessionsDir, { recursive: true });

  let importedSessions = 0;
  const srcSessionsDir = path.join(srcRecords, 'sessions');
  let sessionFiles = [];
  try {
    sessionFiles = await fsp.readdir(srcSessionsDir);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  for (const file of sessionFiles) {
    if (!file.endsWith('.json')) continue;
    const id = file.slice(0, -5);
    if (!SESSION_ID_RE.test(id)) continue;
    const destFile = path.join(targetSessionsDir, `${id}.json`);
    let exists = false;
    try { await fsp.access(destFile); exists = true; } catch { /* Absent is expected. */ }
    if (exists) continue;
    const raw = await fsp.readFile(path.join(srcSessionsDir, file), 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.id !== id) continue;
    await atomicWriteJSON(destFile, parsed);
    importedSessions++;
  }

  const mergedMap = new Map();
  for (const entry of [...(targetWorkspace?.history || []), ...srcWorkspace.history]) {
    if (entry && typeof entry.id === 'string' && SESSION_ID_RE.test(entry.id) && !mergedMap.has(entry.id)) {
      mergedMap.set(entry.id, entry);
    }
  }
  const mergedHistory = [...mergedMap.values()]
    .sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime())
    .slice(0, 300);

  const adoptedSettings = !targetWorkspace;
  const nextWorkspace = {
    version: 1,
    settings: targetWorkspace?.settings || srcWorkspace.settings,
    draft: targetWorkspace?.draft || null,
    history: mergedHistory
  };
  await atomicWriteJSON(path.join(targetRecordsDir, 'workspace.json'), nextWorkspace);

  return {
    ok: true,
    importedSessions,
    totalHistory: mergedHistory.length,
    adoptedSettings,
    workspace: nextWorkspace
  };
}

module.exports = {
  isProtectedInstallDir,
  resolveStorageLayout,
  resolveSourceRecordsDir,
  importPortableData
};
