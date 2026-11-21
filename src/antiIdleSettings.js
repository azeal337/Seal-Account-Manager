const fs = require('fs');
const path = require('path');
function validateInterval(value) {
  if (!Number.isInteger(value) || value < 1 || value > 86400) throw new Error('Choose an interval from 1 second to 24 hours.');
  return value;
}
function read(file) {
  try { return { intervalSeconds: validateInterval(JSON.parse(fs.readFileSync(file, 'utf8')).intervalSeconds) }; }
  catch { return { intervalSeconds: 240 }; }
}
function save(file, value) {
  const settings = { intervalSeconds: validateInterval(value) };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(settings));
  fs.renameSync(file + '.tmp', file);
  return settings;
}
module.exports = { validateInterval, read, save };
