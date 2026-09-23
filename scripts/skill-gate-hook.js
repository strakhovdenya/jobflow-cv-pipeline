#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook for Write|Edit.
 * Blocks (exit 2) the first code edit in apps/api or apps/web until the
 * skills required for that app were loaded in this session (recorded by
 * skill-marker-hook.js). Fails open on any internal error.
 *
 * Bash-driven edits (python, sed, ...) are not covered — the hook cannot
 * tell which files a shell command writes.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const BASE_SKILLS = [
  'js-conventions',
  'js-gof',
  'js-data-structures',
  'error-handling',
];

const RULES = [
  {
    appDir: path.join(repoRoot, 'apps', 'api'),
    extensions: /\.(ts|js|mjs|cjs)$/,
    label: 'backend (apps/api)',
    skills: [...BASE_SKILLS, 'nestjs-best-practices'],
  },
  {
    appDir: path.join(repoRoot, 'apps', 'web'),
    extensions: /\.(ts|tsx|js|jsx|css)$/,
    label: 'frontend (apps/web)',
    skills: ['vercel-react-best-practices', 'ui-ux-pro-max', ...BASE_SKILLS],
  },
];

// Windows paths are case-insensitive and hooks may report the drive letter in either case.
const normalize = (value) =>
  process.platform === 'win32' ? value.toLowerCase() : value;

const markerPath = (sessionId) =>
  path.join(os.tmpdir(), `claude-loaded-skills-${sessionId}.json`);

const isLoaded = (loaded, skill) =>
  loaded.some((name) => name === skill || name.endsWith(`:${skill}`));

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const sessionId = input?.session_id;
    const filePath = input?.tool_input?.file_path;
    if (!sessionId || !filePath) return;

    const absolutePath = normalize(path.resolve(repoRoot, filePath));
    const rule = RULES.find(
      (candidate) =>
        absolutePath.startsWith(normalize(candidate.appDir + path.sep)) &&
        candidate.extensions.test(absolutePath) &&
        !absolutePath.includes(`${path.sep}node_modules${path.sep}`),
    );
    if (!rule) return;

    const file = markerPath(sessionId);
    const loaded = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf8'))
      : [];
    const missing = rule.skills.filter((skill) => !isLoaded(loaded, skill));
    if (missing.length === 0) return;

    process.stderr.write(
      `Blocked: this is a ${rule.label} code edit, but these skills were not ` +
        `loaded in this session yet: ${missing.join(', ')}. Load each with ` +
        `the Skill tool first (project rule: CLAUDE.md "Skills пакета ` +
        `metaskills"), then repeat the edit.\n`,
    );
    process.exit(2);
  } catch (error) {
    process.stderr.write(`skill-gate-hook (ignored): ${error.message}\n`);
  }
});
