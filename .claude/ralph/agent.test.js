const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const { runAgent, buildClaudeArgs } = require('./agent');

const node = (script) => ({ cmd: process.execPath, args: ['-e', script] });

// A killed process whose parent is gone can stay a zombie (state Z) until PID 1 reaps it — in a
// container without a reaping init that never happens, yet the process is dead.
const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    return stat.slice(stat.lastIndexOf(')') + 2)[0] !== 'Z';
  } catch {
    return true;
  }
};

test('a hanging process is killed after timeoutMs and reported as a failure', async () => {
  const started = Date.now();
  const result = await runAgent('prompt', os.tmpdir(), null, {
    timeoutMs: 300,
    command: node('console.log(JSON.stringify({ pid: process.pid })); setInterval(() => {}, 1000);'),
  });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /timed out/);
  assert.ok(Date.now() - started < 8000);
});

test('the whole process tree is killed on timeout (POSIX process group)', async () => {
  const script = [
    "const { spawn } = require('child_process');",
    "const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
    'console.log(`pid:${grandchild.pid}`);',
    'setInterval(() => {}, 1000);',
  ].join('\n');
  const lines = [];
  const write = process.stdout.write;
  process.stdout.write = (chunk, ...rest) => {
    lines.push(String(chunk));
    return write.call(process.stdout, chunk, ...rest);
  };
  let result;
  try {
    result = await runAgent('', os.tmpdir(), null, { timeoutMs: 500, command: node(script) });
  } finally {
    process.stdout.write = write;
  }
  assert.strictEqual(result.ok, false);
  const match = /pid:(\d+)/.exec(lines.join(''));
  assert.ok(match, 'grandchild pid printed');
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.strictEqual(isAlive(Number(match[1])), false);
});

const runAndCaptureGrandchild = async (script, options) => {
  const lines = [];
  const write = process.stdout.write;
  process.stdout.write = (chunk, ...rest) => {
    lines.push(String(chunk));
    return write.call(process.stdout, chunk, ...rest);
  };
  let result;
  try {
    result = await runAgent('', os.tmpdir(), null, { ...options, command: node(script) });
  } finally {
    process.stdout.write = write;
  }
  const match = /pid:(\d+)/.exec(lines.join(''));
  assert.ok(match, 'grandchild pid printed');
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { result, grandchildPid: Number(match[1]) };
};

test('a tool process that ignores SIGTERM is still killed after claude exits', async () => {
  const script = [
    "const { spawn } = require('child_process');",
    "const grandchild = spawn(process.execPath, ['-e', \"process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)\"], { stdio: 'ignore' });",
    'console.log(`pid:${grandchild.pid}`);',
    "process.on('SIGTERM', () => process.exit(0));",
    'setInterval(() => {}, 1000);',
  ].join('\n');
  const { result, grandchildPid } = await runAndCaptureGrandchild(script, { timeoutMs: 500 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(isAlive(grandchildPid), false);
});

test('a background process left by a normally finished agent is killed', async () => {
  const script = [
    "const { spawn } = require('child_process');",
    "const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
    'grandchild.unref();',
    'console.log(`pid:${grandchild.pid}`);',
  ].join('\n');
  const { result, grandchildPid } = await runAndCaptureGrandchild(script, {});
  assert.strictEqual(result.ok, true);
  assert.strictEqual(isAlive(grandchildPid), false);
});

test('is_error in the result event fails the call even with exit code 0', async () => {
  const event = { type: 'result', is_error: true, subtype: 'error_max_turns', total_cost_usd: 0.42 };
  const result = await runAgent('', os.tmpdir(), null, {
    command: node(`console.log(${JSON.stringify(JSON.stringify(event))});`),
  });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /error_max_turns/);
  assert.strictEqual(result.costUsd, 0.42);
});

test('a successful run returns assistant text and cost', async () => {
  const events = [
    { type: 'assistant', message: { content: [{ type: 'text', text: 'готово\nDONE' }] } },
    { type: 'result', is_error: false, total_cost_usd: 1.5 },
  ];
  const script = events.map((e) => `console.log(${JSON.stringify(JSON.stringify(e))});`).join('');
  const result = await runAgent('', os.tmpdir(), null, { command: node(script) });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.output, 'готово\nDONE');
  assert.strictEqual(result.costUsd, 1.5);
});

test('a multi-byte character split across stdout chunks is decoded intact', async () => {
  const line = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Блокировано' }] } });
  // Write the UTF-8 bytes in two chunks, cutting a Cyrillic letter in half.
  const script = [
    `const bytes = Buffer.from(${JSON.stringify(line + '\n')}, 'utf8');`,
    "const cut = bytes.indexOf(Buffer.from('Б')) + 1;",
    'process.stdout.write(bytes.subarray(0, cut));',
    'setTimeout(() => process.stdout.write(bytes.subarray(cut)), 50);',
  ].join('\n');
  const result = await runAgent('', os.tmpdir(), null, { command: node(script) });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.output, 'Блокировано');
});

test('a child that exits before reading stdin does not crash the controller', async () => {
  const result = await runAgent('x'.repeat(4 * 1024 * 1024), os.tmpdir(), null, {
    command: node('process.exit(3)'),
  });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /exited 3/);
});

test('the env option replaces the parent environment', async () => {
  process.env.GH_TOKEN_TEST_398 = 'secret';
  try {
    const script = "console.log(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: String(process.env.GH_TOKEN_TEST_398) }] } }));";
    const result = await runAgent('', os.tmpdir(), null, {
      env: { PATH: process.env.PATH },
      command: node(script),
    });
    assert.strictEqual(result.output, 'undefined');
  } finally {
    delete process.env.GH_TOKEN_TEST_398;
  }
});

test('buildClaudeArgs passes turn and USD limits', () => {
  const args = buildClaudeArgs(50, 12.345);
  assert.deepStrictEqual(args.slice(args.indexOf('--max-turns'), args.indexOf('--max-turns') + 2), ['--max-turns', '50']);
  assert.deepStrictEqual(args.slice(args.indexOf('--max-budget-usd'), args.indexOf('--max-budget-usd') + 2), ['--max-budget-usd', '12.35']);
  assert.ok(!buildClaudeArgs(null, null).includes('--max-budget-usd'));
});
