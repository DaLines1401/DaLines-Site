import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { transform } from 'esbuild';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
// Only write or clean inside the dedicated generated directory.
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'dist') throw new Error('Invalid output directory');
await fs.mkdir(path.join(output, 'assets'), { recursive: true });
const generatedFiles = new Set();
function generated(filename) { generatedFiles.add(filename); return path.join(output, filename); }

async function asset(name, contents) {
  const bytes = Buffer.from(contents);
  const ext = path.extname(name);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const filename = `assets/${path.basename(name, ext)}.${hash}${ext}`;
  await fs.writeFile(generated(filename), bytes);
  return filename;
}

execFileSync(process.execPath, [path.join(root, 'node_modules/tailwindcss/lib/cli.js'), '-i', 'assets/tailwind.css', '-o', 'dist/tailwind.css', '--minify'], { cwd: root, stdio: 'inherit' });
const utilities = await fs.readFile(path.join(output, 'tailwind.css'), 'utf8');
const custom = await fs.readFile(path.join(root, 'assets/custom.css'), 'utf8');
const css = await transform(`${utilities}\n${custom}`, { loader: 'css', minify: true });
const cssPath = await asset('site.css', css.code);
await fs.unlink(path.join(output, 'tailwind.css'));

let html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
html = html.replace('assets/site.css', cssPath);
for (const name of ['app', 'effects', 'hero']) {
  const js = await fs.readFile(path.join(root, `assets/${name}.js`), 'utf8');
  // Classic scripts keep their global handlers for the existing HTML controls.
  const result = await transform(js, { loader: 'js', minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false, target: 'es2020', legalComments: 'none' });
  html = html.replace(`assets/${name}.js`, await asset(`${name}.js`, result.code));
}

const imageSizes = {};
for (const [source, target, options] of [
  ['banner-480.png', 'banner.webp', { quality: 82, effort: 5 }],
  ['Logo.png', 'avatar.webp', { quality: 85, effort: 5 }]
]) {
  const original = await fs.readFile(path.join(root, source));
  const bytes = await sharp(original).webp(options).toBuffer();
  const assetPath = await asset(target, bytes);
  html = html.replaceAll(`src="${source}"`, `src="${assetPath}"`);
  imageSizes[source] = { original: original.length, optimized: bytes.length };
}

const logo = await fs.readFile(path.join(root, 'Logo.png'));
await fs.mkdir(path.join(output, 'icons'), { recursive: true });
for (const size of [32, 180, 192, 512]) {
  await sharp(logo).resize(size, size).png({ compressionLevel: 9 }).toFile(generated(`icons/icon-${size}.png`));
}
// Maskable icons need an opaque safe zone around the full artwork.
await sharp(logo).resize(300, 300).extend({ top: 106, bottom: 106, left: 106, right: 106, background: '#06080c' }).png().toFile(generated('icons/icon-maskable-512.png'));

// Publish an explicit allowlist; source, tests, scripts and Git files stay private.
for (const filename of ['Logo.png', 'banner-480.png', 'qr-donate.png', 'manifest.json', 'robots.txt', 'sitemap.xml', '_headers', 'party.html', 'tts.html', 'spookydance.mp4']) {
  await fs.copyFile(path.join(root, filename), generated(filename));
}
for (const filename of await fs.readdir(root)) {
  if (/^google[a-zA-Z0-9]+\.html$/.test(filename)) await fs.copyFile(path.join(root, filename), generated(filename));
}
// Retain published companion experiences, including their media, without shipping
// source projects, rendered frame folders, Node scripts or package metadata.
const companionFiles = {
  dance: /^(?:index\.html|Logo\.png|spookydance\.mp4|assets\/[\w.-]+\.(?:js|css|png|svg|webp|woff2|mp4))$/,
  story: /^index\.html$/,
  showcase: /^index\.html$/,
  'showcase-v2': /^(?:index\.html|audio\.wav|dalines_showcase_15s\.mp4)$/
};
async function copyCompanion(directory, pattern, relative = '') {
  for (const entry of await fs.readdir(path.join(root, directory, relative), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Unexpected source link: ${directory}/${relative}${entry.name}`);
    const name = relative + entry.name;
    if (entry.isDirectory()) {
      if (name === 'assets') await copyCompanion(directory, pattern, name + '/');
    } else if (pattern.test(name)) {
      const filename = `${directory}/${name}`;
      await fs.mkdir(path.dirname(path.join(output, filename)), { recursive: true });
      await fs.copyFile(path.join(root, filename), generated(filename));
    }
  }
}
for (const [directory, pattern] of Object.entries(companionFiles)) await copyCompanion(directory, pattern);
await fs.writeFile(generated('index.html'), html.replace(/<!--(?!\[if)[\s\S]*?-->/g, '').replace(/\n\s*\n/g, '\n'));
// Keep directories in place on Windows, where a live preview can hold directory
// handles. Remove obsolete files only after the new page is complete.
async function cleanFiles(directory = output, prefix = '') {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Unexpected link in dist: ${filename}`);
    if (entry.isDirectory()) {
      if (!['assets', 'icons', 'dance', 'dance/assets', 'story', 'showcase', 'showcase-v2'].includes(filename)) throw new Error(`Unexpected directory in dist: ${filename}`);
      await cleanFiles(path.join(directory, entry.name), filename + '/');
    } else if (!generatedFiles.has(filename)) {
      await fs.unlink(path.join(directory, entry.name));
    }
  }
}
await cleanFiles();
console.log('Built dist/ with fingerprinted CSS/JS and optimized images.');
console.log(JSON.stringify({ imageSizes }, null, 2));
