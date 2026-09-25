#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook for Write|Edit events.
 * Reads JSON from stdin, extracts the changed file path, detects which
 * app it belongs to (apps/api or apps/web), then runs that app's own
 * local eslint --fix on the single file. Avoids linting the entire
 * project on every file save, and avoids running the wrong app's
 * eslint config/parser against the other app's files.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '..');
const logFile = path.join(__dirname, 'lint-hook.log');

const APPS = ['api', 'web'];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
}

// path.relative is case-insensitive on Windows (d:\ vs D:\) and reports a
// different drive as an absolute result, so it replaces a startsWith compare.
const isInside = (parent, child) => {
  const relative = path.relative(parent, child);
  return (
    relative !== '' &&
    relative.split(path.sep)[0] !== '..' &&
    !path.isAbsolute(relative)
  );
};

function findAppRoot(absoluteFilePath) {
  for (const app of APPS) {
    const appRoot = path.join(repoRoot, 'apps', app);
    if (isInside(appRoot, absoluteFilePath)) {
      return appRoot;
    }
  }
  return null;
}

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let filePath;
  try {
    const input = JSON.parse(raw);
    filePath = input?.tool_input?.file_path;
    if (!filePath || !/\.(ts|tsx)$/.test(filePath)) return;

    const absoluteFilePath = path.resolve(repoRoot, filePath);
    const appRoot = findAppRoot(absoluteFilePath);
    if (!appRoot) return;

    const eslintBin = path.join(appRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');
    if (!fs.existsSync(eslintBin)) return;

    const result = spawnSync(process.execPath, [eslintBin, '--fix', absoluteFilePath], {
      cwd: appRoot,
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
