const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { APPS, requiredSkillsFor } = require('./required-skills');

const hook = path.join(__dirname, 'skill-gate-hook.js');

const runHook = (relativePath) =>
  spawnSync(process.execPath, [hook], {
    input: JSON.stringify({
      session_id: `required-skills-spec-${process.pid}-${Date.now()}`,
      tool_input: { file_path: relativePath },
    }),
    encoding: 'utf8',
  });

test('requiredSkillsFor maps a directory mention to that app set', () => {
  for (const app of APPS) {
    assert.deepStrictEqual(requiredSkillsFor(`- ${app.dir}/src/x`), app.skills);
  }
});

test('requiredSkillsFor returns nothing when no app is mentioned', () => {
  assert.deepStrictEqual(requiredSkillsFor('.claude/ralph/prompts.js'), []);
});

test('skill-gate-hook blocks with exactly the shared skill set per app', () => {
  for (const app of APPS) {
    const result = runHook(`${app.dir}/src/example.ts`);
    assert.strictEqual(result.status, 2, app.dir);
    const listed = /not loaded in this session yet: ([^.]+)\./.exec(
      result.stderr,
    );
    assert.ok(listed, result.stderr);
    assert.deepStrictEqual(listed[1].split(', '), app.skills);
  }
});
