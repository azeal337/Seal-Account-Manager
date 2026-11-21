'use strict';

const net = require('net');

const OPCODE_HANDSHAKE = 0;
const OPCODE_FRAME = 1;
const OPCODE_CLOSE = 2;
const OPCODE_PING = 3;
const OPCODE_PONG = 4;
const MAX_FRAME_BYTES = 1024 * 1024;

function encodeFrame(opcode, payload) {
  const body = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(JSON.stringify(payload ?? {}), 'utf8');
  const frame = Buffer.allocUnsafe(8 + body.length);
  frame.writeUInt32LE(Number(opcode) >>> 0, 0);
  frame.writeUInt32LE(body.length >>> 0, 4);
  body.copy(frame, 8);
  return frame;
}

function parseFrames(input) {
  const frames = [];
  let offset = 0;
  while (input.length - offset >= 8) {
    const opcode = input.readUInt32LE(offset);
    const length = input.readUInt32LE(offset + 4);
    if (length > MAX_FRAME_BYTES) throw new Error('Discord RPC sent an unexpectedly large frame.');
    if (input.length - offset - 8 < length) break;
    const raw = input.subarray(offset + 8, offset + 8 + length);
    let payload = null;
    try { payload = raw.length ? JSON.parse(raw.toString('utf8')) : {}; }
    catch { payload = null; }
    frames.push({ opcode, payload, raw });
    offset += 8 + length;
  }
  return { frames, rest: input.subarray(offset) };
}

function defaultPipePaths() {
  if (process.platform === 'win32') {
    return Array.from({ length: 10 }, (_value, index) => `\\\\?\\pipe\\discord-ipc-${index}`);
  }
  const base = process.env.XDG_RUNTIME_DIR
    || process.env.TMPDIR
    || process.env.TMP
    || process.env.TEMP
    || '/tmp';
  return Array.from({ length: 10 }, (_value, index) => `${base}/discord-ipc-${index}`);
}

class DiscordPresence {
  constructor(options = {}) {
    this.clientId = String(options.clientId || '').trim();
    this.pipePaths = Array.isArray(options.pipePaths) && options.pipePaths.length
      ? [...options.pipePaths]
      : defaultPipePaths();
    this.reconnectDelayMs = Math.max(1000, Number(options.reconnectDelayMs) || 15000);
    this.connectTimeoutMs = Math.max(500, Number(options.connectTimeoutMs) || 2500);
    this.logger = options.logger || console;
    this.pid = Number(options.pid) || process.pid;
    this.largeImage = String(options.largeImage || '').trim();
    this.largeText = String(options.largeText || 'Seal Account Manager').trim();
    this.smallImage = String(options.smallImage || '').trim();
    this.smallText = String(options.smallText || 'Seal Account Manager').trim();
    this.startedAt = Math.floor(Date.now() / 1000);
    this.sessionCount = 0;
    this.active = options.active !== false;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.reconnectTimer = null;
    this.started = false;
    this.stopped = true;
    this.connecting = false;
    this.ready = false;
    this.nonce = 0;
  }

  start() {
    if (!/^\d{17,20}$/.test(this.clientId)) {
      this.logger.warn?.('[discord] Rich Presence is disabled because its Application ID is invalid.');
      return false;
    }
    if (this.started && !this.stopped) return true;
    this.started = true;
    this.stopped = false;
    this.startedAt = Math.floor(Date.now() / 1000);
    this._beginConnect();
    return true;
  }

  setSessionCount(value) {
    const count = Math.max(0, Math.floor(Number(value) || 0));
    if (count === this.sessionCount) return false;
    this.sessionCount = count;
    if (this.ready && this.active) this._sendActivity();
    return true;
  }

  setActive(value) {
    const active = value === true;
    if (active === this.active) return false;
    this.active = active;
    if (active) {
      this.startedAt = Math.floor(Date.now() / 1000);
      if (this.ready) this._sendActivity();
    } else if (this.ready) {
      this._clearActivity();
    }
    return true;
  }

  refresh() {
    return this.active ? this._sendActivity() : false;
  }

  stop() {
    this.stopped = true;
    this.started = false;
    this.connecting = false;
    this.ready = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const socket = this.socket;
    this.socket = null;
    if (!socket || socket.destroyed) return;
    try {
      socket.end(this._activityFrame(null));
    } catch {
      try { socket.destroy(); } catch {}
    }
  }

  _nextNonce() {
    this.nonce += 1;
    return `${Date.now()}-${this.pid}-${this.nonce}`;
  }

