'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const HOOK = path.join(__dirname, 'git-closure-gate-hook.js');
const SESSION_PREFIX = `spec-closure-gate-${process.pid}`;

const markerPath = (sessionId) =>
  path.join(os.tmpdir(), `claude-loaded-skills-${sessionId}.json`);

// Built at runtime so this file's own text never looks like a Git command to the hook.
const GIT = ['g', 'it'].join('');
const GH = ['g', 'h'].join('');
const COMMIT = `${GIT} commit -m x`;
const PUSH = `${GIT} push`;

let counter = 0;
const newSession = () => `${SESSION_PREFIX}-${counter++}`;

const runHook = (input) =>
  spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    cwd: ROOT,
  });

const withMarker = (sessionId, skills) =>
  fs.writeFileSync(markerPath(sessionId), JSON.stringify(skills));

test.afterEach(() => {
  for (let i = 0; i < counter; i++) {
    fs.rmSync(markerPath(`${SESSION_PREFIX}-${i}`), { force: true });
  }
});

const validIssueBody = () => `## Контекст
Описание.

## Affects
- scripts/x.js

## Docs to Read
- docs/x.md

## Key Invariants
- INV-1 Инвариант соблюдается.

## Acceptance Criteria
- [ ] AC-1 [behavior] Поведение проверяется тестом. Verify: scripts/x.spec.js "works"

## Test Requirement
- [ ] TR-1 [behavior] Регрессия покрыта тестом. Verify: scripts/x.spec.js "regression"

## Definition of Done
- [ ] DOD-1 [ci] Проверка CI успешна. Verify: ci "Test (scripts)"

## Dependencies
Нет.
`;

// Missing every required section: guaranteed invalid regardless of contract tweaks.
const invalidIssueBody = () => '## Acceptance Criteria\n- old criterion\n';

let tmpDir;
test.before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'closure-gate-spec-'));
  fs.writeFileSync(path.join(tmpDir, 'ok.md'), validIssueBody());
  fs.writeFileSync(path.join(tmpDir, 'bad.md'), invalidIssueBody());
});
test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('non-git commands pass through with no output', () => {
  const result = runHook({
    session_id: newSession(),
    tool_input: { command: 'ls -la' },
  });
  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, '');
});

test('commit without the task-lifecycle marker is blocked', () => {
  const result = runHook({
    session_id: newSession(),
    tool_input: { command: COMMIT },
  });
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /task-lifecycle/);
  assert.strictEqual(result.stdout, '');
});

test('push without the task-lifecycle marker is blocked', () => {
  const result = runHook({
    session_id: newSession(),
    tool_input: { command: PUSH },
  });
  assert.strictEqual(result.status, 2);
});

test('commands that only mention a Git closure command pass through', () => {
  for (const command of [`echo ${COMMIT}`, `grep "${PUSH}" notes.md`]) {
    const result = runHook({ session_id: newSession(), tool_input: { command } });
    assert.strictEqual(result.status, 0, command);
    assert.strictEqual(result.stdout, '', command);
  }
});

test('chained and option-prefixed invocations are still gated', () => {
  for (const command of [
    `cd repo && ${COMMIT}`,
    `${GIT} -C repo push origin main`,
    `FOO=1 ${COMMIT}`,
    `${GIT} add . ; ${COMMIT}`,
  ]) {
    const result = runHook({ session_id: newSession(), tool_input: { command } });
    assert.strictEqual(result.status, 2, command);
  }
});

test('commit/push without a session id is blocked', () => {
  const result = runHook({ tool_input: { command: COMMIT } });
  assert.strictEqual(result.status, 2);
});

test('commit with a different skill loaded is still blocked', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['js-conventions']);
  const result = runHook({
    session_id: sessionId,
    tool_input: { command: COMMIT },
  });
  assert.strictEqual(result.status, 2);
});

test('commit with task-lifecycle loaded asks the human to confirm', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['task-lifecycle']);
  const result = runHook({
    session_id: sessionId,
    tool_input: { command: COMMIT },
  });
  assert.strictEqual(result.status, 0);
  const { hookSpecificOutput } = JSON.parse(result.stdout);
  assert.strictEqual(hookSpecificOutput.permissionDecision, 'ask');
  assert.match(hookSpecificOutput.permissionDecisionReason, /before committing/);
});

test('push with a plugin-namespaced task-lifecycle marker asks the human', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['plugin:task-lifecycle']);
  const result = runHook({
    session_id: sessionId,
    tool_input: { command: PUSH },
  });
  assert.strictEqual(result.status, 0);
  const { hookSpecificOutput } = JSON.parse(result.stdout);
  assert.strictEqual(hookSpecificOutput.permissionDecision, 'ask');
  assert.match(hookSpecificOutput.permissionDecisionReason, /Pre-push check/);
});

