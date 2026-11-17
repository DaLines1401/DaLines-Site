import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const { DiscordPresence, APPLICATION_ID, ICON_URL, frame } = createRequire(import.meta.url)('../desktop/discord.cjs');

const waitStatus = (client, expected) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { client.off('status', listener); reject(new Error(`Expected ${expected}, got ${client.status}`)); }, 3000);
  const listener = status => { if (status === expected) { clearTimeout(timer); client.off('status', listener); resolve(); } };
  client.on('status', listener);
});
async function fixture(t, { fragment = false } = {}) {
  const name = `senslab-qa-${randomUUID()}`;
  const pipe = process.platform === 'win32' ? `\\\\?\\pipe\\${name}` : path.join(os.tmpdir(), name);
  const sockets = new Set(), messages = [];
  const server = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {});
    let buffer = Buffer.alloc(0);
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 8) {
        const opcode = buffer.readUInt32LE(0), size = buffer.readUInt32LE(4);
        if (buffer.length < size + 8) return;
        const payload = JSON.parse(buffer.subarray(8, size + 8).toString());
        buffer = buffer.subarray(size + 8);
        messages.push({ opcode, payload });
        if (opcode === 0) {
          const ready = Buffer.concat([frame(3, { test: 'ping' }), frame(1, { cmd: 'DISPATCH', evt: 'READY', data: {} })]);
          if (fragment) { socket.write(ready.subarray(0, 5)); setTimeout(() => { if (!socket.destroyed) socket.write(ready.subarray(5)); }, 5); }
          else socket.write(ready);
        } else if (payload.cmd === 'SET_ACTIVITY') socket.write(frame(1, { cmd: 'SET_ACTIVITY', nonce: payload.nonce, data: payload.args.activity }));
      }
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(pipe, resolve); });
  const client = new DiscordPresence({ paths: [pipe], retryMs: 20, timeoutMs: 200 });
  t.after(async () => { client.disconnect(); for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  return { pipe, client, messages, sockets };
}

test('Discord IPC handles split/coalesced frames, answers ping and sets only generic activity', async t => {
  const { client, messages } = await fixture(t, { fragment: true });
  const connected = waitStatus(client, 'connected'); client.setEnabled(true); await connected;
  assert.deepEqual(messages[0], { opcode: 0, payload: { v: 1, client_id: APPLICATION_ID } });
  assert.ok(messages.some(m => m.opcode === 4 && m.payload.test === 'ping'));
  const command = messages.find(m => m.payload.cmd === 'SET_ACTIVITY');
  assert.equal(command.payload.args.pid, process.pid);
  assert.equal(command.payload.args.activity.assets.large_image, ICON_URL);
  assert.equal(command.payload.args.activity.timestamps.start, client.startedAt);
  assert.equal(messages.some(m => ['AUTHORIZE', 'AUTHENTICATE'].includes(m.payload.cmd)), false);
  assert.equal(JSON.stringify(command).includes('score'), false);
  const cleared = new Promise(resolve => client.socket.once('finish', resolve));
  client.setEnabled(false); await cleared;
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.ok(messages.some(m => m.payload.cmd === 'SET_ACTIVITY' && m.payload.args.activity === null));
  assert.equal(client.status, 'disabled'); assert.equal(client.timer, null);
});

test('Discord restarts reconnect without changing the original session timestamp', async t => {
  const { client, sockets } = await fixture(t);
  let connected = waitStatus(client, 'connected'); client.setEnabled(true); await connected;
  const startedAt = client.startedAt;
  connected = waitStatus(client, 'connected'); for (const socket of sockets) socket.destroy(); await connected;
  assert.equal(client.startedAt, startedAt);
});

test('Discord absence stays optional and disabling cancels later reconnects', async () => {
  const missing = process.platform === 'win32' ? `\\\\?\\pipe\\senslab-missing-${randomUUID()}` : path.join(os.tmpdir(), randomUUID());
  const client = new DiscordPresence({ paths: [missing], retryMs: 50, timeoutMs: 100 });
  try {
    const waiting = waitStatus(client, 'waiting'); client.setEnabled(true); await waiting;
    client.setEnabled(false);
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(client.status, 'disabled'); assert.equal(client.socket, null); assert.equal(client.timer, null);
  } finally { client.disconnect(); }
});

test('Discord scans the next pipe when an earlier slot is unavailable', async t => {
  const { client, pipe } = await fixture(t);
  client.paths = [pipe + '-missing', pipe];
  const connected = waitStatus(client, 'connected'); client.setEnabled(true); await connected;
  assert.equal(client.status, 'connected');
});
