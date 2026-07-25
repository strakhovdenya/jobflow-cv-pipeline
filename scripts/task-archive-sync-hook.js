#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook for Bash `git commit` invocations.
 * Enforces CLAUDE.md's Task Closure Checklist archive-copy rule: whenever
 * TASK_BOARD.md marks the current branch's task DONE, the archived
 * project-management/completed-tasks/TASK-XXX-*.md copy must match
 * CURRENT_TASK.md verbatim. Auto-syncs the archive copy (and stages it)
 * instead of blocking the commit, so a closure spanning multiple commits
 * never leaves a stale archive behind.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Overridable only for isolated testing — production runs always resolve
// against this script's own repo.
const repoRoot = process.env.CLAUDE_TASK_ARCHIVE_REPO_ROOT || path.resolve(__dirname, '..');
const logFile = path.join(__dirname, 'task-archive-sync-hook.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
}

function gitShowIndexFile(relPath) {
  const result = spawnSync('git', ['show', `:${relPath}`], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  return result.stdout;
}

function currentBranch() {
  const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const command = input?.tool_input?.command;
    if (!command || !/\bgit\s+commit\b/.test(command)) return;

    const branch = currentBranch();
    if (!branch) return;

    const branchMatch = branch.match(/^task\/(TASK-\d+)-/);
    if (!branchMatch) return;
    const taskId = branchMatch[1];

    const boardContent = gitShowIndexFile('project-management/TASK_BOARD.md');
    if (!boardContent) return;

    // Table row shape: | TASK-XXX | Phase | Title | Status | Priority | Deps | PR | Notes |
    // Only the first three cells after the ID are captured — Notes often
    // contains inline-code pipes that would break a naive full-line split.
    const rowRegex = new RegExp(`^\\|\\s*${taskId}\\s*\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|`, 'm');
    const rowMatch = boardContent.match(rowRegex);
    if (!rowMatch) return;

    const title = rowMatch[2].trim();
    const status = rowMatch[3].trim();
    if (status !== 'DONE') return;

    const currentTaskContent = gitShowIndexFile('project-management/CURRENT_TASK.md');
    if (currentTaskContent === null) return;

    const archiveDir = path.join(repoRoot, 'project-management', 'completed-tasks');
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

    const existing = fs
      .readdirSync(archiveDir)
      .filter((f) => f.startsWith(`${taskId}-`) && f.endsWith('.md'));

    let archivePath;
    if (existing.length === 1) {
      archivePath = path.join(archiveDir, existing[0]);
    } else if (existing.length > 1) {
      log(
        `Multiple archive files matched ${taskId}-*.md: ${existing.join(', ')} — skipping auto-sync, resolve manually.`,
      );
      return;
    } else {
      const slug = slugify(title) || 'task';
      archivePath = path.join(archiveDir, `${taskId}-${slug}.md`);
    }

    const existingArchiveContent = fs.existsSync(archivePath)
      ? fs.readFileSync(archivePath, 'utf8')
      : null;

    if (existingArchiveContent === currentTaskContent) return;

    fs.writeFileSync(archivePath, currentTaskContent);
    const relArchivePath = path.relative(repoRoot, archivePath).split(path.sep).join('/');
    const addResult = spawnSync('git', ['add', relArchivePath], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    if (addResult.status !== 0) {
      log(`git add failed for ${relArchivePath}: ${addResult.stderr}`);
    } else {
      log(`Auto-synced ${relArchivePath} from CURRENT_TASK.md (task ${taskId} is DONE).`);
    }
  } catch (err) {
    log(`EXCEPTION: ${err.message}`);
  }
});
