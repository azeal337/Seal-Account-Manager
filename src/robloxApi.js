// robloxApi.js
//
// Small wrapper around the public Roblox web APIs needed for this app.
// All requests go straight to *.roblox.com - nothing is proxied through
// any third-party server.

const ROBLOX_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const BASE_HEADERS = (cookie) => ({
  Cookie: `.ROBLOSECURITY=${cookie}`,
  'Content-Type': 'application/json',
  Referer: 'https://www.roblox.com/',
  'User-Agent': ROBLOX_USER_AGENT
});

function rotatedCookieFromHeaders(headers) {
  if (!headers) return '';
  const values = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get?.('set-cookie') || ''];
  for (const value of values) {
    const match = String(value || '').match(/(?:^|[,\s])\.ROBLOSECURITY=([^;\r\n,]+)/i);
    if (match?.[1]) return match[1].trim().replace(/^"|"$/g, '');
  }
  return '';
}

function acceptCookieRotation(response, currentCookie, onCookieRotated) {
  const rotated = rotatedCookieFromHeaders(response?.headers);
  if (!rotated || rotated === currentCookie) return currentCookie;
  try { onCookieRotated?.(rotated); } catch (err) {
    console.warn('[roblox-api] could not persist rotated cookie:', err.message);
  }
  return rotated;
}

async function requestAuthenticatedUser(cookie, { onCookieRotated, maxAttempts = 2 } = {}) {
  let currentCookie = cookie;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch('https://users.roblox.com/v1/users/authenticated', {
      headers: BASE_HEADERS(currentCookie)
    });
    const previousCookie = currentCookie;
    currentCookie = acceptCookieRotation(res, currentCookie, onCookieRotated);

    if (res.status === 429 && attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      continue;
    }
    if (!res.ok && currentCookie !== previousCookie && attempt < maxAttempts - 1) continue;
    if (!res.ok) throw new Error('Cookie is invalid or expired (status ' + res.status + ')');

    const data = await res.json();
    return { userId: data.id, username: data.name, cookie: currentCookie };
  }
  throw new Error('Cookie verification did not complete. Please try signing in again.');
}

/**
 * Checks that a .ROBLOSECURITY cookie is valid and returns basic
 * account info (id + username).
 */
async function validateCookie(cookie, options = {}) {
  return requestAuthenticatedUser(cookie, options);
}

/**
 * Fetches a small avatar headshot image URL for the given user id.
 */
async function getAvatarUrl(userId) {
  const res = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.[0]?.imageUrl || null;
}

/**
 * Fetches current avatar thumbnails for many saved accounts in one request.
 */
