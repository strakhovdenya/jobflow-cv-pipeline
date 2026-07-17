#!/usr/bin/env node
/**
 * lint-staged wrapper for apps/web (ESLint 9 flat config).
 * lint-staged invokes commands with cwd = repo root, but apps/web's
 * eslint.config.mjs (and next/eslint-plugin-next, which resolves the
 * pages directory from process.cwd()) only resolve correctly when run
 * with cwd = apps/web. Forwards all argv (lint-staged's absolute file
 * paths) unchanged.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const appRoot = path.resolve(__dirname, '..', 'apps', 'web');
const eslintBin = path.join(appRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');

const result = spawnSync(process.execPath, [eslintBin, '--fix', ...process.argv.slice(2)], {
  cwd: appRoot,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
