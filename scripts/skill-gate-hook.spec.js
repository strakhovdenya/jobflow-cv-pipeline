const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const hook = path.join(__dirname, 'skill-gate-hook.js');

const markerPath = (sessionId) =>
  path.join(os.tmpdir(), `claude-loaded-skills-${sessionId}.json`);

const runHook = (relativePath, sessionId) =>
  spawnSync(process.execPath, [hook], {
    input: JSON.stringify({
      session_id: sessionId,
      tool_input: { file_path: relativePath },
    }),
    encoding: 'utf8',
  });

test('skill-gate-hook blocks an edit to project-management/DECISIONS.md without the adr skill loaded', () => {
  const sessionId = `skill-gate-hook-spec-decisions-blocked-${process.pid}`;
  const result = runHook('project-management/DECISIONS.md', sessionId);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /an ADR entry \(project-management\/DECISIONS\.md\) edit/);
  assert.match(result.stderr, /not loaded in this session yet: adr\./);
});

test('skill-gate-hook allows an edit to project-management/DECISIONS.md once the adr skill was loaded', () => {
  const sessionId = `skill-gate-hook-spec-decisions-allowed-${process.pid}`;
  const marker = markerPath(sessionId);
  fs.writeFileSync(marker, JSON.stringify(['adr']));
  try {
    const result = runHook('project-management/DECISIONS.md', sessionId);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stderr, '');
  } finally {
    fs.rmSync(marker, { force: true });
  }
});

test('skill-gate-hook does not gate an unrelated project-management file', () => {
  const sessionId = `skill-gate-hook-spec-unrelated-${process.pid}`;
  const result = runHook('project-management/CHANGELOG.md', sessionId);
  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stderr, '');
});
