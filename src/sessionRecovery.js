const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const logNearProcess = (log, process) => process.startedAt > 0 &&
  log.createdAt > process.startedAt - 4000 && log.createdAt < process.startedAt + 12000;
const unlinkedId = process => `unlinked:${process.pid}:${process.startedAt}`;
const DESKTOP_PROFILE_SOURCE = 'desktop-profile';

function readDesktopProfile(file) {
  try {
    const stat = fs.statSync(file);
    if (stat.size > 4 * 1024 * 1024) return null;
    const userId = String(JSON.parse(fs.readFileSync(file, 'utf8')).UserId ?? '');
    return /^[1-9]\d*$/.test(userId) ? { userId, modifiedAt: stat.mtimeMs } : null;
  } catch { return null; }
}

function matchLogs(processes, logs, excludedLogs = new Set()) {
  const matches = new Map();
  const eligibleLogs = logs.filter(log => !excludedLogs.has(log.path));
  for (const process of processes) {
    const candidates = eligibleLogs.filter(log => logNearProcess(log, process));
    if (candidates.length !== 1) continue;
    const log = candidates[0];
    if (processes.filter(other => logNearProcess(log, other)).length === 1) matches.set(process.pid, log);
  }
  return matches;
}

function matchSessions(processes, records, logs, accounts, desktopProfile = null) {
  const byAccount = new Map(accounts.map(a => [String(a.id), a]));
  const byUser = new Map(accounts.map(a => [String(a.userId), a]));
  const matches = [];
  const used = new Set();
  const usedLogs = new Set();
  for (const process of processes.filter(p => p.window && p.startedAt > 0)) {
    const known = records.find(r => r.identitySource !== DESKTOP_PROFILE_SOURCE &&
      r.pid === process.pid && r.processStartedAt === process.startedAt &&
      byAccount.has(r.accountId) && String(byAccount.get(r.accountId).userId) === String(r.userId));
    if (known) {
      matches.push({ ...known, pid: process.pid }); used.add(process.pid);
      if (known.logFile) usedLogs.add(known.logFile);
    }
  }

  // The profile is shared, but a verified sign-in belongs to one process and
  // one log. Starting another client must not erase that earlier link.
  const desktopLogs = new Map();
  for (const process of processes.filter(p => p.window && !used.has(p.pid))) {
    const previous = records.find(record => record.identitySource === DESKTOP_PROFILE_SOURCE &&
      record.pid === process.pid && record.processStartedAt === process.startedAt);
    const account = previous && byAccount.get(String(previous.accountId));
    if (!account || String(account.userId) !== String(previous.userId) || usedLogs.has(previous.logFile)) continue;
    const log = logs.find(entry => entry.path === previous.logFile && logNearProcess(entry, process));
    const activity = log?.activity;
    if (!activity) continue;
    const explicitGameIdentity = activity.confirmed && !activity.disconnected && activity.userId;
    if (explicitGameIdentity) {
      // A current game can report a different user after an account switch.
      // Keep the exact process/log association, then use the explicit identity.
      desktopLogs.set(process.pid, log);
      usedLogs.add(log.path);
    } else if (activity.desktopSignedInAt && activity.desktopSignedInAt === previous.desktopSignedInAt) {
      matches.push({ ...previous, pid: process.pid });
      used.add(process.pid);
      usedLogs.add(log.path);
    }
  }
  // A timestamp alone is not an identity. Require an unambiguous nearby log
  // with a confirmed game join AND an explicit saved Roblox user ID.
  const remaining = processes.filter(p => !used.has(p.pid));
  const matchedLogs = matchLogs(remaining.filter(process => !desktopLogs.has(process.pid)), logs, usedLogs);
  for (const [pid, log] of desktopLogs) matchedLogs.set(pid, log);
  for (const process of remaining) {
    const log = matchedLogs.get(process.pid);
    const activity = log?.activity;
    if (!activity) continue;
    const currentGame = activity.confirmed && !activity.disconnected;
    const account = byUser.get(String(activity.userId));
    if (currentGame && activity.userId && !account) continue;
    if (currentGame && account) {
      matches.push({ accountId: account.id, userId: account.userId, pid: process.pid, processStartedAt: process.startedAt, startedAt: process.startedAt, logFile: log.path, targetLabel: activity.placeId ? `Place ${activity.placeId}` : 'Roblox' });
      continue;
    }
    // Use the shared profile only to create a new link for a single client.
    if (processes.length !== 1 || !process.window || !desktopProfile || !activity.desktopSignedInAt) continue;
    const desktopAccount = byUser.get(desktopProfile.userId);
    const age = desktopProfile.modifiedAt - activity.desktopSignedInAt;
    if (!desktopAccount || !Number.isFinite(age) || age < -2000 || age > 15000) continue;
    matches.push({
      accountId: desktopAccount.id, userId: desktopAccount.userId, pid: process.pid, processStartedAt: process.startedAt,
      startedAt: process.startedAt, logFile: log.path, targetLabel: 'Roblox home',
      identitySource: DESKTOP_PROFILE_SOURCE, desktopSignedInAt: activity.desktopSignedInAt
    });
  }
  return matches;
}
function createRecovery(file, watcher) {
  let records = [];
  try { const parsed = JSON.parse(fs.readFileSync(file, 'utf8')); if (Array.isArray(parsed)) records = parsed.filter(r => r && typeof r === 'object' && Number.isInteger(r.pid)); } catch {}
  let snapshot = [], pending = null, last = 0, serialized = JSON.stringify(records);
  let verifiedDesktopSessions = [];
  function recentLogs(processes) {
    if (!processes.length) return [];
    return watcher.playerLogs().filter(log => processes.some(process => logNearProcess(log, process)))
      .slice(0, 100).filter(log => !watcher.isPlayerLog || watcher.isPlayerLog(log.path)).map(log => {
        try { return { ...log, activity: watcher.parseActivity(log.path) }; } catch { return log; }
      });
  }
  async function scan(options = {}) {
    if (process.env.SEAL_TEST_ROBLOX_ROOT) return [];
    if (pending) return pending;
    if (!options.force && Date.now() - last < 2000) return snapshot;
    pending = new Promise(resolve => {
      const parentQuery = options.withParents
        ? "$parents=@{}; Get-CimInstance Win32_Process -Filter \"Name='RobloxPlayerBeta.exe'\" -ErrorAction SilentlyContinue | ForEach-Object { $parents[[int]$_.ProcessId] = $_.ParentProcessId }; "
        : "$parents=@{}; ";
      const script = "$ErrorActionPreference='Stop'; " + parentQuery + "$items=@(Get-Process -Name RobloxPlayerBeta -ErrorAction SilentlyContinue | ForEach-Object { try { [pscustomobject]@{pid=$_.Id; parentPid=$parents[$_.Id]; startedAt=$_.StartTime.ToUniversalTime().ToString('o'); window=($_.MainWindowHandle -ne 0)} } catch {} }); ConvertTo-Json -InputObject $items -Compress";
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 8000 }, (error, stdout) => {
        last = Date.now();
        if (error) { snapshot = null; resolve(null); return; }
        try { snapshot = JSON.parse(stdout).map(p => ({ pid: Number(p.pid), parentPid: Number(p.parentPid) || 0, startedAt: Date.parse(p.startedAt), window: !!p.window })); resolve(snapshot); }
        catch { snapshot = null; resolve(null); }
      });
    }).finally(() => { pending = null; });
    return pending;
  }
  return {
    scan,
    recentLogs,
    recover(processes, accounts, logs = recentLogs(processes)) {
      const canReadProfile = processes.length === 1 && processes[0].window && logs.some(log => log.activity?.desktopSignedInAt);
      const profileFile = canReadProfile && watcher.logsDirectory && path.join(path.dirname(watcher.logsDirectory()), 'LocalStorage', 'appStorage.json');
      const profile = profileFile && !process.env.SEAL_TEST_ROBLOX_ROOT ? readDesktopProfile(profileFile) : null;
      const previous = [...verifiedDesktopSessions, ...records];
      const matches = matchSessions(processes, previous, logs, accounts, profile);
      verifiedDesktopSessions = matches.filter(row => row.identitySource === DESKTOP_PROFILE_SOURCE);
      return matches;
    },
    save(processes, sessions, accountPids, accounts) {
      const next = [];
      for (const [accountId, pids] of accountPids) {
        const account = accounts.find(a => a.id === accountId);
        const meta = sessions.get(accountId);
        if (!account || !meta) continue;
        for (const pid of pids) {
          const proc = processes.find(p => p.pid === pid && p.window);
          if (proc) next.push({
            accountId, userId: account.userId, pid, processStartedAt: proc.startedAt, startedAt: meta.startedAt,
            logFile: meta.logFile || '', targetLabel: meta.targetLabel || 'Roblox',
            identitySource: meta.identitySource, desktopSignedInAt: meta.desktopSignedInAt,
            startedBySeal: meta.startedBySeal === true
          });
        }
      }
      const text = JSON.stringify(next);
      if (text === serialized) return;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file + '.tmp', text); fs.renameSync(file + '.tmp', file);
      records = next; serialized = text;
    }
  };
}
function unlinkedSessions(processes, sessions, livePids, logs = []) {
  const claimed = new Set(sessions.flatMap(session => session.pids || []));
  const unclaimed = (processes || []).filter(process => process.startedAt > 0 && livePids.has(process.pid) && !claimed.has(process.pid));
  const claimedLogs = new Set(sessions.map(session => session.logFile).filter(Boolean));
  const matched = matchLogs(unclaimed, logs, claimedLogs);
  return unclaimed.flatMap(process => {
    const log = matched.get(process.pid);
    const activity = log?.activity;
    const serverConfirmed = !!activity?.confirmed && !activity.disconnected;
    if (!process.window && !serverConfirmed) return [];
    return [{
      accountId: unlinkedId(process), unassigned: true, username: 'Unlinked Roblox', pids: [process.pid],
      startedAt: process.startedAt, logFile: log?.path, serverConfirmed,
      placeId: serverConfirmed ? activity.placeId : null,
      universeId: serverConfirmed ? activity.universeId : null,
      targetLabel: serverConfirmed && activity.placeId ? `Place ${activity.placeId}` : 'Roblox home'
    }];
  });
}
module.exports = { createRecovery, matchSessions, unlinkedSessions, unlinkedId, readDesktopProfile, DESKTOP_PROFILE_SOURCE };
