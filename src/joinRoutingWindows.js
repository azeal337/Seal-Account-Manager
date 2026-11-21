const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

function createWindowsJoinRouting({ resourcesPath = process.resourcesPath } = {}) {
  const systemDirectory = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32');
  const helper = resourcesPath && fs.existsSync(path.join(resourcesPath, 'repairJoinHosts.ps1'))
    ? path.join(resourcesPath, 'repairJoinHosts.ps1') : path.join(__dirname, 'repairJoinHosts.ps1');
  const powershell = path.join(systemDirectory, 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const quote = value => "'" + value.replace(/'/g, "''") + "'";
  // Elevation is requested only by the repair IPC invoked by the user's button.
  // The helper selects the Windows hosts file itself; it accepts no write target.
  const runRepair = () => new Promise((resolve, reject) => {
    const script = `$ErrorActionPreference='Stop'; try { $p=Start-Process -FilePath ${quote(powershell)} -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',${quote('"'+helper+'"')}) -Verb RunAs -WindowStyle Hidden -Wait -PassThru; exit $p.ExitCode } catch { if ($_.Exception.NativeErrorCode -eq 1223 -or $_.Exception.InnerException.NativeErrorCode -eq 1223) { exit 1223 }; exit 1 }`;
    execFile(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true }, error => {
      if (!error) resolve(0);
      else if (Number.isInteger(error.code)) resolve(error.code);
      else reject(new Error('Windows could not start the connection repair.'));
    });
  });
  return require('./joinRouting').createJoinRouting({ hostsPath: path.join(systemDirectory, 'drivers', 'etc', 'hosts'), runRepair });
}
module.exports = { createWindowsJoinRouting };
