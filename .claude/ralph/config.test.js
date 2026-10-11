const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { acquireLock, releaseLock } = require('./config');

const withLockDir = (body) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ralph-lock-'));
  try {
    body(path.join(dir, 'run.lock'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const alive = () => true;
const dead = () => false;

test('creates and releases the lock', () => {
  withLockDir((lockPath) => {
    acquireLock(lockPath, dead);
    assert.strictEqual(JSON.parse(fs.readFileSync(lockPath, 'utf8')).pid, process.pid);
    releaseLock(lockPath);
    assert.strictEqual(fs.existsSync(lockPath), false);
  });
});

test('refuses to overwrite a lock of a live process', () => {
  withLockDir((lockPath) => {
    const original = JSON.stringify({ pid: 4242, startedAt: '2026-01-01T00:00:00.000Z' });
    fs.writeFileSync(lockPath, original);
    assert.throws(() => acquireLock(lockPath, alive), /already active \(PID 4242/);
    assert.strictEqual(fs.readFileSync(lockPath, 'utf8'), original);
  });
});

test('treats EPERM as a live process', () => {
  withLockDir((lockPath) => {
    fs.writeFileSync(lockPath, JSON.stringify({ pid: 4242, startedAt: 'x' }));
    const realKill = process.kill;
    process.kill = () => {
      throw Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
    };
    try {
      assert.throws(() => acquireLock(lockPath), /already active/);
    } finally {
      process.kill = realKill;
    }
  });
});

test('takes over the lock of a dead process', () => {
  withLockDir((lockPath) => {
    fs.writeFileSync(lockPath, JSON.stringify({ pid: 4242, startedAt: 'x' }));
    acquireLock(lockPath, dead);
    assert.strictEqual(JSON.parse(fs.readFileSync(lockPath, 'utf8')).pid, process.pid);
  });
});

test('takes over a corrupt lock file', () => {
  withLockDir((lockPath) => {
    fs.writeFileSync(lockPath, '{ not json');
    acquireLock(lockPath, alive);
    assert.strictEqual(JSON.parse(fs.readFileSync(lockPath, 'utf8')).pid, process.pid);
  });
});