const okBodyFile = () => path.join(tmpDir, 'ok.md');
const badBodyFile = () => path.join(tmpDir, 'bad.md');
const ISSUE_CREATE_OK = () => `${GH} issue create --title t --body-file ${okBodyFile()}`;
const ISSUE_CREATE_BAD = () => `${GH} issue create --title t --body-file ${badBodyFile()}`;
const ISSUE_EDIT_OK = () => `${GH} issue edit 5 --body-file ${okBodyFile()}`;
const ISSUE_EDIT_BAD = () => `${GH} issue edit 5 --body-file ${badBodyFile()}`;

test('issue create/edit without the issues marker is blocked', () => {
  for (const command of [ISSUE_EDIT_OK(), ISSUE_CREATE_OK()]) {
    const result = runHook({ session_id: newSession(), tool_input: { command } });
    assert.strictEqual(result.status, 2, command);
    assert.match(result.stderr, /issues skill/, command);
    assert.strictEqual(result.stdout, '', command);
  }
});

test('issue create/edit without a session id is blocked', () => {
  const result = runHook({ tool_input: { command: ISSUE_EDIT_OK() } });
  assert.strictEqual(result.status, 2);
});

test('issue edit with a different skill loaded is still blocked', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['task-lifecycle']);
  const result = runHook({
    session_id: sessionId,
    tool_input: { command: ISSUE_EDIT_OK() },
  });
  assert.strictEqual(result.status, 2);
});

test('issue create/edit with the issues skill loaded and a valid body passes silently', () => {
  for (const skills of [['issues'], ['plugin:issues']]) {
    for (const command of [ISSUE_EDIT_OK(), ISSUE_CREATE_OK()]) {
      const sessionId = newSession();
      withMarker(sessionId, skills);
      const result = runHook({ session_id: sessionId, tool_input: { command } });
      assert.strictEqual(result.status, 0, command);
      assert.strictEqual(result.stdout, '', command);
    }
  }
});

test('issue create/edit with an invalid --body-file is blocked with the linter problems', () => {
  for (const command of [ISSUE_CREATE_BAD(), ISSUE_EDIT_BAD()]) {
    const sessionId = newSession();
    withMarker(sessionId, ['issues']);
    const result = runHook({ session_id: sessionId, tool_input: { command } });
    assert.strictEqual(result.status, 2, command);
    assert.match(result.stderr, /issue-lint/, command);
    assert.match(result.stderr, /legacy format is not allowed/, command);
  }
});

test('issue create with inline --body, no body flag, or stdin is blocked mentioning --body-file', () => {
  const commands = [
    `${GH} issue create --title t --body "inline text"`,
    `${GH} issue create --title t`,
    `${GH} issue create --title t --body-file -`,
  ];
  for (const command of commands) {
    const sessionId = newSession();
    withMarker(sessionId, ['issues']);
    const result = runHook({ session_id: sessionId, tool_input: { command } });
    assert.strictEqual(result.status, 2, command);
    assert.match(result.stderr, /--body-file/, command);
  }
});

test('issue edit without any body flag passes; edit with inline --body is blocked', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['issues']);
  const passResult = runHook({
    session_id: sessionId,
    tool_input: { command: `${GH} issue edit 5 --add-label x` },
  });
  assert.strictEqual(passResult.status, 0);
  assert.strictEqual(passResult.stdout, '');

  const blockResult = runHook({
    session_id: sessionId,
    tool_input: { command: `${GH} issue edit 5 --body "inline text"` },
  });
  assert.strictEqual(blockResult.status, 2);
  assert.match(blockResult.stderr, /--body-file/);
});

test('chained and env-prefixed issue writes are still gated', () => {
  for (const command of [
    `cd repo && ${ISSUE_EDIT_OK()}`,
    `FOO=1 ${ISSUE_CREATE_OK()}`,
    `${GH} issue view 1 | cat ; ${ISSUE_EDIT_OK()}`,
  ]) {
    const result = runHook({ session_id: newSession(), tool_input: { command } });
    assert.strictEqual(result.status, 2, command);
  }
});

test('other issue commands and mere mentions pass through', () => {
  for (const command of [
    `${GH} issue comment 1 --body x`,
    `${GH} issue view 1`,
    `${GH} issue list --state open`,
    `echo ${ISSUE_EDIT_OK()}`,
    `grep "${ISSUE_CREATE_OK()}" notes.md`,
  ]) {
    const result = runHook({ session_id: newSession(), tool_input: { command } });
    assert.strictEqual(result.status, 0, command);
    assert.strictEqual(result.stdout, '', command);
  }
});

test('gh.exe and absolute-path invocations of issue writes are gated', () => {
  for (const command of [
    `${GH}.exe issue edit 1`,
    `/usr/bin/${GH} issue create --title t`,
    `C:\\tools\\${GH}.exe issue edit 1`,
  ]) {
    const result = runHook({ session_id: newSession(), tool_input: { command } });
    assert.strictEqual(result.status, 2, command);
  }
});