async function getAvatarUrls(userIds) {
  const cleanIds = [...new Set((Array.isArray(userIds) ? userIds : [])
    .map(value => String(value || '').trim())
    .filter(value => /^\d+$/.test(value)))]
    .slice(0, 100);
  if (!cleanIds.length) return {};
  const res = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${cleanIds.join(',')}&size=150x150&format=Png&isCircular=false`
  );
  if (!res.ok) throw new Error(`Avatar refresh failed (status ${res.status})`);
  const data = await res.json();
  const byUserId = {};
  for (const item of Array.isArray(data?.data) ? data.data : []) {
    if (item?.targetId && item?.imageUrl) byUserId[String(item.targetId)] = item.imageUrl;
  }
  return byUserId;
}

/**
 * Resolves the public title and icon for Roblox experiences. No account cookie
 * is used: both endpoints are public Roblox metadata APIs.
 */
async function getExperienceDetails(universeIds) {
  const cleanIds = [...new Set((Array.isArray(universeIds) ? universeIds : [])
    .map(value => String(value || '').trim())
    .filter(value => /^\d+$/.test(value)))];
  const byUniverseId = {};

  for (let offset = 0; offset < cleanIds.length; offset += 100) {
    const ids = cleanIds.slice(offset, offset + 100);
    const query = ids.join(',');
    const [detailsResult, iconsResult] = await Promise.allSettled([
      fetch(`https://games.roblox.com/v1/games?universeIds=${query}`),
      fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${query}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`)
    ]);

    if (detailsResult.status === 'fulfilled' && detailsResult.value.ok) {
      const payload = await detailsResult.value.json();
      for (const item of Array.isArray(payload?.data) ? payload.data : []) {
        const universeId = String(item.id || '');
        if (!universeId) continue;
        byUniverseId[universeId] = {
          universeId,
          placeId: item.rootPlaceId ? String(item.rootPlaceId) : '',
          name: String(item.name || '').trim(),
          iconUrl: ''
        };
      }
    }

    if (iconsResult.status === 'fulfilled' && iconsResult.value.ok) {
      const payload = await iconsResult.value.json();
      for (const item of Array.isArray(payload?.data) ? payload.data : []) {
        const universeId = String(item.targetId || '');
        if (!universeId) continue;
        byUniverseId[universeId] ||= { universeId, placeId: '', name: '', iconUrl: '' };
        if (item.imageUrl) byUniverseId[universeId].iconUrl = String(item.imageUrl);
      }
    }
  }

  return byUniverseId;
}

/**
 * Roblox requires a CSRF token (returned in a response header on a
 * rejected request) before it will issue an authentication ticket.
 */
async function getCsrfToken(cookie, onCookieRotated, { signal } = {}) {
  const res = await fetch('https://auth.roblox.com/v1/authentication-ticket', {
    method: 'POST',
    headers: BASE_HEADERS(cookie), signal
  });
  const currentCookie = acceptCookieRotation(res, cookie, onCookieRotated);
  const token = res.headers.get('x-csrf-token');
  if (!token) throw new Error('Could not obtain CSRF token (cookie may be invalid)');
  return { token, cookie: currentCookie };
}


/**
 * Checks whether a stored account cookie is still usable for launching.
 * Retries up to 3 times on 429 rate-limit responses before giving up.
 */
async function checkCookieActive(cookie, options = {}) {
  return requestAuthenticatedUser(cookie, { ...options, maxAttempts: 3 });
}

/**
 * Gets a short-lived authentication ticket. This ticket is what gets
 * embedded into the roblox-player:// launch URI so the desktop client
 * opens already signed in as this account.
 */
async function getAuthTicket(cookie, onCookieRotated) {
  let currentCookie = cookie;
  for (let attempt = 0; attempt < 2; attempt++) {
    const csrfResult = await getCsrfToken(currentCookie, onCookieRotated);
    currentCookie = csrfResult.cookie;
    const res = await fetch('https://auth.roblox.com/v1/authentication-ticket', {
      method: 'POST',
      headers: {
        ...BASE_HEADERS(currentCookie),
        'X-CSRF-TOKEN': csrfResult.token
      }
    });
    const previousCookie = currentCookie;
    currentCookie = acceptCookieRotation(res, currentCookie, onCookieRotated);
    if (!res.ok && currentCookie !== previousCookie && attempt === 0) continue;
    if (!res.ok) throw new Error('Failed to get authentication ticket (status ' + res.status + ')');

    const ticket = res.headers.get('rbx-authentication-ticket');
    if (!ticket) throw new Error('No authentication ticket returned');
    return ticket;
  }
  throw new Error('Roblox rotated the login while starting. Please press Play again.');
}

/**
 * Resolves a Roblox username to a numeric user id, for the
 * "join a specific user" feature.
 */
async function getUserIdFromUsername(username) {
  const res = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
  });

  if (!res.ok) throw new Error('Lookup failed (status ' + res.status + ')');
  const data = await res.json();
  if (!data.data || data.data.length === 0) {
    throw new Error(`User "${username}" not found`);
  }
  return data.data[0].id;
}


/**
 * Recursively searches a JSON-ish value for useful Roblox share-link fields.
 */
function scanShareResolveJson(value, found = {}) {
  if (value == null) return found;

  if (typeof value === 'string') {
    const source = value;
    const gameMatch = source.match(/roblox\.com\/games\/(\d+)/i) || source.match(/[?&]placeId=(\d+)/i);
    const codeMatch = source.match(/[?&]privateServerLinkCode=([^&#"'<>]+)/i) || source.match(/[?&]linkCode=([^&#"'<>]+)/i) || source.match(/[?&]accessCode=([^&#"'<>]+)/i);
    if (!found.placeId && gameMatch) found.placeId = gameMatch[1];
    if (!found.privateServerLinkCode && codeMatch) found.privateServerLinkCode = decodeURIComponent(codeMatch[1]);
    return found;
  }

  if (Array.isArray(value)) {
    for (const item of value) scanShareResolveJson(item, found);
    return found;
  }

  if (typeof value === 'object') {
    for (const [rawKey, item] of Object.entries(value)) {
      const key = rawKey.toLowerCase();

      if (!found.placeId && ['placeid', 'rootplaceid', 'rootplace', 'gameid'].includes(key)) {
        const n = typeof item === 'number' ? String(item) : String(item || '');
        if (/^\d+$/.test(n)) found.placeId = n;
      }

      if (!found.privateServerLinkCode && ['privateserverlinkcode', 'linkcode', 'accesscode'].includes(key)) {
        const s = String(item || '').trim();
        if (s) found.privateServerLinkCode = s;
      }

      scanShareResolveJson(item, found);
    }
  }

  return found;
}

function extractShareFieldsFromText(text) {
  return scanShareResolveJson(String(text || ''));
}

async function tryReadResponse(res) {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const raw = await res.text().catch(() => '');
  if (contentType.includes('application/json')) {
    try { return { raw, json: JSON.parse(raw) }; } catch { return { raw, json: null }; }
  }
  try { return { raw, json: JSON.parse(raw) }; } catch { return { raw, json: null }; }
}

async function fetchShareResolveCandidate(cookie, method, url, bodyObj) {
  const headers = BASE_HEADERS(cookie);
  const options = { method, headers, redirect: 'follow' };
  if (bodyObj) options.body = JSON.stringify(bodyObj);

  let res = await fetch(url, options);

  // Some Roblox POST APIs require CSRF. Retry once if it asks for a token.
  if (method === 'POST' && res.status === 403 && res.headers.get('x-csrf-token')) {
    res = await fetch(url, {
      ...options,
      headers: { ...headers, 'X-CSRF-TOKEN': res.headers.get('x-csrf-token') }
    });
  }

  const { raw, json } = await tryReadResponse(res);
  const found = scanShareResolveJson(json, extractShareFieldsFromText(res.url || url));
  scanShareResolveJson(raw, found);

  return { ok: res.ok, status: res.status, url: res.url || url, found, raw };
}

/**
 * Resolves Roblox's newer private server share links:
 *   https://www.roblox.com/share?code=CODE&type=Server
 *
 * IMPORTANT: the share code is not always the same as the old
 * privateServerLinkCode used by PlaceLauncher. This function tries Roblox's
 * share-link resolver first, then falls back to following the web share URL.
 */
async function resolvePrivateServerShareCode(cookie, shareCode) {
  const cleanCode = String(shareCode || '').trim();
  if (!/^[a-z0-9_-]{8,128}$/i.test(cleanCode)) {
    throw new Error('Invalid private server share code');
  }

  const encoded = encodeURIComponent(cleanCode);
  const attempts = [
    // Roblox has changed this endpoint before, so try the common shapes.
    ['GET', `https://apis.roblox.com/sharelinks/v1/resolve-link?linkId=${encoded}&linkType=Server`],
    ['GET', `https://apis.roblox.com/sharelinks/v1/resolve-link?code=${encoded}&type=Server`],
    ['POST', 'https://apis.roblox.com/sharelinks/v1/resolve-link', { linkId: cleanCode, linkType: 'Server' }],
    ['POST', 'https://apis.roblox.com/sharelinks/v1/resolve-link', { code: cleanCode, type: 'Server' }],
    ['GET', `https://www.roblox.com/share?code=${encoded}&type=Server`]
  ];

  const errors = [];
  for (const [method, url, body] of attempts) {
    try {
      const result = await fetchShareResolveCandidate(cookie, method, url, body);
      const found = result.found || {};

      if (found.placeId && found.privateServerLinkCode) {
        return {
          placeId: found.placeId,
          privateServerLinkCode: found.privateServerLinkCode,
          source: url
        };
      }

      // If Roblox returns a full game URL in the final redirect/body, this may
      // still be enough only when the old code is present. Do NOT silently use
      // the share code as privateServerLinkCode, because that launches Roblox
      // but usually does not join the server.
      errors.push(`${method} ${url} -> status ${result.status}, placeId=${found.placeId || 'missing'}, privateServerLinkCode=${found.privateServerLinkCode ? 'found' : 'missing'}`);
    } catch (err) {
      errors.push(`${method} ${url} -> ${err.message || err}`);
    }
  }

  throw new Error(
    'Could not resolve that share link into a real privateServerLinkCode. ' +
    'Open the share link in your browser once; if it turns into a roblox.com/games/... URL, paste that full URL instead. Debug: ' +
    errors.join(' | ')
  );
}

