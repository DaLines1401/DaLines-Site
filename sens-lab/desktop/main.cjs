const { app, BrowserWindow, ipcMain, dialog, protocol, net, Menu, clipboard, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { DiscordPresence } = require('./discord.cjs');
const { resolveStorageLayout, importPortableData } = require('./storage.cjs');
const inputTest = process.argv.includes('--input-test');
const selfTest = process.argv.includes('--self-test') || inputTest;
const storageLayout = resolveStorageLayout({
  isPackaged: app.isPackaged,
  selfTest,
  execPath: process.execPath,
  projectRoot: path.join(__dirname, '..'),
  appDataPath: app.getPath('appData')
});
const base = storageLayout.base;
const discord = new DiscordPresence();
app.setAppUserModelId('com.dalines.senslab');
app.setPath('userData', storageLayout.userDataDir);
app.setPath('sessionData', app.getPath('userData'));
app.setPath('crashDumps', path.join(app.getPath('userData'), 'crashes'));
app.setAppLogsPath(path.join(app.getPath('userData'), 'logs'));
const records = path.join(app.getPath('userData'), 'records');
let writeQueue = Promise.resolve();
async function readJSON(filename, fallback) {
  try { return JSON.parse(await fs.readFile(path.join(records, filename), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw new Error('อ่านไฟล์บันทึกไม่สำเร็จ กรุณาสำรองโฟลเดอร์ data ก่อนแก้ไข: ' + error.message); }
}
function atomicJSON(filename, data) {
  const job = writeQueue.catch(() => {}).then(async () => {
    const file = path.join(records, filename);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file + '.tmp', JSON.stringify(data), 'utf8');
    await fs.rename(file + '.tmp', file);
    return true;
  });
  writeQueue = job;
  return job;
}
protocol.registerSchemesAsPrivileged([{ scheme: 'senslab', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
let win;
app.whenReady().then(async () => {
  protocol.handle('senslab', (request) => {
    const url = new URL(request.url);
    const allowed = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/app.js', 'app.js'], ['/style.css', 'style.css'], ['/logo.png', 'logo.png']]);
    if (url.host !== 'app' || !allowed.has(url.pathname)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(path.join(__dirname, '../dist', allowed.get(url.pathname))).href);
  });
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1440, height: 960, minWidth: 1050, minHeight: 740,
    title: 'DaLines Sens Lab', backgroundColor: '#101412', show: !selfTest || inputTest,
    icon: path.join(__dirname, '../assets/app.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, additionalArguments: selfTest ? ['--senslab-qa'] : [] }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (url !== 'senslab://app/') event.preventDefault(); });
  win.webContents.session.setPermissionRequestHandler((contents, permission, callback) => callback(contents === win.webContents && ['pointerLock', 'fullscreen'].includes(permission)));
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') { event.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    if ((input.control || input.meta) && ['+', '-', '=', '0'].includes(input.key)) event.preventDefault();
  });
  ipcMain.handle('fullscreen', (event) => { if (event.sender !== win.webContents) return; win.setFullScreen(!win.isFullScreen()); return win.isFullScreen(); });
  const fromApp = event => event.sender === win.webContents && event.senderFrame.url.startsWith('senslab://app/');
  ipcMain.handle('discord-presence', (event, enabled) => {
    if (!fromApp(event) || typeof enabled !== 'boolean') throw new Error('Invalid Discord setting');
    if (!selfTest) discord.setEnabled(enabled);
    return selfTest ? 'disabled' : discord.status;
  });
  ipcMain.handle('load-state', event => { if (!fromApp(event)) throw new Error('Invalid sender'); return readJSON('workspace.json', null); });
  ipcMain.handle('copy-sens', (event, text) => {
    if (!fromApp(event) || typeof text !== 'string' || !/^\d{1,6}\.\d{1,8}$/.test(text) || Number(text) <= 0) throw new Error('Invalid sensitivity');
    clipboard.writeText(text);
    return true;
  });
  ipcMain.handle('save-state', (event, data) => {
    if (!fromApp(event) || !data || typeof data !== 'object' || JSON.stringify(data).length > 8_000_000) throw new Error('Invalid state');
    return atomicJSON('workspace.json', data);
  });
  ipcMain.handle('save-session', (event, data) => {
    if (!fromApp(event) || !data || !/^[a-zA-Z0-9-]{1,80}$/.test(data.id) || JSON.stringify(data).length > 5_000_000) throw new Error('Invalid session');
    return atomicJSON(`sessions/${data.id}.json`, data);
  });
  ipcMain.handle('read-session', (event, id) => {
    if (!fromApp(event) || typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw new Error('Invalid session ID');
    return readJSON(`sessions/${id}.json`, null);
  });
  ipcMain.handle('export-results', async (event, data) => {
    if (event.sender !== win.webContents || typeof data !== 'string' || data.length > 8_000_000) return false;
    try { JSON.parse(data); } catch { return false; }
    const result = await dialog.showSaveDialog(win, { title: 'Export Sens Lab results', defaultPath: path.join(base, `sens-lab-${new Date().toISOString().slice(0, 10)}.json`), filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (result.canceled) return false;
    await fs.writeFile(result.filePath, data, 'utf8');
    return true;
  });
  ipcMain.handle('storage-info', event => {
    if (!fromApp(event)) throw new Error('Invalid sender');
    return { mode: storageLayout.mode, recordsDir: records, version: app.getVersion() };
  });
  ipcMain.handle('open-data-folder', async event => {
    if (!fromApp(event)) throw new Error('Invalid sender');
    await fs.mkdir(records, { recursive: true });
    const err = await shell.openPath(records);
    if (err) throw new Error(err);
    return true;
  });
  ipcMain.handle('import-portable-data', async event => {
    if (!fromApp(event)) throw new Error('Invalid sender');
    const picked = await dialog.showOpenDialog(win, {
      title: 'เลือกโฟลเดอร์รุ่น Portable เดิม หรือโฟลเดอร์ data',
      properties: ['openDirectory']
    });
    if (picked.canceled || !picked.filePaths[0]) return { canceled: true };
    let result;
    await (writeQueue = writeQueue.catch(() => {}).then(async () => {
      result = await importPortableData(picked.filePaths[0], records);
    }));
    return result;
  });
  if (selfTest) {
    const errors = [];
    win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
    win.webContents.on('render-process-gone', (_event, details) => errors.push(JSON.stringify(details)));
    const timer = setTimeout(() => { console.error('Desktop self-test timed out'); app.exit(1); }, 30000);
    await win.loadURL('senslab://app/');
    try {
      const report = await win.webContents.executeJavaScript('window.sensLabReady.then(() => window.sensLabQA.run())');
      if (inputTest) {
        win.show(); win.focus(); win.webContents.focus();
        report.input = await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))).then(() => window.sensLabQA.input())', true);
      }
      await fs.mkdir(path.join(base, 'qa-output'), { recursive: true });
      await fs.writeFile(path.join(base, 'qa-output/desktop.png'), (await win.webContents.capturePage()).toPNG());
      report.previews = [];
      for (const variant of ['complete', 'quick', 'tied', 'edge', 'stopped', 'practice']) {
        report.previews.push(await win.webContents.executeJavaScript(`window.sensLabQA.preview(${JSON.stringify(variant)})`));
        await fs.writeFile(path.join(base, `qa-output/results-${variant}.png`), (await win.webContents.capturePage()).toPNG());
      }
      win.setSize(1050, 740);
      report.previews.push(await win.webContents.executeJavaScript('window.sensLabQA.preview("complete")'));
      await fs.writeFile(path.join(base, 'qa-output/results-small-window.png'), (await win.webContents.capturePage()).toPNG());
      win.setSize(1440, 960);
      await win.webContents.executeJavaScript('window.sensLabQA.preview("complete").then(() => { document.querySelector(".candidate-grid").scrollIntoView({ block: "start" }); return new Promise(resolve => setTimeout(resolve, 180)); })');
      await fs.writeFile(path.join(base, 'qa-output/results-comparison.png'), (await win.webContents.capturePage()).toPNG());
      await fs.writeFile(path.join(base, 'qa-output/report.json'), JSON.stringify({ ...report, errors }, null, 2));
      console.log(JSON.stringify({ ...report, errors }));
      clearTimeout(timer);
      app.exit(report.ok && !errors.length ? 0 : 1);
    } catch (error) { console.error(error); clearTimeout(timer); app.exit(1); }
  } else await win.loadURL('senslab://app/');
});
app.on('window-all-closed', () => app.quit());
let closing = false;
app.on('before-quit', event => {
  discord.disconnect();
  if (closing || selfTest) return;
  event.preventDefault();
  closing = true;
  writeQueue.catch(() => {}).then(() => app.quit());
});
