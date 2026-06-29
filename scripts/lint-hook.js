#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook for Write|Edit events.
 * Reads JSON from stdin, extracts the changed file path,
 * then runs prettier + eslint --fix on that single file only.
 * Avoids linting the entire project on every file save.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const filePath = input?.tool_input?.file_path;
    if (!filePath || !filePath.endsWith('.ts')) return;

    spawnSync('npx', ['prettier', '--write', filePath], {
      cwd: projectRoot,
      stdio: 'pipe',
    });

    spawnSync('npx', ['eslint', '--fix', filePath], {
      cwd: projectRoot,
      stdio: 'pipe',
    });
  } catch (_) {}
});
