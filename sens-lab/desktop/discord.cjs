// Local Discord RPC only: no account token, OAuth login or remote API calls.
// Protocol: https://docs.discord.com/developers/topics/rpc
const net = require('node:net');
const { randomUUID } = require('node:crypto');
const { EventEmitter } = require('node:events');

const APPLICATION_ID = '1572201166853513286';
const ICON_URL = `https://cdn.discordapp.com/app-icons/${APPLICATION_ID}/6ff60548448f980df91ceb9a6f602877.png`;
const MAX_FRAME = 1024 * 1024;
function frame(opcode, payload) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload), 'utf8');
  const header = Buffer.alloc(8);
  header.writeUInt32LE(opcode, 0); header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}
function activity(startedAt) {
  return {
    type: 0,
    details: 'Aim training & sensitivity finder',
    state: 'Valorant / CS2 / Apex Legends',
    timestamps: { start: startedAt },
    assets: { large_image: ICON_URL, large_text: 'DaLines Sens Lab' }
  };
}
class DiscordPresence extends EventEmitter {
  constructor({ paths, retryMs = 15000, timeoutMs = 4000 } = {}) {
    super();
    this.paths = paths || Array.from({ length: 10 }, (_, i) => `\\\\?\\pipe\\discord-ipc-${i}`);
    this.retryMs = retryMs; this.timeoutMs = timeoutMs;
    this.enabled = false; this.status = 'disabled'; this.socket = null; this.timer = null;
    this.startedAt = Math.floor(Date.now() / 1000); this.nonce = null;
  }
  setStatus(status) { this.status = status; this.emit('status', status); }
  setEnabled(enabled) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (enabled) { this.startedAt = Math.floor(Date.now() / 1000); this.connect(0); }
    else this.disconnect();
  }
  connect(index) {
    if (!this.enabled || this.socket) return;
    clearTimeout(this.timer);
    if (index >= this.paths.length) {
      this.setStatus('waiting');
      this.timer = setTimeout(() => this.connect(0), this.retryMs);
      this.timer.unref(); return;
    }
    this.setStatus('connecting');
    const socket = net.createConnection(this.paths[index]);
    this.socket = socket; socket.unref();
    let buffer = Buffer.alloc(0), ready = false;
    const handshakeTimer = setTimeout(() => socket.destroy(), this.timeoutMs);
    handshakeTimer.unref();
    socket.on('error', () => {}); // Discord not running must never interrupt training.
    socket.on('connect', () => socket.write(frame(0, { v: 1, client_id: APPLICATION_ID })));
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 8) {
        const opcode = buffer.readUInt32LE(0), length = buffer.readUInt32LE(4);
        if (length > MAX_FRAME) { socket.destroy(); return; }
        if (buffer.length < 8 + length) return;
        const body = buffer.subarray(8, 8 + length);
        buffer = buffer.subarray(8 + length);
        if (opcode === 3) { socket.write(frame(4, body)); continue; }
        if (opcode === 2) { socket.destroy(); return; }
        if (opcode !== 1) continue;
        let message;
        try { message = JSON.parse(body.toString('utf8')); }
        catch { socket.destroy(); return; }
        if (message.evt === 'READY' && !ready) {
          ready = true;
          this.nonce = randomUUID();
          socket.write(frame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: activity(this.startedAt) }, nonce: this.nonce }));
        } else if (message.nonce === this.nonce) {
          clearTimeout(handshakeTimer);
          if (message.evt === 'ERROR') {
            this.setStatus('error');
            socket.destroy();
          } else if (message.cmd === 'SET_ACTIVITY') this.setStatus('connected');
        }
      }
    });
    socket.on('close', () => {
      clearTimeout(handshakeTimer);
      if (this.socket !== socket) return;
      this.socket = null;
      if (this.enabled) {
        // A running Discord client may restart; retry without blocking the app.
        if (ready) {
          this.setStatus('waiting');
          this.timer = setTimeout(() => this.connect(0), this.retryMs);
          this.timer.unref();
        } else this.connect(index + 1);
      }
    });
  }
  disconnect() {
    this.enabled = false;
    clearTimeout(this.timer); this.timer = null;
    const socket = this.socket; this.socket = null;
    if (socket && !socket.destroyed) {
      // Clear our own presence before releasing the connection.
      socket.end(frame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: null }, nonce: randomUUID() }));
      const timer = setTimeout(() => socket.destroy(), 500);
      timer.unref();
    }
    this.setStatus('disabled');
  }
}
module.exports = { DiscordPresence, APPLICATION_ID, ICON_URL, frame, activity };
