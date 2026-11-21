const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const HOME_ARGUMENTS = '--background --roblox-home';
const keyForPath = value => path.resolve(value).toLowerCase();

function isStockShortcut(details, versionsDirectory) {
  if (!details?.target || String(details.args || '').trim()) return false;
  const relative = path.relative(versionsDirectory, path.resolve(details.target));
  return /^version-[a-f0-9]+[\\/]RobloxPlayerBeta\.exe$/i.test(relative);
}

function shortcuts({ desktop, programs }) {
  return [...new Set([desktop, programs, programs && path.join(programs, 'Roblox')].filter(Boolean))]
    .flatMap(directory => ['Roblox.lnk', 'Roblox Player.lnk'].map(name => path.join(directory, name)));
}

function updateHomeShortcuts({ shell, desktop, programs, versionsDirectory, backupDir, executable, startupRoot, player, enabled }) {
  const changed = [];
  const managed = target => {
    const normalized = keyForPath(target);
    if (normalized === keyForPath(executable)) return true;
    const relative = path.relative(startupRoot, normalized);
    return /^\d+(?:\.\d+){2}-[a-f0-9]{16}[\\/]seal-account-manager\.exe$/i.test(relative);
  };
  for (const shortcut of shortcuts({ desktop, programs })) {
    try {
      if (!fs.lstatSync(shortcut).isFile()) continue;
      const current = shell.readShortcutLink(shortcut);
      const owned = current?.target && current.args === HOME_ARGUMENTS && managed(current.target);
      const backup = path.join(backupDir, createHash('sha256').update(keyForPath(shortcut)).digest('hex') + '.lnk');
      if (enabled) {
        if (!owned) {
          if (!isStockShortcut(current, versionsDirectory)) continue;
          fs.mkdirSync(backupDir, { recursive: true });
          fs.copyFileSync(shortcut, backup);
        } else if (keyForPath(current.target) === keyForPath(executable)) {
          continue;
        }
        const update = { target: executable, args: HOME_ARGUMENTS, cwd: path.dirname(executable) };
        if (!owned && !current.icon && player) Object.assign(update, { icon: player, iconIndex: 0 });
        if (!shell.writeShortcutLink(shortcut, 'update', update)) throw new Error('Windows rejected the shortcut update.');
        changed.push(shortcut);
      } else if (owned && fs.existsSync(backup)) {
        const original = shell.readShortcutLink(backup);
        if (!isStockShortcut(original, versionsDirectory)) continue;
        if (fs.existsSync(original.target)) fs.copyFileSync(backup, shortcut);
        else {
          if (!player || !isStockShortcut({ target: player }, versionsDirectory) || !fs.existsSync(player)) continue;
          if (!shell.writeShortcutLink(shortcut, 'replace', { ...original, target: player, cwd: path.dirname(player) })) {
            throw new Error('Windows rejected the shortcut restore.');
          }
        }
        changed.push(shortcut);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') console.warn('[Roblox shortcut]', error.message);
    }
  }
  return changed;
}

module.exports = { updateHomeShortcuts, HOME_ARGUMENTS };
