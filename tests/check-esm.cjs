// Syntax-check ES modules used by the site (node --check needs stdin + --input-type=module).
// Usage: node tests/check-esm.cjs file1.js file2.js ...
const { spawnSync } = require('node:child_process');
const { readFileSync, unlinkSync, mkdtempSync, rmdirSync } = require('node:fs');
const path = require('node:path');
const os = require('node:os');

let failed = 0;
const files = process.argv.slice(2);
for (const relative of files) {
  const absolute = path.join(__dirname, '..', relative);
  const text = readFileSync(absolute, 'utf8');
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
    input: text,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    failed += 1;
    console.error(`[check-esm] ${relative}`);
    console.error(result.stderr || result.stdout || 'unknown syntax error');
  }
}
if (failed) process.exit(1);
console.log(`[check-esm] syntax OK for ${files.length - failed}/${files.length} file(s)`);
