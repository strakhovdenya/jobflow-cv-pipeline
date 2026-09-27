#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook for Bash `git commit` / `git push` invocations,
 * and for `gh issue create|edit` (Bash) / `issue_write` (GitHub MCP tool).
 *
 * The task-lifecycle skill is intentionally not part of the generic Write|Edit
 * skill gate: research/planning and Ralph coding agents must not be forced
 * through the human-driven task lifecycle. Commit/push are the deterministic
 * closure boundary, so this hook requires task-lifecycle to have been loaded
 * in the current session before asking the human to approve the closure checks.
 *
 * The same hook also gates issue creation/editing (both `gh issue create|edit`
 * and the GitHub MCP `issue_write` tool) on the `issues` skill being loaded,
 * and on the issue body itself passing `issue-lint.js` in `v2` format (ADR-041,
 * issue-contract.json) — an invalid body is never created or overwritten.
 *
 * Other Bash commands pass through untouched (no output).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { lint, DEFAULT_CONTRACT } = require('./issue-lint');

const TASK_LIFECYCLE_SKILL = 'task-lifecycle';
const ISSUES_SKILL = 'issues';
const BODY_FILE_HINT =
  'use --body-file <path> so the body can be checked against the issue ' +
  'format contract';

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
  /^(?:\w+=\S+\s+)*(?:\S*[\\/])?gh(?:\.exe)?\s+issue\s+(?<action>create|edit)\b/;

const runsGit = (command, pattern) =>
  command
    .split(SEGMENT_SEPARATOR)
    .some((segment) => pattern.test(segment.trim()));

const findIssueWriteSegments = (command) =>
  command
    .split(SEGMENT_SEPARATOR)
    .map((segment) => segment.trim())
    .map((segment) => ({ segment, match: segment.match(ISSUE_WRITE_PATTERN) }))
    .filter(({ match }) => match);

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
    'Blocked: gh issue create/edit (and MCP issue_write) requires the issues ' +
      'skill to be loaded first (issue format and verifiability rules, ' +
      'ADR-041). Load issues, then repeat the command.',
  );

const loadedSkills = (sessionId) => {
  const file = markerPath(sessionId);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
};

// Unlike commit/push (which preserve the hook's historical fail-open behavior
// on a corrupt/unreadable marker), issue-write checks fail closed: any error
// reading or interpreting the marker (missing array, invalid JSON) is treated
// as "issues skill not loaded".
const isIssuesSkillLoaded = (sessionId) => {
  try {
    const loaded = sessionId ? loadedSkills(sessionId) : [];
    return isLoaded(loaded, ISSUES_SKILL);
  } catch {
    return false;
  }
};

const ensureIssuesSkillLoaded = (sessionId) => {
  if (!isIssuesSkillLoaded(sessionId)) blockForMissingIssuesSkill();
};

const tokenizeSegment = (segment) => {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match = pattern.exec(segment);
  while (match !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
    match = pattern.exec(segment);
  }
  return tokens;
};

const FLAG_WITH_VALUE = /^(--[\w-]+)=(.*)$/;
// gh (cobra/pflag) accepts a shorthand flag glued to its value with no space,
// e.g. `-Fpath.md` / `-btext`, in addition to `-F path.md` / `-b text`.
const SHORT_BODY_FILE_GLUED = /^-F(.+)$/;
const SHORT_BODY_GLUED = /^-b(.+)$/;

// Body text for the linter comes only from --body-file <path> (-F is its
// short form); inline --body/-b (-b is its short form) is never linted, so it
// is treated the same as no body flag at all — both are rejected.
const parseIssueBodyFlags = (segment) => {
  const tokens = tokenizeSegment(segment);
  let bodyFile = null;
  let hasInlineBody = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const gluedBodyFile = token.match(SHORT_BODY_FILE_GLUED);
    const gluedBody = token.match(SHORT_BODY_GLUED);

    if (gluedBodyFile) {
      bodyFile = gluedBodyFile[1];
      continue;
    }
    if (gluedBody) {
      hasInlineBody = true;
      continue;
    }

    const inlineMatch = token.match(FLAG_WITH_VALUE);
    const flag = inlineMatch ? inlineMatch[1] : token;
    const inlineValue = inlineMatch ? inlineMatch[2] : null;

    if (flag === '--body-file' || flag === '-F') {
      bodyFile = inlineValue !== null ? inlineValue : tokens[(index += 1)];
    } else if (flag === '--body' || flag === '-b') {
      hasInlineBody = true;
      if (inlineValue === null) index += 1;
    }
  }

  return { bodyFile, hasInlineBody };
};

