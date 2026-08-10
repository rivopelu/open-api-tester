const { cpSync, rmSync } = require('node:fs');
const path = require('node:path');

const pkgDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pkgDir, '../..');
const src = path.join(pkgDir, 'dist');
const dest = path.join(repoRoot, 'dist');

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });