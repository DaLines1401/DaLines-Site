import test from 'node:test';
import assert from 'node:assert/strict';
import { exportValorantCrosshairCode, normalizeCrosshair, parseValorantCrosshairCode } from '../src/crosshair.mjs';

test('parses Valorant preset and custom hex crosshair codes cleanly', () => {
  const cyan = parseValorantCrosshairCode('0;P;c;5;h;0;d;0;0t;1;0l;4;0o;2;0a;0.8;1b;0');
  assert.equal(cyan.crosshairColor, '#00ffff');
  assert.equal(cyan.outlines, false);
  assert.equal(cyan.crosshairDot, false);
  assert.equal(cyan.innerThickness, 1);
  assert.equal(cyan.innerLength, 4);
  assert.equal(cyan.innerOffset, 2);
  assert.equal(cyan.innerOpacity, 0.8);

  const customHex = parseValorantCrosshairCode('0;s;1;P;c;8;u;12AB34FF;h;1;d;1;z;3;0b;0;S;c;1');
  assert.equal(customHex.crosshairColor, '#12ab34');
  assert.equal(customHex.outlines, true);
  assert.equal(customHex.crosshairDot, true);
  assert.equal(customHex.dotSize, 3);
  assert.equal(customHex.innerLength, 0);
});

test('exports and re-imports crosshair settings consistently', () => {
  const exported = exportValorantCrosshairCode({
    crosshairColor: '#00ff00',
    outlines: true,
    crosshairDot: true,
    dotSize: 2,
    innerLength: 5,
    innerThickness: 2,
    innerOffset: 3,
    innerOpacity: 1
  });
  const roundtrip = parseValorantCrosshairCode(exported);
  assert.equal(roundtrip.crosshairColor, '#00ff00');
  assert.equal(roundtrip.innerLength, 5);
  assert.equal(roundtrip.innerOffset, 3);
  assert.equal(roundtrip.crosshairDot, true);
  assert.equal(roundtrip.outlines, true);
});

test('migrates legacy crosshair size tokens and rejects invalid codes', () => {
  assert.equal(normalizeCrosshair({ crosshairSize: 'small' }).innerLength, 4);
  assert.equal(normalizeCrosshair({ crosshairSize: 'large' }).innerLength, 9);
  for (const bad of ['', 'invalid', '1234', null]) {
    assert.throws(() => parseValorantCrosshairCode(bad));
  }
});
