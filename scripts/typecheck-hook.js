#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook for Write|Edit events.
 * Reads JSON from stdin, extracts the changed file path, detects which
 * app it belongs to (apps/api or apps/web), then runs that app's own
 * `tsc --noEmit` so type errors are reported against the correct
 * tsconfig instead of a nonexistent root one.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '..');
const APPS = ['api', 'web'];

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

    const tscBin = path.join(appRoot, 'node_modules', 'typescript', 'bin', 'tsc');
    if (!fs.existsSync(tscBin)) return;

    spawnSync(process.execPath, [tscBin, '--noEmit'], {
      cwd: appRoot,
      stdio: 'inherit',
    });
  } catch {
    // best-effort — never block the tool call on a hook failure
  }
});
