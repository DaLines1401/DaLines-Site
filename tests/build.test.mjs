import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
try { await access(path.join(output, 'index.html')); }
catch { throw new Error('Build artifacts are missing. Run npm run build before npm test.'); }
const html = await readFile(path.join(output, 'index.html'), 'utf8');
const { document } = parseHTML(html);
async function listFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(path.join(directory, entry.name), name + '/'));
    else files.push(name);
  }
  return files;
}
const files = await listFiles(output);
const localResource = value => value && !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value);


test('deployment contains only public assets and excludes source, tooling and private files', () => {
  const allowedRoot = new Set(['index.html', 'manifest.json', 'robots.txt', 'sitemap.xml', '_headers', 'Logo.png', 'banner-480.png', 'qr-donate.png']);
  for (const filename of files) {
    assert.ok(allowedRoot.has(filename)
      || /^google[a-zA-Z0-9]+\.html$/.test(filename)
      || /^assets\/[a-z]+\.[a-f0-9]{12}\.(?:js|css|webp)$/.test(filename)
      || /^icons\/icon-(?:32|180|192|512|maskable-512)\.png$/.test(filename),
    `Unexpected file in deployment: ${filename}`);
  }
  assert.ok(!files.some(filename => /(?:^|\/)(?:node_modules|tests|scripts|\.git|\.env)(?:\/|$)|\.(?:ps1|bat|mjs|map)$|package(?:-lock)?\.json$|README/i.test(filename)));
});

test('every local page resource exists and fingerprinted assets match their content', async () => {
  const references = [
    ...[...document.querySelectorAll('[src]')].map(element => element.getAttribute('src')),
    ...[...document.querySelectorAll('link[href], a[download]')].map(element => element.getAttribute('href'))
  ].filter(localResource);
  assert.ok(references.length > 5);
  for (const reference of references) {
    const filename = decodeURIComponent(reference.split(/[?#]/)[0]).replace(/^\//, '');
    const resolved = path.resolve(output, filename);
    assert.ok(resolved.startsWith(output + path.sep), `Resource escapes deployment: ${reference}`);
    await assert.doesNotReject(access(resolved), `Missing local resource: ${reference}`);
  }
  for (const filename of files.filter(name => name.startsWith('assets/'))) {
    const hash = createHash('sha256').update(await readFile(path.join(output, filename))).digest('hex').slice(0, 12);
    assert.equal(filename.split('.')[1], hash, `Stale fingerprint: ${filename}`);
  }
});

test('production JavaScript is local and deferred, parses, and retains inline event handlers', async () => {
  const scripts = [...document.querySelectorAll('script[src]')];
  assert.equal(scripts.length, 2);
  const definedFunctions = new Set();
  for (const script of scripts) {
    assert.ok(localResource(script.getAttribute('src')), 'Third-party JavaScript must load on demand');
    assert.ok(script.hasAttribute('defer'), 'Main scripts must not block HTML parsing');
    assert.doesNotMatch(script.getAttribute('src'), /tailwind|peerjs|cdn\./i);
    const js = await readFile(path.join(output, script.getAttribute('src')), 'utf8');
    assert.doesNotThrow(() => new vm.Script(js), 'Generated JavaScript must parse');
    for (const match of js.matchAll(/\bfunction\s+([\w$]+)\s*\(/g)) definedFunctions.add(match[1]);
  }
  const handlerNames = [...document.querySelectorAll('[onclick], [oninput], [onchange]')].flatMap(element =>
    ['onclick', 'oninput', 'onchange'].flatMap(attribute => [...(element.getAttribute(attribute) || '').matchAll(/(?<![.\w])([A-Za-z_$]\w*)\s*\(/g)].map(match => match[1])));
  assert.ok(handlerNames.length > 30);
  for (const name of new Set(handlerNames)) assert.ok(definedFunctions.has(name), `Generated scripts lost global handler: ${name}`);
  for (const frame of document.querySelectorAll('iframe')) {
    assert.ok(!frame.getAttribute('src') || frame.getAttribute('src') === 'about:blank', 'Embeds must stay idle before interaction');
  }
});

test('compiled CSS includes dynamic feature styles and motion/focus accessibility', async () => {
  const stylesheet = [...document.querySelectorAll('link[rel="stylesheet"]')].find(element => localResource(element.getAttribute('href')));
  assert.ok(stylesheet);
  const css = await readFile(path.join(output, stylesheet.getAttribute('href')), 'utf8');
  for (const selector of [
    '.hover\\:border-cyan-500\\/50:hover',
    '.bg-pink-500\\/20',
    '.group:hover .group-hover\\:drop-shadow-\\[0_0_8px_rgba\\(168\\,85\\,247\\,0\\.6\\)\\]',
    '.page-hidden',
    ':focus-visible',
    'prefers-reduced-motion'
  ]) assert.ok(css.includes(selector), `Missing production CSS for ${selector}`);
});

test('optimized hero images preserve dimensions while reducing download size', async () => {
  for (const [source, prefix] of [['banner-480.png', 'banner'], ['Logo.png', 'avatar']]) {
    const original = await readFile(path.join(root, source));
    const filename = files.find(name => name.startsWith(`assets/${prefix}.`) && name.endsWith('.webp'));
    assert.ok(filename, `Missing optimized ${prefix}`);
    const optimized = await readFile(path.join(output, filename));
    const before = await sharp(original).metadata();
    const after = await sharp(optimized).metadata();
    assert.equal(after.width, before.width);
    assert.equal(after.height, before.height);
    assert.ok(optimized.length < original.length * .5, `${prefix} should be at least 50% smaller`);
    const image = document.querySelector(`img[src="${filename}"]`);
    assert.ok(image, `Page must use optimized ${prefix}`);
    assert.ok(image.hasAttribute('width') && image.hasAttribute('height'), 'Images need reserved layout dimensions');
  }
});

test('manifest icons have valid dimensions and cache rules match versioned assets', async () => {
  const manifest = JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8'));
  assert.equal(manifest.start_url, '/');
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    const [width, height] = icon.sizes.split('x').map(Number);
    const actual = await sharp(path.join(output, icon.src)).metadata();
    assert.equal(actual.width, width, `Incorrect width for ${icon.src}`);
    assert.equal(actual.height, height, `Incorrect height for ${icon.src}`);
    assert.equal(actual.format, 'png');
  }
  const headers = await readFile(path.join(output, '_headers'), 'utf8');
  assert.match(headers, /\/assets\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
  assert.match(headers, /\/index\.html\s+Cache-Control: public, max-age=0, must-revalidate/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
});