const readContract = () => JSON.parse(fs.readFileSync(DEFAULT_CONTRACT, 'utf8'));

const lintBodyOrBlock = (body, contextLabel) => {
  const contract = readContract();
  const result = lint(body ?? '', contract, { requireV2: true });
  if (result.problems.length > 0) {
    block(
      `Blocked: ${contextLabel} issue body failed issue-lint (format v2 ` +
        `required):\n${result.problems.map((problem) => `- ${problem}`).join('\n')}`,
    );
  }
};

// Windows paths are case-insensitive and Git Bash may report the drive
// letter in either case, so containment is compared case-insensitively there.
const normalizeCase = (value) =>
  process.platform === 'win32' ? value.toLowerCase() : value;

const isContained = (absolutePath, roots) => {
  const normalized = normalizeCase(absolutePath);
  return roots.some((root) => {
    const normalizedRoot = normalizeCase(root);
    return (
      normalized === normalizedRoot ||
      normalized.startsWith(normalizedRoot + path.sep)
    );
  });
};

// The Bash tool runs Git Bash on Windows, so paths in the command text are
// POSIX-style (`/c/Users/...`); Node's path.resolve on win32 misreads a
// leading `/` as "root of the current drive", not the MSYS drive prefix.
const normalizeGitBashPath = (filePath) => {
  if (process.platform !== 'win32') return filePath;
  const match = filePath.match(/^\/([a-zA-Z])\/(.*)$/);
  return match ? `${match[1]}:\\${match[2]}` : filePath;
};

// The command text (and therefore --body-file's path) is untrusted input
// (root CLAUDE.md Security Rules); only the command's own working directory
// and the OS temp directory (where Claude's own scratchpad lives) are
// allowed roots, so a path like --body-file ~/.ssh/id_rsa is rejected before
// it is ever read.
const resolveBodyFile = (bodyFile, cwd) => {
  const absolutePath = path.resolve(cwd, normalizeGitBashPath(bodyFile));
  const allowedRoots = [path.resolve(cwd), os.tmpdir()];
  if (!isContained(absolutePath, allowedRoots)) {
    throw new Error(
      `--body-file path is outside the allowed roots (the command's ` +
        `working directory or the OS temp directory): ${absolutePath}`,
    );
  }
  return fs.readFileSync(absolutePath, 'utf8');
};

const handleGhIssueWrite = (segment, action, sessionId, cwd) => {
  try {
    ensureIssuesSkillLoaded(sessionId);
    const { bodyFile, hasInlineBody } = parseIssueBodyFlags(segment);

    if (bodyFile === '-') {
      block(
        `Blocked: gh issue ${action} --body-file - (stdin) is not ` +
          `supported; ${BODY_FILE_HINT}.`,
      );
      return;
    }
    if (!bodyFile) {
      if (action === 'edit' && !hasInlineBody) return;
      block(
        `Blocked: gh issue ${action} must use --body-file <path>; ` +
          `${BODY_FILE_HINT}.`,
      );
      return;
    }

    const body = resolveBodyFile(bodyFile, cwd);
    lintBodyOrBlock(body, `gh issue ${action}`);
  } catch (error) {
    block(
      `Blocked: could not verify the gh issue ${action} body (${error.message}).`,
    );
  }
};

const handleMcpIssueWrite = (input, sessionId) => {
  try {
    ensureIssuesSkillLoaded(sessionId);
    const method = input?.tool_input?.method;
    const body = input?.tool_input?.body;

    if (method === 'create') {
      lintBodyOrBlock(body, 'MCP issue_write (create)');
      return;
    }
    if (typeof body === 'string' && body.length > 0) {
      lintBodyOrBlock(body, `MCP issue_write (${method ?? 'update'})`);
    }
  } catch (error) {
    block(`Blocked: could not verify the MCP issue_write body (${error.message}).`);
  }
};

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const sessionId = input?.session_id;
    const toolName = input?.tool_name;

    if (typeof toolName === 'string' && toolName.endsWith('issue_write')) {
      handleMcpIssueWrite(input, sessionId);
      return;
    }

    const command = input?.tool_input?.command;
    if (!command) return;

    const cwd = input?.cwd || process.cwd();
    for (const { segment, match } of findIssueWriteSegments(command)) {
      handleGhIssueWrite(segment, match.groups.action, sessionId, cwd);
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
