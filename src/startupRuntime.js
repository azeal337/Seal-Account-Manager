const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
async function prepareStartupExecutable({ executable, portable, runtimeRoot, version }) {
  const source = path.resolve(executable);
  if (!portable) return source;
  // An immutable, versioned copy can be updated even while an older portable
  // wrapper is running. Windows startup must never target an extracted EXE.
  const digest = hash(source);
  const directory = path.join(path.resolve(runtimeRoot), String(version).replace(/[^a-zA-Z0-9.-]/g, '_')+'-'+digest.slice(0,16));
  const target = path.join(directory, 'Seal-Account-Manager.exe');
  if (source.toLowerCase() === target.toLowerCase()) return target;
  await fs.promises.mkdir(directory, { recursive: true });
  if (fs.existsSync(target) && hash(target) === digest) return target;
  const temporary = path.join(directory, crypto.randomUUID()+'.tmp');
  try {
    await fs.promises.copyFile(source, temporary, fs.constants.COPYFILE_EXCL);
    if (hash(temporary) !== digest) throw Error('The startup copy could not be verified.');
    await fs.promises.rename(temporary, target);
  } finally { try { await fs.promises.unlink(temporary); } catch {} }
  return target;
}
module.exports = { prepareStartupExecutable };
