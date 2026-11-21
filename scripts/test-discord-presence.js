'use strict';

const assert = require('assert');
const net = require('net');
const {
  DiscordPresence,
  encodeFrame,
  parseFrames,
  OPCODE_HANDSHAKE,
  OPCODE_FRAME
} = require('../src/discordPresence');

const clientId = '1534294104215912618';
const iconAsset = 'seal-discord-application-icon';
const pipe = process.platform === 'win32'
  ? `\\\\.\\pipe\\seal-discord-presence-test-${process.pid}-${Date.now()}`
  : `/tmp/seal-discord-presence-test-${process.pid}-${Date.now()}.sock`;

async function run() {
  let manager = null;
  const activities = [];
  let cleared = false;
  let resolveUpdated;
  let rejectUpdated;
  const updated = new Promise((resolve, reject) => {
    resolveUpdated = resolve;
    rejectUpdated = reject;
  });
  const timeout = setTimeout(() => rejectUpdated(new Error('Timed out waiting for Discord activity frames.')), 5000);

  const server = net.createServer(socket => {
    let buffer = Buffer.alloc(0);
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      const result = parseFrames(buffer);
      buffer = result.rest;
      for (const frame of result.frames) {
        if (frame.opcode === OPCODE_HANDSHAKE) {
          assert.equal(frame.payload.client_id, clientId);
          assert.equal(frame.payload.v, 1);
          socket.write(encodeFrame(OPCODE_FRAME, { cmd: 'DISPATCH', evt: 'READY', data: {} }));
          continue;
        }
        if (frame.opcode === OPCODE_FRAME && frame.payload?.cmd === 'SET_ACTIVITY') {
          const activity = frame.payload.args.activity;
          if (!activity) {
            cleared = true;
            if (activities.length === 2) resolveUpdated();
            continue;
          }
          activities.push(activity);
          if (activities.length === 1) manager.setSessionCount(2);
          if (activities.length === 2) manager.setActive(false);
        }
      }
    });
  });

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(pipe, resolve);
    });
    manager = new DiscordPresence({
      clientId,
      active: false,
      largeImage: iconAsset,
      largeText: 'Seal Account Manager',
      smallImage: iconAsset,
      smallText: 'Seal Account Manager',
      pipePaths: [pipe],
      reconnectDelayMs: 1000,
      connectTimeoutMs: 1000,
      logger: { warn: () => {} }
    });
    assert.equal(manager.start(), true);
    setTimeout(() => {
      try {
        assert.equal(activities.length, 0, 'Presence must stay clear until Roblox is detected.');
        manager.setActive(true);
      } catch (err) {
        rejectUpdated(err);
      }
    }, 100);
    await updated;
    assert.equal(activities[0].details, 'Roblox launcher ready');
    assert.equal(activities[1].details, 'Managing 2 Roblox sessions');
    assert.equal(activities[1].state, '2 active accounts');
    assert.equal(activities[1].type, 0);
    assert.equal(activities[1].assets.large_image, iconAsset);
    assert.equal(activities[1].assets.large_text, 'Seal Account Manager');
    assert.equal(activities[1].assets.small_image, iconAsset);
    assert.equal(activities[1].assets.small_text, 'Seal Account Manager');
    assert.ok(Number.isInteger(activities[1].timestamps.start));
    assert.equal(cleared, true, 'Presence must clear after the final Roblox process closes.');
    console.log('Discord Rich Presence IPC test passed.');
  } finally {
    clearTimeout(timeout);
    manager?.stop();
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
