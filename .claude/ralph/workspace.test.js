const test = require('node:test');
const assert = require('node:assert');
const { buildTaskRules } = require('./prompts');
const { hasDelRalphMarker } = require('./workspace');

const promptMarkerExamples = () => {
  const rules = buildTaskRules(150, []).join('\n');
  const spans = [...rules.matchAll(/`([^`\n]*DEL_RALPH:[^`\n]*)`/g)];
  return spans.map((match) => match[1]);
};

test('prompt still documents at least one marker example', () => {
  assert.ok(promptMarkerExamples().length > 0);
});

test('every marker example from the prompt is detected as a first-line marker', () => {
  for (const example of promptMarkerExamples()) {
    assert.ok(hasDelRalphMarker(`${example}\nconst a = 1;\n`), example);
  }
});

test('detects the bare form and every allowed comment prefix', () => {
  const prefixes = ['', '// ', '//', '# ', '/* ', '<!-- ', '-- ', '  // '];
  for (const prefix of prefixes) {
    const head = `${prefix}DEL_RALPH: migrated\nrest`;
    assert.ok(hasDelRalphMarker(head), JSON.stringify(prefix));
  }
});

test('handles CRLF, BOM and a marker-only file', () => {
  assert.ok(hasDelRalphMarker('// DEL_RALPH: x\r\nrest'));
  assert.ok(hasDelRalphMarker('﻿// DEL_RALPH: x\nrest'));
  assert.ok(hasDelRalphMarker('DEL_RALPH: x'));
});

test('ignores a marker that is not on the first line', () => {
  assert.strictEqual(hasDelRalphMarker('const a = 1;\n// DEL_RALPH: x\n'), false);
  assert.strictEqual(hasDelRalphMarker('\n// DEL_RALPH: x\n'), false);
});

test('ignores mentions of the marker inside other text', () => {
  assert.strictEqual(hasDelRalphMarker('// see DEL_RALPH: docs\n'), false);
  assert.strictEqual(hasDelRalphMarker('const s = "DEL_RALPH: x";\n'), false);
  assert.strictEqual(hasDelRalphMarker(''), false);
});

// --- permission profiles and project gate (issue #398) ---

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  writeAgentPermissions,
  writeReviewerPermissions,
  writeCodeReviewPermissions,
  runProjectGate,
} = require('./workspace');

const withTempDir = (fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ralph-workspace-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const readSettings = (dir) =>
  JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'settings.local.json'), 'utf8')).permissions;

const PROFILES = {
  agent: writeAgentPermissions,
  reviewer: writeReviewerPermissions,
  codeReview: writeCodeReviewPermissions,
};

test('no profile allows npm run or bare npx; checks are an explicit npx list', () => {
  for (const [name, write] of Object.entries(PROFILES)) {
    withTempDir((dir) => {
      write(dir);
      const { allow, deny } = readSettings(dir);
      assert.ok(!allow.some((rule) => rule.startsWith('Bash(npm run')), name);
      assert.ok(!allow.includes('Bash(npx *)'), name);
      for (const tool of ['tsc', 'jest', 'eslint', 'vitest']) {
        assert.ok(allow.includes(`Bash(npx ${tool} *)`), `${name}: ${tool}`);
      }
      assert.ok(allow.every((rule) => !rule.startsWith('Bash(npx') || /^Bash\(npx (tsc|jest|eslint|vitest)( \*)?\)$/.test(rule)), name);
      assert.ok(deny.includes('Bash(npx prisma migrate reset*)'), name);
      assert.ok(deny.includes('Bash(npx prisma db push*)'), name);
    });
  }
});

test('reviewer and code-review profiles deny every Edit and Write', () => {
  for (const write of [writeReviewerPermissions, writeCodeReviewPermissions]) {
    withTempDir((dir) => {
      write(dir);
      const { allow, deny } = readSettings(dir);
      assert.ok(deny.includes('Edit(**)'));
      assert.ok(deny.includes('Write(**)'));
      assert.ok(!allow.some((rule) => /^(Edit|Write)\b/.test(rule)));
    });
  }
  withTempDir((dir) => {
    writeCodeReviewPermissions(dir);
    assert.ok(readSettings(dir).allow.includes('Skill(code-review)'));
  });
});

test('agent profile keeps Edit/Write but denies protected paths', () => {
  withTempDir((dir) => {
    writeAgentPermissions(dir);
    const { allow, deny } = readSettings(dir);
    assert.ok(allow.includes('Edit') && allow.includes('Write'));
    for (const pattern of ['.claude/**', 'scripts/**', '.github/**', '.husky/**', '.git/**', 'apps/api/prisma/prompts/**', 'apps/api/knowledge-sources/**']) {
      assert.ok(deny.includes(`Edit(${pattern})`), pattern);
      assert.ok(deny.includes(`Write(${pattern})`), pattern);
    }
  });
});

const initRepo = (dir) => {
  const run = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  run('init', '-q');
  fs.mkdirSync(path.join(dir, 'apps', 'api'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'apps', 'api', 'a.ts'), 'export {};\n');
  run('add', '-A');
  run('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init');
};

test('project gate runs fixed tool binaries without npm run', () => {
  withTempDir((dir) => {
    initRepo(dir);
    const calls = [];
    const result = runProjectGate(dir, ['apps/api', 'apps/web'], (cwd, script, args) => {
      calls.push([path.relative(dir, cwd), script, ...args].join(' '));
      return 'ok';
    });
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(calls, [
      'apps/api node_modules/typescript/bin/tsc --noEmit',
      'apps/api node_modules/eslint/bin/eslint.js {src,libs,test}/**/*.ts',
      'apps/api node_modules/jest/bin/jest.js',
      'apps/web node_modules/typescript/bin/tsc --noEmit',
      'apps/web node_modules/eslint/bin/eslint.js .',
      'apps/web node_modules/vitest/vitest.mjs run',
    ]);
    assert.ok(calls.every((call) => !call.includes('--fix') && !call.includes('npm')));
  });
});

test('project gate fails when a check changes the working tree', () => {
  withTempDir((dir) => {
    initRepo(dir);
    const result = runProjectGate(dir, ['apps/api'], (cwd, script) => {
      if (script.includes('jest')) fs.writeFileSync(path.join(dir, 'apps', 'api', 'a.ts'), 'changed\n');
      return 'ok';
    });
    assert.strictEqual(result.ok, false);
    assert.match(result.output, /git status changed while the gate was running/);
  });
});

test('project gate stops at the first failing check', () => {
  withTempDir((dir) => {
    initRepo(dir);
    const result = runProjectGate(dir, ['apps/api'], (cwd, script) => {
      if (script.includes('eslint')) throw Object.assign(new Error('lint failed'), { stdout: 'x.ts: error' });
      return 'ok';
    });
    assert.strictEqual(result.ok, false);
    assert.match(result.output, /x\.ts: error/);
    assert.doesNotMatch(result.output, /jest/);
  });
});
