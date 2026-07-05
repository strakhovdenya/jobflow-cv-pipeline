#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook for Write|Edit events.
 * Reads JSON from stdin, extracts the changed file path,
 * then runs eslint --fix on that single file only.
 * Avoids linting the entire project on every file save.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const logFile = path.join(projectRoot, 'scripts', 'lint-hook.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
}

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let filePath;
  try {
    const input = JSON.parse(raw);
    filePath = input?.tool_input?.file_path;
    if (!filePath || !filePath.endsWith('.ts')) return;

    const result = spawnSync('npx', ['eslint', '--fix', filePath], {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf8',
    });

    if (result.error) {
      log(`ERROR spawning eslint for ${filePath}: ${result.error.message}`);
    } else if (result.status !== 0 && result.stderr) {
      log(`eslint exited ${result.status} for ${filePath}: ${result.stderr.trim()}`);
    }
  } catch (err) {
    log(`EXCEPTION for ${filePath ?? 'unknown'}: ${err.message}`);
  }
});
