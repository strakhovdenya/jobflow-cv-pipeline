'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOK = path.join(__dirname, 'git-closure-gate-hook.js');
const SESSION_PREFIX = `spec-closure-gate-${process.pid}`;

const markerPath = (sessionId) =>
  path.join(os.tmpdir(), `claude-loaded-skills-${sessionId}.json`);

// Built at runtime so this file's own text never looks like a Git command to the hook.
const GIT = ['g', 'it'].join('');
const COMMIT = `${GIT} commit -m x`;
const PUSH = `${GIT} push`;

let counter = 0;
const newSession = () => `${SESSION_PREFIX}-${counter++}`;

const runHook = (input) =>
  spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(input),
    encoding: 'utf8',
  });

const withMarker = (sessionId, skills) =>
  fs.writeFileSync(markerPath(sessionId), JSON.stringify(skills));

test.afterEach(() => {
  for (let i = 0; i < counter; i++) {
    fs.rmSync(markerPath(`${SESSION_PREFIX}-${i}`), { force: true });
  }
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

const GH = ['g', 'h'].join('');
const ISSUE_EDIT = `${GH} issue edit 1 --body-file b.md`;
const ISSUE_CREATE = `${GH} issue create --title t`;

test('issue create/edit without the issues marker is blocked', () => {
  for (const command of [ISSUE_EDIT, ISSUE_CREATE]) {
    const result = runHook({ session_id: newSession(), tool_input: { command } });
    assert.strictEqual(result.status, 2, command);
    assert.match(result.stderr, /issues skill/, command);
    assert.strictEqual(result.stdout, '', command);
  }
});

test('issue create/edit without a session id is blocked', () => {
  const result = runHook({ tool_input: { command: ISSUE_EDIT } });
  assert.strictEqual(result.status, 2);
});

test('issue edit with a different skill loaded is still blocked', () => {
  const sessionId = newSession();
  withMarker(sessionId, ['task-lifecycle']);
  const result = runHook({
    session_id: sessionId,
    tool_input: { command: ISSUE_EDIT },
  });
  assert.strictEqual(result.status, 2);
});

test('issue create/edit with the issues skill loaded passes silently', () => {
  for (const skills of [['issues'], ['plugin:issues']]) {
    for (const command of [ISSUE_EDIT, ISSUE_CREATE]) {
      const sessionId = newSession();
      withMarker(sessionId, skills);
      const result = runHook({ session_id: sessionId, tool_input: { command } });
      assert.strictEqual(result.status, 0, command);
      assert.strictEqual(result.stdout, '', command);
    }
  }
});

test('chained and env-prefixed issue writes are still gated', () => {
  for (const command of [
    `cd repo && ${ISSUE_EDIT}`,
    `FOO=1 ${ISSUE_CREATE}`,
    `${GH} issue view 1 | cat ; ${ISSUE_EDIT}`,
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
    `echo ${ISSUE_EDIT}`,
    `grep "${ISSUE_CREATE}" notes.md`,
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
    tool_input: { command: ISSUE_EDIT },
  });
  assert.strictEqual(result.status, 2);
});
