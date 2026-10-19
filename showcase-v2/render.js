/**
 * DaLines Showcase V2 - Automated 15s Frame Renderer & Video Assembler
 * 1920x1080 @ 60 FPS (900 Frames) + Synthesized Audio Multiplexing
 * 
 * Usage:
 *   node render.js
 *   node render.js --test          (Captures 60 frames for quick validation)
 *   node render.js --skip-frames   (Re-encodes existing frames with FFmpeg)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const puppeteer = require('../showcase/node_modules/puppeteer');

// Parse CLI Flags
const args = process.argv.slice(2);
const isTest = args.includes('--test');
const skipFrames = args.includes('--skip-frames');

const FPS = 60;
const DURATION = 15.0; // 15.0 Seconds Strictly
const TOTAL_FRAMES = isTest ? 60 : Math.round(DURATION * FPS); // 900 Frames in full mode

let startFrame = 0;
let endFrame = TOTAL_FRAMES;

args.forEach(arg => {
  if (arg.startsWith('--start=')) startFrame = parseInt(arg.split('=')[1], 10);
  if (arg.startsWith('--end=')) endFrame = parseInt(arg.split('=')[1], 10);
});

const FRAMES_DIR = path.resolve(__dirname, 'frames');
const HTML_FILE = path.resolve(__dirname, 'index.html');
const AUDIO_FILE = path.resolve(__dirname, 'audio.wav');
const OUTPUT_VIDEO = path.resolve(__dirname, 'dalines_showcase_15s.mp4');

// Locate FFmpeg binary (from showcase/node_modules/ffmpeg-static)
let ffmpegPath = path.resolve(__dirname, '../showcase/node_modules/ffmpeg-static/ffmpeg.exe');
if (!fs.existsSync(ffmpegPath)) {
  try {
    const ffmpegStatic = require('../showcase/node_modules/ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      ffmpegPath = ffmpegStatic;
    }
  } catch (e) { }
}

async function main() {
  console.log('====================================================');
  console.log('  DALINES SHOWCASE V2 // 15s BRUTALIST MOTION RENDER');
  console.log('====================================================');
  console.log(`- Resolution   : 1920 x 1080`);
  console.log(`- Frame Rate   : ${FPS} FPS`);
  console.log(`- Duration     : ${DURATION}s (${TOTAL_FRAMES} frames)`);
  console.log(`- Frame Range  : ${startFrame} to ${endFrame - 1}`);
  console.log(`- Audio Track  : ${fs.existsSync(AUDIO_FILE) ? 'audio.wav (Found)' : 'Synthesizing...'}`);
  console.log(`- FFmpeg Exec  : ${ffmpegPath}`);
  console.log(`- Output MP4   : ${OUTPUT_VIDEO}`);
  console.log('----------------------------------------------------');

  // Step 1: Ensure audio file exists
  if (!fs.existsSync(AUDIO_FILE)) {
    console.log('[1/4] Audio not found, synthesizing electronic soundtrack...');
    require('./synth_audio.js');
  } else {
    console.log('[1/4] Audio track verified: audio.wav');
  }

  // Ensure frames directory exists
  if (!fs.existsSync(FRAMES_DIR)) {
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
  }

  // Step 2: Capture Frames if not skipping
  if (!skipFrames) {
    console.log('[2/4] Launching headless browser with WebGL...');

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

    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    console.log(`- Loading HTML: ${HTML_FILE}...`);
    const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Wait for application ready signal
    await page.waitForFunction(() => window.__READY__ === true, { timeout: 15000 });

    // Hide preview controller and force exact 1:1 stage
    await page.evaluate(() => {
      const ctrl = document.getElementById('preview-controller');
      if (ctrl) ctrl.classList.add('recording-mode');

      const stage = document.getElementById('stage');
      if (stage) {
        stage.style.transform = 'scale(1)';
        stage.style.top = '0';
        stage.style.left = '0';
      }
    });

    // Pre-warm WebGL
    await page.evaluate(() => window.renderFrame(0));
    await new Promise(r => setTimeout(r, 600));

    const stageHandle = await page.$('#stage');
    if (!stageHandle) {
      throw new Error('Could not find #stage element in page');
    }

    console.log('[3/4] Rendering & capturing 900 frames deterministically...');
    const startTime = Date.now();

    for (let frame = startFrame; frame < endFrame; frame++) {
      const timestamp = frame / FPS;

      // Sync Three.js & GSAP to timestamp
      await page.evaluate((t) => window.renderFrame(t), timestamp);

      const frameIndexStr = String(frame + 1).padStart(4, '0');
      const outputPath = path.join(FRAMES_DIR, `frame_${frameIndexStr}.png`);

      await stageHandle.screenshot({
        path: outputPath,
        type: 'png',
        omitBackground: false
      });

      if (frame % 25 === 0 || frame === endFrame - 1) {
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
    console.log(`\n\n- Completed frame rendering in ${totalElapsed}s!`);
    await browser.close();
  } else {
    console.log('[2/4] Skipped frame capture (--skip-frames flag detected).');
  }

  // Step 4: Multiplex Video + Audio using FFmpeg
  console.log('[4/4] Encoding high-quality MP4 video with FFmpeg...');
  if (!fs.existsSync(ffmpegPath)) {
    console.error('[ERROR] FFmpeg binary not found at:', ffmpegPath);
    process.exit(1);
  }

  const framePattern = path.join(FRAMES_DIR, 'frame_%04d.png');
  const ffmpegArgs = [
    '-y',
    '-r', String(FPS),
    '-i', framePattern,
    '-i', AUDIO_FILE,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-shortest',
    OUTPUT_VIDEO
  ];

  console.log(`- Running: "${ffmpegPath}" ${ffmpegArgs.join(' ')}`);
  const ffmpegRun = spawnSync(ffmpegPath, ffmpegArgs, { stdio: 'inherit' });

  if (ffmpegRun.error || ffmpegRun.status !== 0) {
    console.error('\n[ERROR in FFmpeg execution]:', ffmpegRun.error || `Exit code ${ffmpegRun.status}`);
    process.exit(1);
  }

  if (fs.existsSync(OUTPUT_VIDEO)) {
    const stats = fs.statSync(OUTPUT_VIDEO);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log('====================================================');
    console.log('  SUCCESSFULLY DELIVERED 15s MP4 VIDEO!             ');
    console.log('====================================================');
    console.log(`- File Path : ${OUTPUT_VIDEO}`);
    console.log(`- File Size : ${sizeMb} MB`);
    console.log(`- Specs     : 1920x1080 @ 60 FPS, 15.00s Duration, Stereo Audio`);
    console.log('----------------------------------------------------');
  } else {
    console.error('[ERROR] Output MP4 file was not created!');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n[FATAL ERROR in render.js]:', err);
  process.exit(1);
});
