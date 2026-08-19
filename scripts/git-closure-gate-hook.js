#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook for Bash `git commit` / `git push` invocations.
 * Forces a real permission prompt shown to the human user (via
 * hookSpecificOutput.permissionDecision: "ask") reminding them of the
 * CLAUDE.md Task Closure Checklist questions (/code-review, README.md)
 * before either action proceeds — added because relying on Claude to
 * remember to ask these itself was found to fail twice in a row in the
 * same session (see project-management/DECISIONS.md ADR-030 process note).
 * Non-git-commit/push Bash commands pass through untouched (no output).
 */
let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const command = input?.tool_input?.command;
    if (!command) return;

    let reason = null;
    if (/\bgit\s+commit\b/.test(command)) {
      reason =
        'CLAUDE.md Task Closure Checklist, before committing: ' +
        '(1) Have you run /code-review against this diff, or explicitly asked the user and gotten "no"? ' +
        '(2) Have you asked the user whether root README.md needs updating for this change, or already updated it if yes? ' +
        'Confirm both were actually asked in this turn before approving this commit.';
    } else if (/\bgit\s+push\b/.test(command)) {
      reason =
        'Pre-push check: has the Task Closure Checklist above already been satisfied for every commit being pushed ' +
        '(AC checked in the issue, TEST_LOG.md entry added, PR will include "Closes #n")? Confirm before approving this push.';
    }

    if (!reason) return;

    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: reason,
        },
      }),
    );
  } catch {
    // Malformed input — do not block on a hook bug, just let the tool call proceed normally.
  }
});
