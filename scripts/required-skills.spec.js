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

// Picks an extension each app's own `extensions` regex actually matches,
// since scripts/Ralph only recognize .js/.mjs/.cjs, not .ts.
const sampleFileFor = (app) => {
  const ext = ['ts', 'js', 'tsx', 'jsx', 'mjs', 'cjs'].find((candidate) =>
    app.extensions.test(`x.${candidate}`),
  );
  return `src/example.${ext}`;
};

test('requiredSkillsFor maps a directory mention to that app set', () => {
  for (const app of APPS) {
    assert.deepStrictEqual(requiredSkillsFor(`- ${app.dir}/src/x`), app.skills);
  }
});

test('requiredSkillsFor returns nothing when no app is mentioned', () => {
  assert.deepStrictEqual(requiredSkillsFor('docs/README.md'), []);
});

test('requiredSkillsFor does not treat "." in a dir name as a wildcard', () => {
  assert.deepStrictEqual(requiredSkillsFor('Xclaude/ralph/prompts.js'), []);
});

test('skill-gate-hook blocks with exactly the shared skill set per app', () => {
  for (const app of APPS) {
    const result = runHook(`${app.dir}/${sampleFileFor(app)}`);
    assert.strictEqual(result.status, 2, app.dir);
    const listed = /not loaded in this session yet: ([^.]+)\./.exec(
      result.stderr,
    );
    assert.ok(listed, result.stderr);
    assert.deepStrictEqual(listed[1].split(', '), app.skills);
  }
});
