/**
 * DaLines Showcase - Puppeteer Deterministic Frame Renderer
 * Target: 1920x1080 @ 60 FPS, 12.0 Seconds (720 Frames)
 * 
 * Usage:
 *   node render.js
 *   node render.js --test      (Captures first 30 frames for testing)
 *   node render.js --start=0 --end=720
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Parse CLI flags
const args = process.argv.slice(2);
const isTest = args.includes('--test');

const FPS = 60;
const DURATION = 12.0; // seconds
const TOTAL_FRAMES = isTest ? 30 : Math.round(DURATION * FPS); // 720 frames

let startFrame = 0;
let endFrame = TOTAL_FRAMES;

args.forEach(arg => {
  if (arg.startsWith('--start=')) startFrame = parseInt(arg.split('=')[1], 10);
  if (arg.startsWith('--end=')) endFrame = parseInt(arg.split('=')[1], 10);
});

const FRAMES_DIR = path.resolve(__dirname, 'frames');
const HTML_FILE = path.resolve(__dirname, 'index.html');

async function main() {
  console.log('====================================================');
  console.log('  DALINES SHOWCASE // BRUTALIST MOTION RENDERER     ');
  console.log('====================================================');
  console.log(`- Resolution   : 1920 x 1080`);
  console.log(`- Frame Rate   : ${FPS} FPS`);
  console.log(`- Duration     : ${DURATION}s (${TOTAL_FRAMES} frames)`);
  console.log(`- Frame Range  : ${startFrame} to ${endFrame - 1}`);
  console.log(`- Output Dir   : ${FRAMES_DIR}`);
  console.log(`- Mode         : ${isTest ? 'TEST (30 frames)' : 'FULL PRODUCTION'}`);
  console.log('----------------------------------------------------');

  // Ensure frames directory exists
  if (!fs.existsSync(FRAMES_DIR)) {
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
  }

  console.log('[1/4] Launching headless browser with WebGL...');

  // Auto-detect system Chrome/Edge if available
  const browserCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  let systemExecutable = null;
  for (const cand of browserCandidates) {
    if (fs.existsSync(cand)) {
      systemExecutable = cand;
      break;
    }
  }

  const launchOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--window-size=1920,1080'
    ]
  };

  if (systemExecutable) {
    launchOptions.executablePath = systemExecutable;
    console.log(`- Using Browser: ${systemExecutable}`);
  }

  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();

  // Set precise 1080p viewport
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1
  });

  // Enable recording mode inside page before load
  await page.evaluateOnNewDocument(() => {
    window.__IS_RECORDING__ = true;
  });

  console.log(`[2/4] Loading showcase HTML: ${HTML_FILE}...`);
  const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Wait for application ready flag
  await page.waitForFunction(() => window.__READY__ === true, { timeout: 15000 });

  // Hide preview controls and force stage layout
  await page.evaluate(() => {
    const ctrl = document.getElementById('preview-controller');
    if (ctrl) ctrl.classList.add('recording-mode');
    
    const stage = document.getElementById('stage');
    if (stage) {
      stage.style.transform = 'none';
      stage.style.top = '0';
      stage.style.left = '0';
    }
  });

  // Pre-warm WebGL by rendering initial frame
  await page.evaluate(() => window.renderFrame(0));
  await new Promise(r => setTimeout(r, 600));

  const stageHandle = await page.$('#stage');
  if (!stageHandle) {
    throw new Error('Could not find #stage element');
  }

  console.log('[3/4] Rendering & capturing frames deterministically...');
  const startTime = Date.now();

  for (let frame = startFrame; frame < endFrame; frame++) {
    const timestamp = frame / FPS;
    
    // Seek to exact timestamp and render Three.js + GSAP synchronously
    await page.evaluate((t) => window.renderFrame(t), timestamp);

    // Save frame screenshot
    const frameIndexStr = String(frame + 1).padStart(4, '0');
    const outputPath = path.join(FRAMES_DIR, `frame_${frameIndexStr}.png`);

    await stageHandle.screenshot({
      path: outputPath,
      type: 'png',
      omitBackground: false
    });

    // Console progress bar
    if (frame % 15 === 0 || frame === endFrame - 1) {
      const currentProcessed = frame - startFrame + 1;
      const totalToProcess = endFrame - startFrame;
      const percent = ((currentProcessed / totalToProcess) * 100).toFixed(1);
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      const avgPerFrame = (Date.now() - startTime) / currentProcessed;
      const etaSec = (((totalToProcess - currentProcessed) * avgPerFrame) / 1000).toFixed(1);

      process.stdout.write(`\r  >> [Frame ${frameIndexStr}/${String(endFrame).padStart(4, '0')}] ${percent}% | Time: ${timestamp.toFixed(2)}s | Elapsed: ${elapsedSec}s | ETA: ${etaSec}s`);
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n[4/4] Completed frame generation in ${totalElapsed}s!`);
  await browser.close();

  console.log('----------------------------------------------------');
  console.log('To encode frames into high-quality MP4 video, run:');
  console.log('');
  console.log('ffmpeg -r 60 -i frames/frame_%04d.png -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p dalines_showcase.mp4');
  console.log('----------------------------------------------------');
}

main().catch(err => {
  console.error('\n[ERROR in render.js]:', err);
  process.exit(1);
});
