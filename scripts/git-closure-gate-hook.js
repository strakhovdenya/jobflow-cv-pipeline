#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook for Bash `git commit` / `git push` invocations.
 *
 * The task-lifecycle skill is intentionally not part of the generic Write|Edit
 * skill gate: research/planning and Ralph coding agents must not be forced
 * through the human-driven task lifecycle. Commit/push are the deterministic
 * closure boundary, so this hook requires task-lifecycle to have been loaded
 * in the current session before asking the human to approve the closure checks.
 *
 * Non-git-commit/push Bash commands pass through untouched (no output).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const TASK_LIFECYCLE_SKILL = 'task-lifecycle';

const markerPath = (sessionId) =>
  path.join(os.tmpdir(), `claude-loaded-skills-${sessionId}.json`);

const isLoaded = (loaded, skill) =>
  loaded.some((name) => name === skill || name.endsWith(`:${skill}`));

// A closure-boundary command is a Git invocation at the start of a shell segment
// (optionally after env assignments and Git global options), not any text that
// merely mentions it, e.g. an echo argument.
const SEGMENT_SEPARATOR = /&&|\|\||[;|\n]/;
const gitSubcommand = (name) =>
  new RegExp(
    String.raw`^(?:\w+=\S+\s+)*git(?:\s+(?:-C|-c)\s+\S+|\s+--[\w-]+(?:=\S+)?)*\s+${name}\b`,
  );
const COMMIT_PATTERN = gitSubcommand('commit');
const PUSH_PATTERN = gitSubcommand('push');

const runsGit = (command, pattern) =>
  command
    .split(SEGMENT_SEPARATOR)
    .some((segment) => pattern.test(segment.trim()));

const blockForMissingLifecycle = () => {
  process.stderr.write(
    'Blocked: task closure requires the task-lifecycle skill to be reloaded ' +
      'before git commit/push. Load task-lifecycle, complete its closure gate, ' +
      'then repeat the command.\n',
  );
  process.exit(2);
};

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const command = input?.tool_input?.command;
    if (!command) return;

    const isCommit = runsGit(command, COMMIT_PATTERN);
    const isPush = runsGit(command, PUSH_PATTERN);
    if (!isCommit && !isPush) return;

    const sessionId = input?.session_id;
    if (!sessionId) {
      blockForMissingLifecycle();
      return;
    }

    const file = markerPath(sessionId);
    const loaded = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf8'))
      : [];

    if (!isLoaded(loaded, TASK_LIFECYCLE_SKILL)) {
      blockForMissingLifecycle();
      return;
    }

    const reason = isCommit
      ? 'task-lifecycle closure gate, before committing: ' +
        '(1) Are all applicable Acceptance Criteria checked in the Issue? ' +
        '(2) Is test evidence posted to the Issue? ' +
        '(3) Have you run /code-review against this diff, or explicitly asked the user and gotten "no"? ' +
        '(4) Have you asked whether root README.md needs updating, or already updated it if yes? ' +
        '(5) Were the required implementation metaskills loaded before coding and was the diff checked against them? ' +
        '(6) Will the PR include "Closes #n"? Confirm the task-lifecycle closure gate was actually completed before approving this commit.'
      : 'Pre-push check: task-lifecycle is loaded. Confirm its closure gate has already been satisfied for every commit being pushed, ' +
        'including Issue AC, test evidence, review/README decisions, and eventual PR traceability with "Closes #n".';

    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: reason,
        },
      }),
    );
  } catch (error) {
    // For commit/push we cannot safely identify the command if input is malformed.
    // Preserve the hook's historical fail-open behavior for hook/runtime bugs.
    process.stderr.write(`git-closure-gate-hook (ignored): ${error.message}\n`);
  }
});
