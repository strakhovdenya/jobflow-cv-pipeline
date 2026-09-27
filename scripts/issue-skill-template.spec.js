'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SKILL = path.join(ROOT, '.claude', 'skills', 'issues', 'SKILL.md');
const LINTER = path.join(__dirname, 'issue-lint.js');

const exampleBody = () => {
  const skill = fs.readFileSync(SKILL, 'utf8');
  const match = skill.match(/### Пример Body\s+\`\`\`markdown\n([\s\S]*?)\n\`\`\`/);
  assert.ok(match, 'Пример Body fenced block not found');
  return match[1];
};

const lintExample = (body) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-skill-template-'));
  const issue = path.join(dir, 'issue.md');
  fs.writeFileSync(issue, body);
  const run = spawnSync(process.execPath, [LINTER, issue, '--require-v2'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  fs.rmSync(dir, { recursive: true });
  return run;
};

test('issues skill example body passes the v2 issue contract', () => {
  const run = lintExample(exampleBody());
  assert.strictEqual(run.status, 0, run.stderr || run.stdout);
  const result = JSON.parse(run.stdout);
  assert.strictEqual(result.format, 'v2');
  assert.deepStrictEqual(result.problems, []);
});

test('issues skill example fails when any item ID is removed', () => {
  const body = exampleBody();
  const ids = [...body.matchAll(/^- (?:\[ \] )?([A-Z]+-[1-9][0-9]*) /gm)].map(
    (match) => match[1],
  );
  assert.ok(ids.length > 0, 'example has no item IDs');

  for (const id of ids) {
    const run = lintExample(body.replace(`${id} `, ''));
    assert.strictEqual(run.status, 1, `${id} unexpectedly passed\n${run.stdout}`);
  }
});
