const fs = require('fs');
const path = require('path');

const RALPH_DIR = path.join('.claude', 'ralph');
const CONFIG_PATH = path.join(RALPH_DIR, 'config.json');
const STATE_PATH = path.join(RALPH_DIR, 'state.json');
const LOCK_PATH = path.join(RALPH_DIR, 'run.lock');
const RUNS_ROOT = '.ralph-runs';

// Set on an Issue when implementing it would require changing AI prompts
// (apps/api/prisma/prompts) or knowledge sources (apps/api/knowledge-sources)
// — those need human review, so the loop must never touch them itself.
const BLOCK_LABEL = 'ralph-needs-prompt-change';

// Set on ANY BLOCKED issue (not just prompt/knowledge-source ones). Without
// this, a plain BLOCKED verdict was only excluded in-memory for the
// lifetime of one `run.js` process (see run.js's `excluded` Set) — a
// separate later invocation (the normal way this tool is actually run: one
// shot at a time, not a long-lived daemon) would re-pick the exact same
// still-ambiguous issue, re-clone, re-install deps and re-run the agent
// only to hit the same BLOCKED outcome again, with no forward progress
// until a human resolves the ambiguity. Found via code review, not a live
// run — a human must remove this label once the ambiguity is resolved.
const GENERIC_BLOCK_LABEL = 'ralph-blocked';

// Fallback when config.json has no `reviewMaxTurns` of its own — deliberately
// smaller than the implementer's own maxTurns, since the reviewer only reads
// a diff and runs read-only verification commands, it never edits anything,
// so it needs far fewer turns regardless of how large config.maxTurns is set
// for implementation work. Configurable per-run (`reviewMaxTurns` in
// config.json) rather than hardcoded, same as maxIterations/maxTurns/
// branchPrefix already are.
const DEFAULT_REVIEW_MAX_TURNS = 40;

// How many review-FAIL -> point-fix -> re-review cycles to allow before
// giving up and treating the iteration as blocked. Bounds cost/turns on a
// review that keeps finding new things — 2 gives a genuine chance to
// self-correct without turning one issue into an unbounded loop.
const MAX_REVIEW_FIX_ATTEMPTS = 2;

// Same idea, separate budget, for the post-self-review code-review pass
// (buildCodeReviewPrompt() in prompts.js/writeCodeReviewPermissions() in
// workspace.js). Deliberately its own
// constant, not shared with MAX_REVIEW_FIX_ATTEMPTS — the two passes check
// different things (self-review: Key Invariants/AC/false-negative tests;
// code-review: correctness + reuse/simplification/efficiency, via the
// `code-review` skill) and run as two independent loops in sequence. Sharing
// one counter between them would let a self-review fix cycle silently starve
// the code-review pass's own retry budget (or vice versa) for no reason tied
// to either pass's actual difficulty.
const MAX_CODE_REVIEW_FIX_ATTEMPTS = 2;

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function writeState(patch) {
  let current = {};
  try {
    current = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    // no prior state, start fresh
  }
  fs.mkdirSync(RALPH_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify({ ...current, ...patch }, null, 2) + '\n');
}

// --- lock: refuse to run two orchestrators against the same repo at once ---

function acquireLock() {
  fs.mkdirSync(RALPH_DIR, { recursive: true });
  if (fs.existsSync(LOCK_PATH)) {
    const prior = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
    let alive = true;
    try {
      process.kill(prior.pid, 0);
    } catch {
      alive = false;
    }
    if (alive) {
      throw new Error(`Another Ralph run is already active (PID ${prior.pid}, started ${prior.startedAt}). Refusing to start a second one.`);
    }
    console.log(`⚠️ Stale lock from PID ${prior.pid} (no longer running) — taking over.`);
  }
  fs.writeFileSync(LOCK_PATH, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2) + '\n');
}

function releaseLock() {
  try {
    fs.unlinkSync(LOCK_PATH);
  } catch {
    // already gone, fine
  }
}

module.exports = {
  RALPH_DIR,
  CONFIG_PATH,
  STATE_PATH,
  LOCK_PATH,
  RUNS_ROOT,
  BLOCK_LABEL,
  GENERIC_BLOCK_LABEL,
  DEFAULT_REVIEW_MAX_TURNS,
  MAX_REVIEW_FIX_ATTEMPTS,
  MAX_CODE_REVIEW_FIX_ATTEMPTS,
  loadConfig,
  writeState,
  acquireLock,
  releaseLock,
};
