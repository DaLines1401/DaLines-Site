import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await build({ entryPoints: [new URL('../src/app.js', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')], bundle: true, format: 'iife', platform: 'browser', target: 'chrome140', outfile: new URL('../dist/app.js', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), minify: true, legalComments: 'eof' });
for (const name of ['index.html', 'style.css']) await copyFile(new URL(`../src/${name}`, import.meta.url), new URL(`../dist/${name}`, import.meta.url));
await copyFile(new URL('../assets/logo.png', import.meta.url), new URL('../dist/logo.png', import.meta.url));
console.log('Built offline desktop UI.');