test('a corrupt marker file blocks issue writes instead of opening the gate', () => {
  const sessionId = newSession();
  fs.writeFileSync(markerPath(sessionId), '{not json');
  const result = runHook({
    session_id: sessionId,
    tool_input: { command: ISSUE_EDIT_OK() },
  });
  assert.strictEqual(result.status, 2);
});

test('a marker file containing a JSON object (not an array) blocks gh issue writes', () => {
  const sessionId = newSession();
  fs.writeFileSync(markerPath(sessionId), JSON.stringify({ issues: true }));
  const result = runHook({
    session_id: sessionId,
    tool_input: { command: ISSUE_EDIT_OK() },
  });
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /issues skill/);
});

test('glued short flags (-Fpath, -btext) are recognized like their long forms', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['issues']);

  const blockedCreate = runHook({
    session_id: sessionId,
    tool_input: { command: `${GH} issue create --title t -bSomeInlineText` },
  });
  assert.strictEqual(blockedCreate.status, 2);
  assert.match(blockedCreate.stderr, /--body-file/);

  const blockedEdit = runHook({
    session_id: sessionId,
    tool_input: { command: `${GH} issue edit 5 -F${badBodyFile()}` },
  });
  assert.strictEqual(blockedEdit.status, 2);
  assert.match(blockedEdit.stderr, /issue-lint/);

  const passedEdit = runHook({
    session_id: sessionId,
    tool_input: { command: `${GH} issue edit 5 -F${okBodyFile()}` },
  });
  assert.strictEqual(passedEdit.status, 0);
});

test('a --body-file path outside the repo cwd and OS temp dir is blocked', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['issues']);
  const outsidePath =
    process.platform === 'win32' ? 'C:\\Windows\\win.ini' : '/etc/hostname';
  const result = runHook({
    session_id: sessionId,
    tool_input: { command: `${GH} issue create --title t --body-file ${outsidePath}` },
  });
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /outside the allowed roots/);
});

test('a Git-Bash POSIX-style --body-file path is normalized on win32', { skip: process.platform !== 'win32' }, () => {
  const sessionId = newSession();
  withMarker(sessionId, ['issues']);
  const posixPath = `/${okBodyFile()[0].toLowerCase()}${okBodyFile().slice(2).replace(/\\/g, '/')}`;
  const result = runHook({
    session_id: sessionId,
    tool_input: { command: `${GH} issue create --title t --body-file ${posixPath}` },
  });
  assert.strictEqual(result.status, 0, result.stderr);
});

test('an unreadable --body-file path blocks with a clear message', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['issues']);
  const result = runHook({
    session_id: sessionId,
    tool_input: {
      command: `${GH} issue create --title t --body-file ${path.join(tmpDir, 'missing.md')}`,
    },
  });
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /could not verify/);
});

const runMcp = (toolInput, sessionId) =>
  runHook({
    session_id: sessionId ?? newSession(),
    tool_name: 'mcp__github__issue_write',
    tool_input: toolInput,
  });

test('MCP issue_write create with an invalid body is blocked', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['issues']);
  const result = runMcp({ method: 'create', body: invalidIssueBody() }, sessionId);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /issue-lint/);
});

test('MCP issue_write create with a valid body passes silently', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['issues']);
  const result = runMcp({ method: 'create', body: validIssueBody() }, sessionId);
  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, '');
});

test('MCP issue_write update without a body passes', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['issues']);
  const result = runMcp({ method: 'update' }, sessionId);
  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, '');
});

test('MCP issue_write update with an invalid body is blocked', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['issues']);
  const result = runMcp({ method: 'update', body: invalidIssueBody() }, sessionId);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /issue-lint/);
});

test('MCP issue_write without the issues skill loaded is blocked', () => {
  const result = runMcp({ method: 'create', body: validIssueBody() });
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /issues skill/);
});

test('a namespaced MCP tool name (…issue_write) is recognized', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['issues']);
  const result = runHook({
    session_id: sessionId,
    tool_name: 'mcp__github__issue_write',
    tool_input: { method: 'create', body: validIssueBody() },
  });
  assert.strictEqual(result.status, 0);
});

test('a marker file containing a JSON object (not an array) blocks MCP issue_write', () => {
  const sessionId = newSession();
  fs.writeFileSync(markerPath(sessionId), JSON.stringify({ issues: true }));
  const result = runMcp({ method: 'create', body: validIssueBody() }, sessionId);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /issues skill/);
});

test('.claude/settings.json gates the MCP issue_write tool through this hook', () => {
  const settings = JSON.parse(
    fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf8'),
  );
  const matchers = settings.hooks.PreToolUse.map((entry) => entry.matcher);
  assert.ok(matchers.includes('mcp__github__issue_write'));
  const entry = settings.hooks.PreToolUse.find(
    (candidate) => candidate.matcher === 'mcp__github__issue_write',
  );
  assert.ok(
    entry.hooks.some((hook) => hook.command.includes('git-closure-gate-hook.js')),
  );
});
