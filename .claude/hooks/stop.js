const { loadConfig, runIteration } = require('./ralph-core');

// Runs only when config.enabled is true (see .claude/ralph.config.json — a
// gitignored, local-only file; copy .claude/ralph.config.example.json to
// create it). Without this guard, this Stop hook would fire after every
// single Claude Code turn in every session (interactive or not) and could
// spawn a nested autonomous `claude -p` run unprompted — this file must
// stay a no-op whenever the loop hasn't been explicitly enabled.
//
// Also stays a no-op (instead of crashing) when the config file is simply
// absent — expected inside a Ralph iteration's own git worktree, which
// inherits hooks.Stop from whatever branch it's on but never gets the
// gitignored config copied into it.
let config;
try {
  config = loadConfig();
} catch {
  config = null;
}

if (config && config.enabled) {
  runIteration();
}
