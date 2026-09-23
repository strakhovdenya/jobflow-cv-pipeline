#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook for the Skill tool.
 * Records which skills were loaded in the current session so that
 * skill-gate-hook.js can require them before code edits.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const markerPath = (sessionId) =>
  path.join(os.tmpdir(), `claude-loaded-skills-${sessionId}.json`);

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const sessionId = input?.session_id;
    const skill = input?.tool_input?.skill;
    if (!sessionId || !skill) return;

    const file = markerPath(sessionId);
    let loaded = [];
    if (fs.existsSync(file)) {
      loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    if (!loaded.includes(skill)) loaded.push(skill);
    fs.writeFileSync(file, JSON.stringify(loaded));
  } catch (error) {
    process.stderr.write(`skill-marker-hook: ${error.message}\n`);
  }
});
