import { cp, mkdir, copyFile, rename, writeFile, readFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const electronRoot = path.dirname(require.resolve('electron/package.json'));
const output = path.join(root, 'release', 'DaLines-Sens-Lab');
for (const privateDirectory of ['data', 'qa-output', '.local-data']) {
  let exists = false;
  try { await access(path.join(output, privateDirectory)); exists = true; } catch { /* Absent is expected. */ }
  if (exists) throw new Error(`Refusing to package a folder containing ${privateDirectory}. Keep your data and choose a clean output folder first.`);
}
await mkdir(output, { recursive: true });
await cp(path.join(electronRoot, 'dist'), output, { recursive: true });
await rename(path.join(output, 'electron.exe'), path.join(output, 'DaLines Sens Lab.exe'));
const appDir = path.join(output, 'resources', 'app');
await mkdir(appDir, { recursive: true });
await cp(path.join(root, 'dist'), path.join(appDir, 'dist'), { recursive: true });
await cp(path.join(root, 'desktop'), path.join(appDir, 'desktop'), { recursive: true });
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
await writeFile(path.join(appDir, 'package.json'), JSON.stringify({ name: pkg.name, productName: pkg.productName, version: pkg.version, main: pkg.main }));
await copyFile(path.join(root, 'README.md'), path.join(output, 'อ่านก่อนใช้.md'));
const threePackage = path.dirname(require.resolve('three'));
await copyFile(path.join(threePackage, '..', 'LICENSE'), path.join(output, 'THREE-LICENSE.txt'));
console.log(`Portable Windows app: ${output}\nOpen DaLines Sens Lab.exe; keep the complete folder together.`);
