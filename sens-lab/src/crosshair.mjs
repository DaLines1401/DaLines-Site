import { clamp } from './core.mjs';

export const VALORANT_COLORS = Object.freeze({
  0: '#ffffff',
  1: '#00ff00',
  2: '#dfff00',
  3: '#c4f16a',
  4: '#ffff00',
  5: '#00ffff',
  6: '#ff66ff',
  7: '#ff4655'
});

export const DEFAULT_CROSSHAIR = Object.freeze({
  crosshairColor: '#eef3ee',
  innerLength: 6,
  innerThickness: 2,
  innerOffset: 4,
  innerOpacity: 1,
  outlines: true,
  crosshairDot: true,
  dotSize: 2
});

export function sizeToCrosshair(size = 'medium') {
  if (size === 'small') return { innerLength: 4, innerThickness: 2, innerOffset: 3 };
  if (size === 'large') return { innerLength: 9, innerThickness: 2, innerOffset: 5 };
  return { innerLength: 6, innerThickness: 2, innerOffset: 4 };
}

export function normalizeCrosshair(config = {}) {
  const legacy = sizeToCrosshair(config.crosshairSize);
  return {
    crosshairColor: /^#[0-9a-fA-F]{6}$/.test(config.crosshairColor || '') ? config.crosshairColor : DEFAULT_CROSSHAIR.crosshairColor,
    innerLength: Number.isFinite(Number(config.innerLength)) ? clamp(Math.round(Number(config.innerLength)), 0, 20) : legacy.innerLength,
    innerThickness: Number.isFinite(Number(config.innerThickness)) ? clamp(Math.round(Number(config.innerThickness)), 1, 8) : legacy.innerThickness,
    innerOffset: Number.isFinite(Number(config.innerOffset)) ? clamp(Math.round(Number(config.innerOffset)), 0, 16) : legacy.innerOffset,
    innerOpacity: Number.isFinite(Number(config.innerOpacity)) ? clamp(Number(config.innerOpacity), 0.1, 1) : DEFAULT_CROSSHAIR.innerOpacity,
    outlines: typeof config.outlines === 'boolean' ? config.outlines : DEFAULT_CROSSHAIR.outlines,
    crosshairDot: typeof config.crosshairDot === 'boolean' ? config.crosshairDot : DEFAULT_CROSSHAIR.crosshairDot,
    dotSize: Number.isFinite(Number(config.dotSize)) ? clamp(Math.round(Number(config.dotSize)), 1, 6) : DEFAULT_CROSSHAIR.dotSize
  };
}

/**
 * Parse a Valorant-compatible numeric crosshair profile code (Primary section `P`).
 * Accepts codes starting with `0;P;...` or `0;s;1;P;...` or plain `c;5;0l;4;0o;2`.
 */
export function parseValorantCrosshairCode(raw) {
  if (typeof raw !== 'string') throw new Error('กรุณาวางโค้ดเป้าเล็งที่เป็นข้อความ');
  const trimmed = raw.trim();
  if (!trimmed || !trimmed.includes(';')) throw new Error('รูปแบบโค้ดเป้าไม่ถูกต้อง (ตัวอย่าง: 0;P;c;5;h;0;0l;4;0o;2;0a;1;1b;0)');

  const tokens = trimmed.split(';').map(t => t.trim()).filter(Boolean);
  // Find Primary profile section if present (`P`), stop if `A` (ADS) or `S` (Sniper) starts after P.
  let start = 0;
  const pIndex = tokens.indexOf('P');
  if (pIndex !== -1) start = pIndex + 1;

  const map = new Map();
  for (let i = start; i + 1 < tokens.length; i += 2) {
    const key = tokens[i];
    if (pIndex !== -1 && (key === 'A' || key === 'S')) break;
    map.set(key, tokens[i + 1]);
  }

  if (!map.size) throw new Error('ไม่พบค่าพารามิเตอร์เป้าเล็งในโค้ดที่วาง');

  let color = DEFAULT_CROSSHAIR.crosshairColor;
  if (map.has('c')) {
    const idx = Number(map.get('c'));
    if (idx === 8 && map.has('u')) {
      const hex = map.get('u').replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
      if (hex.length === 6) color = `#${hex.toLowerCase()}`;
    } else if (VALORANT_COLORS[idx]) {
      color = VALORANT_COLORS[idx];
    }
  }

  const showInner = map.get('0b') !== '0';
  const outlines = map.has('h') ? map.get('h') !== '0' : (map.has('o') ? Number(map.get('o')) > 0 : true);
  const dot = map.has('d') ? map.get('d') === '1' : false;
  const dotSize = map.has('z') ? clamp(Math.round(Number(map.get('z'))), 1, 6) : 2;
  const innerLength = showInner ? clamp(Math.round(Number(map.get('0l') ?? 6)), 0, 20) : 0;
  const innerThickness = clamp(Math.round(Number(map.get('0t') ?? 2)), 1, 8);
  const innerOffset = clamp(Math.round(Number(map.get('0o') ?? 3)), 0, 16);
  const innerOpacity = clamp(Number(map.get('0a') ?? 1), 0.1, 1);

  return normalizeCrosshair({
    crosshairColor: color,
    outlines,
    crosshairDot: dot,
    dotSize,
    innerLength,
    innerThickness,
    innerOffset,
    innerOpacity
  });
}

export function exportValorantCrosshairCode(rawConfig) {
  const c = normalizeCrosshair(rawConfig);
  const parts = ['0', 'P'];
  const presetEntry = Object.entries(VALORANT_COLORS).find(([, hex]) => hex.toLowerCase() === c.crosshairColor.toLowerCase());
  if (presetEntry) {
    parts.push('c', presetEntry[0]);
  } else {
    parts.push('c', '8', 'u', `${c.crosshairColor.slice(1).toUpperCase()}FF`);
  }
  parts.push('h', c.outlines ? '1' : '0');
  if (c.outlines) parts.push('o', '1');
  if (c.crosshairDot) {
    parts.push('d', '1', 'z', String(c.dotSize));
  } else {
    parts.push('d', '0');
  }
  if (c.innerLength === 0) {
    parts.push('0b', '0');
  } else {
    parts.push(
      '0t', String(c.innerThickness),
      '0l', String(c.innerLength),
      '0o', String(c.innerOffset),
      '0a', String(Number(c.innerOpacity.toFixed(2)))
    );
  }
  parts.push('1b', '0');
  return parts.join(';');
}
