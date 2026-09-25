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
 * The same hook also gates `gh issue create` / `gh issue edit` on the `issues`
 * skill being loaded, so issue bodies follow the format and verifiability rules
 * the acceptance verifier (ADR-041) depends on.
 *
 * Other Bash commands pass through untouched (no output).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const TASK_LIFECYCLE_SKILL = 'task-lifecycle';
const ISSUES_SKILL = 'issues';

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
// Only issue create/edit change an issue body; comment/view/list stay open.
// The binary may be `gh.exe` or an absolute path (realistic on Windows).
const ISSUE_WRITE_PATTERN =
  /^(?:\w+=\S+\s+)*(?:\S*[\\/])?gh(?:\.exe)?\s+issue\s+(?:create|edit)\b/;

const runsGit = (command, pattern) =>
  command
    .split(SEGMENT_SEPARATOR)
    .some((segment) => pattern.test(segment.trim()));

const block = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(2);
};

const blockForMissingLifecycle = () =>
  block(
    'Blocked: task closure requires the task-lifecycle skill to be reloaded ' +
      'before git commit/push. Load task-lifecycle, complete its closure gate, ' +
      'then repeat the command.',
  );

const blockForMissingIssuesSkill = () =>
  block(
    'Blocked: gh issue create/edit requires the issues skill to be loaded ' +
      'first (issue format and verifiability rules, ADR-041). Load issues, ' +
      'then repeat the command.',
  );

const loadedSkills = (sessionId) => {
  const file = markerPath(sessionId);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
};

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const command = input?.tool_input?.command;
    if (!command) return;

    const sessionId = input?.session_id;

    if (runsGit(command, ISSUE_WRITE_PATTERN)) {
      // Unlike commit/push, a corrupt marker fails closed here.
      let loadedForIssue = [];
      try {
        if (sessionId) loadedForIssue = loadedSkills(sessionId);
      } catch {
        loadedForIssue = [];
      }
      if (!isLoaded(loadedForIssue, ISSUES_SKILL)) {
        blockForMissingIssuesSkill();
        return;
      }
    }

    const isCommit = runsGit(command, COMMIT_PATTERN);
    const isPush = runsGit(command, PUSH_PATTERN);
    if (!isCommit && !isPush) return;

    if (!sessionId) {
      blockForMissingLifecycle();
      return;
    }

    const loaded = loadedSkills(sessionId);

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
