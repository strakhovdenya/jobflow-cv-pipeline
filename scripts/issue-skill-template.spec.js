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

const CONTEXT_PARTS = [
  'Проблема:',
  'Почему важно:',
  'После задачи:',
  'Граница:',
];

const readSkill = () => fs.readFileSync(SKILL, 'utf8');

const exampleBody = () => {
  const match = readSkill().match(
    /### Пример Body\s+\`\`\`markdown\n([\s\S]*?)\n\`\`\`/,
  );
  assert.ok(match, 'Пример Body fenced block not found');
  return match[1];
};

const contextOf = (body) => {
  const match = body.match(/^## Контекст\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  return match ? match[1] : '';
};

const missingContextParts = (body) => {
  const lines = contextOf(body).split('\n');
  return CONTEXT_PARTS.filter(
    (part) => !lines.some((line) => line.startsWith(part)),
  );
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

test('issues skill example context has all four parts', () => {
  assert.deepStrictEqual(missingContextParts(exampleBody()), []);
  const skill = readSkill();
  for (const part of CONTEXT_PARTS) {
    assert.ok(skill.includes(`\`${part}\``), `rule does not name ${part}`);
  }
});

test('detects a missing part in the example context', () => {
  const body = exampleBody();
  for (const part of CONTEXT_PARTS) {
    const stripped = body.replace(new RegExp(`^${part}`, 'm'), '');
    assert.deepStrictEqual(missingContextParts(stripped), [part]);
  }
});