  _activityFrame(activity) {
    return encodeFrame(OPCODE_FRAME, {
      cmd: 'SET_ACTIVITY',
      args: { pid: this.pid, activity },
      nonce: this._nextNonce()
    });
  }

  _activity() {
    const count = this.sessionCount;
    const activity = {
      type: 0,
      details: count > 0
        ? `Managing ${count} Roblox session${count === 1 ? '' : 's'}`
        : 'Roblox launcher ready',
      state: count > 0
        ? `${count} active account${count === 1 ? '' : 's'}`
        : 'Seal Account Manager',
      timestamps: { start: this.startedAt },
      instance: false
    };
    if (this.largeImage) {
      activity.assets = {
        large_image: this.largeImage,
        large_text: this.largeText || 'Seal Account Manager'
      };
    }
    if (this.smallImage) {
      activity.assets ||= {};
      activity.assets.small_image = this.smallImage;
      activity.assets.small_text = this.smallText || 'Seal Account Manager';
    }
    return activity;
  }

  _beginConnect() {
    if (this.stopped || this.connecting || this.socket) return;
    this.connecting = true;
    this._tryPipe(0);
  }

  _tryPipe(index) {
    if (this.stopped) return;
    if (index >= this.pipePaths.length) {
      this.connecting = false;
      this._scheduleReconnect();
      return;
    }

    const socket = net.createConnection(this.pipePaths[index]);
    let connected = false;
    socket.setTimeout(this.connectTimeoutMs, () => {
      if (!connected) socket.destroy(new Error('Discord RPC connection timed out.'));
    });

    socket.once('connect', () => {
      if (this.stopped) {
        socket.destroy();
        return;
      }
      connected = true;
      socket.setTimeout(0);
      this.connecting = false;
      this.ready = false;
      this.socket = socket;
      this.buffer = Buffer.alloc(0);
      socket.write(encodeFrame(OPCODE_HANDSHAKE, { v: 1, client_id: this.clientId }));
    });

    socket.on('data', chunk => {
      if (this.socket !== socket) return;
      this._handleData(chunk);
    });

    socket.once('error', err => {
      if (!connected) {
        try { socket.destroy(); } catch {}
        if (!this.stopped) this._tryPipe(index + 1);
        return;
      }
      if (!this.stopped && !['ECONNRESET', 'EPIPE'].includes(err?.code)) {
        this.logger.warn?.('[discord] Rich Presence connection ended:', err.message);
      }
    });

    socket.once('close', () => {
      if (this.socket === socket) {
        this.socket = null;
        this.ready = false;
        this.buffer = Buffer.alloc(0);
      }
      if (connected && !this.stopped) this._scheduleReconnect();
    });
  }

  _scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this._beginConnect();
    }, this.reconnectDelayMs);
    this.reconnectTimer.unref?.();
  }

  _handleData(chunk) {
    try {
      const result = parseFrames(Buffer.concat([this.buffer, chunk]));
      this.buffer = result.rest;
      for (const frame of result.frames) this._handleFrame(frame);
    } catch (err) {
      this.logger.warn?.('[discord] Rich Presence protocol error:', err.message);
      try { this.socket?.destroy(); } catch {}
    }
  }

  _handleFrame(frame) {
    if (frame.opcode === OPCODE_PING) {
      try { this.socket?.write(encodeFrame(OPCODE_PONG, frame.raw)); } catch {}
      return;
    }
    if (frame.opcode === OPCODE_CLOSE) {
      try { this.socket?.destroy(); } catch {}
      return;
    }
    if (frame.opcode !== OPCODE_FRAME || !frame.payload) return;
    if (frame.payload.evt === 'READY') {
      this.ready = true;
      if (this.active) this._sendActivity();
      return;
    }
    if (frame.payload.evt === 'ERROR') {
      const message = frame.payload.data?.message || 'Discord rejected the Rich Presence update.';
      this.logger.warn?.('[discord] Rich Presence error:', message);
    }
  }

  _sendActivity() {
    if (!this.active || !this.ready || !this.socket || this.socket.destroyed) return false;
    try {
      this.socket.write(this._activityFrame(this._activity()));
      return true;
    } catch {
      return false;
    }
  }


  _clearActivity() {
    if (!this.ready || !this.socket || this.socket.destroyed) return false;
    try {
      this.socket.write(this._activityFrame(null));
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = {
  DiscordPresence,
  encodeFrame,
  parseFrames,
  OPCODE_HANDSHAKE,
  OPCODE_FRAME
};
