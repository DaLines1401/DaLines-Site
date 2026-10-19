/**
 * DaLines Showcase V2 - 15-Second Electronic Cyber Soundtrack Synthesizer
 * Pure Node.js (No external dependencies)
 * Generates 44.1kHz 16-Bit Stereo Master Audio File (audio.wav)
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const DURATION = 15.0; // 15 seconds strictly
const NUM_CHANNELS = 2; // Stereo
const TOTAL_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

console.log('========================================================');
console.log('  DALINES SHOWCASE V2 // ELECTRONIC AUDIO SYNTHESIZER   ');
console.log('========================================================');
console.log(`- Sample Rate : ${SAMPLE_RATE} Hz`);
console.log(`- Channels    : ${NUM_CHANNELS} (Stereo)`);
console.log(`- Duration    : ${DURATION}s (${TOTAL_SAMPLES} samples/channel)`);
console.log('--------------------------------------------------------');

// Audio Buffers (Float64 for high dynamic precision mixing)
const leftChannel = new Float64Array(TOTAL_SAMPLES);
const rightChannel = new Float64Array(TOTAL_SAMPLES);

// Mathematical / Synthesizer Helpers
const TWO_PI = Math.PI * 2;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ADSR Envelope generator
function adsr(t, a, d, s, r, dur) {
  if (t < 0 || t > dur) return 0;
  if (t < a) return a > 0 ? t / a : 1;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur - r) return s;
  return s * (1 - (t - (dur - r)) / r);
}

// Sound Synthesis Instruments
function addKick(startTime, duration = 0.45, punchFreq = 160, endFreq = 38, vol = 0.85) {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const totalKickSamples = Math.floor(duration * SAMPLE_RATE);
  
  for (let i = 0; i < totalKickSamples; i++) {
    const idx = startSample + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    // Pitch sweep (exponential decay)
    const freq = endFreq + (punchFreq - endFreq) * Math.exp(-progress * 22);
    const phase = TWO_PI * freq * t;
    
    // Body wave (sine + slight soft-clip saturation)
    let sample = Math.sin(phase);
    // Transient click at the beginning
    if (t < 0.015) {
      sample += (Math.random() * 2 - 1) * Math.exp(-t * 250) * 0.4;
    }
    sample = Math.tanh(sample * 1.4); // Analog warmth saturation

    const amp = Math.exp(-progress * 5.5) * vol;
    leftChannel[idx] += sample * amp;
    rightChannel[idx] += sample * amp;
  }
}

function addSnare(startTime, duration = 0.35, vol = 0.65) {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const totalSnareSamples = Math.floor(duration * SAMPLE_RATE);

  for (let i = 0; i < totalSnareSamples; i++) {
    const idx = startSample + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    // Tonal body (180Hz dropping to 120Hz)
    const bodyFreq = 180 * Math.exp(-progress * 15);
    const body = Math.sin(TWO_PI * bodyFreq * t) * Math.exp(-progress * 18) * 0.5;

    // Noise snap (snare wires)
    const noise = (Math.random() * 2 - 1) * Math.exp(-progress * 11) * 0.8;
    const sample = (body + noise) * vol;

    // Slight stereo widening for snare
    leftChannel[idx] += sample * 0.95;
    rightChannel[idx] += sample * 1.05;
  }
}

function addHiHat(startTime, duration = 0.08, vol = 0.25, isOpen = false, pan = 0.0) {
  const dur = isOpen ? duration * 3.5 : duration;
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const totalHatSamples = Math.floor(dur * SAMPLE_RATE);

  for (let i = 0; i < totalHatSamples; i++) {
    const idx = startSample + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const progress = t / dur;

    // High frequency filtered metallic noise
    const noise = (Math.random() * 2 - 1);
    const ring = Math.sin(TWO_PI * 7800 * t) * 0.3 + Math.sin(TWO_PI * 10200 * t) * 0.2;
    const sample = (noise * 0.8 + ring) * Math.exp(-progress * (isOpen ? 12 : 35)) * vol;

    leftChannel[idx] += sample * (0.5 - pan * 0.4);
    rightChannel[idx] += sample * (0.5 + pan * 0.4);
  }
}

function addSynthNote(startTime, dur, freq, type = 'saw', vol = 0.3, pan = 0.0) {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const totalSamples = Math.floor(dur * SAMPLE_RATE);

  for (let i = 0; i < totalSamples; i++) {
    const idx = startSample + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const p = t * freq;

    let raw = 0;
    if (type === 'saw') {
      // Sawtooth with anti-aliased soft slope
      raw = 2 * (p - Math.floor(p + 0.5));
    } else if (type === 'square') {
      raw = Math.sin(TWO_PI * p) >= 0 ? 0.85 : -0.85;
    } else {
      raw = Math.sin(TWO_PI * p);
    }

    const env = adsr(t, 0.015, 0.08, 0.65, 0.08, dur);
    const sample = raw * env * vol;

    leftChannel[idx] += sample * (0.5 - pan * 0.35);
    rightChannel[idx] += sample * (0.5 + pan * 0.35);
  }
}

function addRiser(startTime, duration, startFreq = 100, endFreq = 2400, vol = 0.35) {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const totalSamples = Math.floor(duration * SAMPLE_RATE);

  for (let i = 0; i < totalSamples; i++) {
    const idx = startSample + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    // Exponential frequency rise
    const freq = startFreq * Math.pow(endFreq / startFreq, progress);
    const phase = TWO_PI * freq * t;
    const saw = 2 * ((phase / TWO_PI) - Math.floor((phase / TWO_PI) + 0.5));
    const noise = (Math.random() * 2 - 1) * 0.4;

    // Volume swells up
    const amp = Math.pow(progress, 1.8) * vol;
    const sample = (saw * 0.6 + noise) * amp;

    leftChannel[idx] += sample * (1 - progress * 0.3);
    rightChannel[idx] += sample * (0.7 + progress * 0.3);
  }
}

function addSubDrop(startTime, duration = 1.2, vol = 0.9) {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const totalSamples = Math.floor(duration * SAMPLE_RATE);

  for (let i = 0; i < totalSamples; i++) {
    const idx = startSample + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    const freq = 120 * Math.exp(-progress * 6) + 32;
    const sample = Math.sin(TWO_PI * freq * t) * Math.exp(-progress * 3.5) * vol;

    leftChannel[idx] += sample;
    rightChannel[idx] += sample;
  }
}

// ----------------------------------------------------
// COMPOSITION TIMELINE (15.0 SECONDS @ 130 BPM)
// ----------------------------------------------------
const BPM = 130;
const BEAT = 60 / BPM; // ~0.4615s
const SIXTEENTH = BEAT / 4; // ~0.1154s

console.log('[1/3] Generating electronic composition layers...');

// ====================================================
// ACT 1: HERO (0.0s - 3.0s)
// ====================================================
// 0.0s Opening Impact
addKick(0.0, 0.8, 220, 32, 1.0);
addSubDrop(0.0, 2.0, 0.85);

// Arpeggio notes (D Minor: D3=146.8, F3=174.6, A3=220, C4=261.6, D4=293.7)
const arpNotes = [146.83, 174.61, 220.00, 261.63, 293.66, 261.63, 220.00, 174.61];
for (let t = 0.46; t < 2.5; t += SIXTEENTH) {
  const noteIdx = Math.floor((t - 0.46) / SIXTEENTH) % arpNotes.length;
  const pan = Math.sin((t - 0.46) * 12) * 0.5;
  addSynthNote(t, SIXTEENTH * 1.2, arpNotes[noteIdx], 'saw', 0.22, pan);
}

// Steady ticking hats in intro
for (let t = 0.46; t < 2.5; t += SIXTEENTH * 2) {
  addHiHat(t, 0.06, 0.2, false, 0.2);
}

// Tension Riser into 3.0s drop
addRiser(1.8, 1.05, 120, 3200, 0.45);

// ====================================================
// ACT 2: BATTLESTATION RIG (3.0s - 7.0s)
// ====================================================
// 3.0s Hard Drop
addKick(3.0, 0.6, 200, 42, 1.0);
addSubDrop(3.0, 1.5, 0.85);
addSnare(3.0, 0.4, 0.8);

// Driving 4-on-the-floor beat with syncopated snares & hihats
for (let t = 3.0; t < 6.8; t += BEAT) {
  addKick(t, 0.45, 180, 45, 0.9);
  addHiHat(t + SIXTEENTH * 2, 0.12, 0.35, true, -0.3); // Offbeat open hat
}
for (let t = 3.0 + BEAT; t < 6.8; t += BEAT * 2) {
  addSnare(t, 0.35, 0.75);
}
for (let t = 3.0; t < 6.8; t += SIXTEENTH) {
  addHiHat(t, 0.05, 0.18, false, 0.3);
}

// Industrial Saw Bassline (Driving root notes D2=73.4, F2=87.3, G2=98.0)
const bassPattern = [
  { t: 3.0, dur: BEAT * 0.8, freq: 73.4 },
  { t: 3.0 + BEAT, dur: BEAT * 0.8, freq: 73.4 },
  { t: 3.0 + BEAT * 2, dur: BEAT * 0.8, freq: 87.3 },
  { t: 3.0 + BEAT * 3, dur: BEAT * 0.8, freq: 98.0 },
  { t: 4.85, dur: BEAT * 0.8, freq: 73.4 },
  { t: 4.85 + BEAT, dur: BEAT * 0.8, freq: 73.4 },
  { t: 4.85 + BEAT * 2, dur: BEAT * 0.8, freq: 65.4 },
  { t: 4.85 + BEAT * 3, dur: BEAT * 0.8, freq: 73.4 }
];
bassPattern.forEach(b => {
  addSynthNote(b.t, b.dur, b.freq, 'saw', 0.45, 0.0);
  addSynthNote(b.t, b.dur, b.freq * 2, 'square', 0.18, 0.2); // Mid bite
});

// Build-up Riser into Act 3
addRiser(5.9, 0.95, 200, 3600, 0.4);

// ====================================================
// ACT 3: TACTICAL REALMS (7.0s - 11.0s)
// ====================================================
// 7.0s Second Impact Drop
addKick(7.0, 0.65, 240, 38, 1.0);
addSubDrop(7.0, 1.8, 0.9);
addSnare(7.0, 0.4, 0.85);

// Aggressive Electro Groove
for (let t = 7.0; t < 10.8; t += BEAT) {
  addKick(t, 0.4, 180, 48, 0.9);
  addHiHat(t + SIXTEENTH * 2, 0.1, 0.35, true, 0.4);
}
for (let t = 7.0 + BEAT; t < 10.8; t += BEAT * 2) {
  addSnare(t, 0.38, 0.8);
}
for (let t = 7.0; t < 10.8; t += SIXTEENTH) {
  addHiHat(t, 0.04, 0.22, false, -0.3);
}

// Dynamic Title Accents:
// 7.2s PoE 2 Laser / Chord Stab
addSynthNote(7.2, 0.4, 174.6, 'saw', 0.5, -0.4); // F3
addSynthNote(7.2, 0.4, 261.6, 'saw', 0.4, 0.4);  // C4
addSynthNote(7.2, 0.4, 349.2, 'square', 0.35, 0.0); // F4

// 8.5s Valorant Tactical Gunshot / Sharp Ping
addKick(8.5, 0.3, 350, 60, 0.9);
addSynthNote(8.5, 0.35, 293.7, 'square', 0.5, 0.3); // D4
addSynthNote(8.5, 0.35, 440.0, 'saw', 0.4, -0.3); // A4

// 9.8s Apex High Velocity Overdrive Whoosh
addRiser(9.6, 0.4, 400, 2800, 0.5);
addSynthNote(9.8, 0.5, 392.0, 'saw', 0.55, 0.0); // G4
addSynthNote(9.8, 0.5, 587.3, 'saw', 0.45, 0.4); // D5

// Build-up Riser into Outro
addRiser(10.0, 0.9, 300, 4200, 0.5);

// ====================================================
// ACT 4: OUTRO & RESOLUTION (11.0s - 15.0s)
// ====================================================
// 11.0s Final Grand Impact
addKick(11.0, 0.7, 220, 36, 1.0);
addSubDrop(11.0, 2.5, 0.95);
addSnare(11.0, 0.45, 0.9);

// Resolving Anthem Chords (D Minor -> Bb Major -> C Major -> D Minor)
const chords = [
  { t: 11.0, dur: 0.85, notes: [146.8, 220.0, 293.7, 349.2] }, // Dm
  { t: 11.9, dur: 0.85, notes: [116.5, 174.6, 233.1, 293.7] }, // Bb
  { t: 12.8, dur: 0.85, notes: [130.8, 196.0, 261.6, 329.6] }, // C
  { t: 13.7, dur: 1.25, notes: [146.8, 220.0, 293.7, 440.0] }  // Dm wide
];

chords.forEach(c => {
  c.notes.forEach((freq, idx) => {
    const pan = (idx % 2 === 0 ? -1 : 1) * 0.4;
    addSynthNote(c.t, c.dur, freq, 'saw', 0.28, pan);
    addSynthNote(c.t, c.dur, freq * 1.004, 'saw', 0.18, -pan); // Detune chorus
  });
});

// Groove continues until 13.6s
for (let t = 11.0; t < 13.5; t += BEAT) {
  addKick(t, 0.4, 170, 45, 0.85);
  addHiHat(t + SIXTEENTH * 2, 0.1, 0.28, true, 0.2);
}
for (let t = 11.0 + BEAT; t < 13.5; t += BEAT * 2) {
  addSnare(t, 0.35, 0.75);
}

// 13.7s - 15.0s Ambient Reverb Tail & Smooth Fade Out
console.log('[2/3] Applying master dynamics limiter & stereo smoothing...');

// Master Limiter & Normalization
let maxPeak = 0.0001;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  // Fade out smoothly in last 0.8s
  const t = i / SAMPLE_RATE;
  if (t > 14.2) {
    const fade = Math.cos(((t - 14.2) / 0.8) * (Math.PI / 2));
    leftChannel[i] *= fade;
    rightChannel[i] *= fade;
  }

  // Soft clip limiter (Math.tanh) to prevent digital harsh distortion
  leftChannel[i] = Math.tanh(leftChannel[i] * 1.15);
  rightChannel[i] = Math.tanh(rightChannel[i] * 1.15);

  const absL = Math.abs(leftChannel[i]);
  const absR = Math.abs(rightChannel[i]);
  if (absL > maxPeak) maxPeak = absL;
  if (absR > maxPeak) maxPeak = absR;
}

// Normalize to -0.3 dB (~0.965)
const targetPeak = 0.965;
const gain = targetPeak / maxPeak;
console.log(`- Peak before gain: ${(maxPeak).toFixed(3)}, applying gain: ${(gain).toFixed(3)}`);

// Convert Float64 to 16-Bit Integer PCM Buffer
const pcmBytes = TOTAL_SAMPLES * NUM_CHANNELS * 2;
const pcmBuffer = Buffer.alloc(pcmBytes);

let byteOffset = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const lSample = clamp(Math.round(leftChannel[i] * gain * 32767), -32768, 32767);
  const rSample = clamp(Math.round(rightChannel[i] * gain * 32767), -32768, 32767);

  pcmBuffer.writeInt16LE(lSample, byteOffset);
  byteOffset += 2;
  pcmBuffer.writeInt16LE(rSample, byteOffset);
  byteOffset += 2;
}

// Write Standard RIFF WAV File
console.log('[3/3] Writing audio.wav file...');
const wavHeader = Buffer.alloc(44);

// "RIFF"
wavHeader.write('RIFF', 0);
wavHeader.writeUInt32LE(36 + pcmBytes, 4);
// "WAVE"
wavHeader.write('WAVE', 8);
// "fmt "
wavHeader.write('fmt ', 12);
wavHeader.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
wavHeader.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
wavHeader.writeUInt16LE(NUM_CHANNELS, 22);
wavHeader.writeUInt32LE(SAMPLE_RATE, 24);
wavHeader.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * 2, 28); // ByteRate
wavHeader.writeUInt16LE(NUM_CHANNELS * 2, 32); // BlockAlign
wavHeader.writeUInt16LE(16, 34); // BitsPerSample
// "data"
wavHeader.write('data', 36);
wavHeader.writeUInt32LE(pcmBytes, 40);

const finalWavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
const outputPath = path.resolve(__dirname, 'audio.wav');
fs.writeFileSync(outputPath, finalWavBuffer);

const fileSizeMb = (finalWavBuffer.length / (1024 * 1024)).toFixed(2);
console.log(`\n>> Synthesized: ${outputPath} (${fileSizeMb} MB, 15.00s Studio Stereo WAV)`);
console.log('Audio synthesis successfully completed!\n');
