const assert = require('node:assert/strict');
const robloxApi = require('../src/robloxApi');

async function testAuthenticatedUserRotation() {
  const requests = [];
  const rotations = [];
  global.fetch = async (url, options = {}) => {
    requests.push({ url, headers: options.headers || {} });
    if (requests.length === 1) {
      return new Response(JSON.stringify({ errors: [{ message: 'rotate' }] }), {
        status: 403,
        headers: { 'content-type': 'application/json', 'set-cookie': '.ROBLOSECURITY=fresh-cookie; Path=/; Secure; HttpOnly' }
      });
    }
    return new Response(JSON.stringify({ id: 123, name: 'RotationTest' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  const result = await robloxApi.validateCookie('stale-cookie', {
    onCookieRotated: cookie => rotations.push(cookie)
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[1].headers.Cookie, '.ROBLOSECURITY=fresh-cookie');
  assert.deepEqual(rotations, ['fresh-cookie']);
  assert.deepEqual(result, { userId: 123, username: 'RotationTest', cookie: 'fresh-cookie' });
}

async function testAuthTicketRotation() {
  const requests = [];
  const rotations = [];
  global.fetch = async (url, options = {}) => {
    requests.push({ url, headers: options.headers || {} });
    if (requests.length === 1) {
      return new Response('', {
        status: 403,
        headers: {
          'x-csrf-token': 'csrf-token',
          'set-cookie': '.ROBLOSECURITY=launch-cookie; Path=/; Secure; HttpOnly'
        }
      });
    }
    return new Response('', {
      status: 200,
      headers: { 'rbx-authentication-ticket': 'launch-ticket' }
    });
  };

  const ticket = await robloxApi.getAuthTicket('old-launch-cookie', cookie => rotations.push(cookie));
  assert.equal(ticket, 'launch-ticket');
  assert.equal(requests[1].headers.Cookie, '.ROBLOSECURITY=launch-cookie');
  assert.deepEqual(rotations, ['launch-cookie']);
}

(async () => {
  const originalFetch = global.fetch;
  try {
    await testAuthenticatedUserRotation();
    await testAuthTicketRotation();
    console.log('Auth cookie rotation tests passed.');
  } finally {
    global.fetch = originalFetch;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
