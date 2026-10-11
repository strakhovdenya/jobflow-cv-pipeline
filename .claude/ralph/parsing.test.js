const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { changedFilePathsFromPorcelain, hasCodeChanges } = require('./parsing');
const { gitPorcelainStatus } = require('./github');

test('returns no paths for empty status', () => {
  assert.deepStrictEqual(changedFilePathsFromPorcelain(''), []);
  assert.strictEqual(hasCodeChanges(''), false);
});

test('parses -z status with renames, spaces and untracked directories', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ralph-parsing-'));
  const run = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  try {
    run('init', '-q');
    run('config', 'user.email', 'test@example.invalid');
    run('config', 'user.name', 'Test');
    run('config', 'commit.gpgsign', 'false');
    fs.writeFileSync(path.join(dir, 'old-name.js'), 'const value = 1;\n');
    fs.writeFileSync(path.join(dir, 'kept.js'), 'const kept = 1;\n');
    run('add', '-A');
    run('commit', '-q', '-m', 'init');

    run('mv', 'old-name.js', 'new-name.js');
    fs.writeFileSync(path.join(dir, 'kept.js'), 'const kept = 2;\n');
    fs.writeFileSync(path.join(dir, 'файл с пробелом.md'), 'text\n');
    fs.mkdirSync(path.join(dir, 'fresh-dir'));
    fs.writeFileSync(path.join(dir, 'fresh-dir', 'a.js'), 'a\n');
    fs.writeFileSync(path.join(dir, 'fresh-dir', 'b.js'), 'b\n');

    const paths = changedFilePathsFromPorcelain(gitPorcelainStatus({ cwd: dir }));
    assert.deepStrictEqual([...paths].sort(), ['fresh-dir/a.js', 'fresh-dir/b.js', 'kept.js', 'new-name.js', 'файл с пробелом.md']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('keeps the first path intact for a leading-space status', () => {
  assert.deepStrictEqual(changedFilePathsFromPorcelain(' M package.json\0'), ['package.json']);
});

test('treats a docs-only status as no code changes', () => {
  assert.strictEqual(hasCodeChanges(' M README.md\0?? docs/new.txt\0'), false);
  assert.strictEqual(hasCodeChanges(' M README.md\0 M src/app.js\0'), true);
});