/**
 * Checks a user's current presence (online/offline/in-game/in-studio).
 * Uses the account's own cookie to authenticate the presence request.
 * userType values from Roblox: 0 = Offline, 1 = Online, 2 = InGame, 3 = InStudio.
 */
async function getPresenceMany(cookie, userIds, { onCookieRotated, signal, timeoutMs = 8000 } = {}) {
  const cleanUserIds = [...new Set((userIds || [])
    .map(id => Number(id))
    .filter(id => Number.isFinite(id) && id > 0))];

  if (cleanUserIds.length === 0) return {};

  const timeout = AbortSignal.timeout(Math.max(1, Math.min(8000, Number(timeoutMs) || 8000)));
  const deadline = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const csrfResult = await getCsrfToken(cookie, onCookieRotated, { signal: deadline }).catch(error => {
    if (deadline.aborted) throw error;
    return null;
  });
  const currentCookie = csrfResult?.cookie || cookie;

  const res = await fetch('https://presence.roblox.com/v1/presence/users', {
    method: 'POST',
    headers: {
      ...BASE_HEADERS(currentCookie),
      ...(csrfResult?.token ? { 'X-CSRF-TOKEN': csrfResult.token } : {})
    },
    body: JSON.stringify({ userIds: cleanUserIds }),
    signal: deadline
  });
  acceptCookieRotation(res, currentCookie, onCookieRotated);

  if (!res.ok) {
    throw new Error('Presence lookup failed (status ' + res.status + ')');
  }

  const data = await res.json();
  const entries = Array.isArray(data?.userPresences) ? data.userPresences : [];
  const byUserId = {};

  for (const entry of entries) {
    const userPresenceType = Number(entry.userPresenceType); // 0 offline, 1 website, 2 game, 3 Studio, 4 invisible
    byUserId[String(entry.userId)] = {
      userPresenceType,
      inGame: userPresenceType === 2,
      inStudio: userPresenceType === 3,
      webOnline: userPresenceType === 1,
      invisible: userPresenceType === 4,
      online: userPresenceType >= 1 && userPresenceType <= 3,
      placeId: entry.placeId || null,
      rootPlaceId: entry.rootPlaceId || null,
      gameId: entry.gameId || entry.gameInstanceId || null,
      universeId: entry.universeId || null,
      lastLocation: entry.lastLocation || null,
      lastOnline: entry.lastOnline || null
    };
  }

  return byUserId;
}

async function getPresence(cookie, userId, options = {}) {
  const results = await getPresenceMany(cookie, [userId], options);
  const entry = results[String(userId)];
  if (!entry) throw new Error('No presence data returned');
  return entry;
}

module.exports = {
  validateCookie,
  checkCookieActive,
  getAvatarUrl,
  getAvatarUrls,
  getExperienceDetails,
  getAuthTicket,
  getUserIdFromUsername,
  resolvePrivateServerShareCode,
  getPresence,
  getPresenceMany
};
