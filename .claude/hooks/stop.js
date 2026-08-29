const { loadConfig, runIteration } = require('./ralph-core');

// Runs only when config.enabled is true (see .claude/ralph.config.json).
// Without this guard, this Stop hook would fire after every single Claude
// Code turn in every session (interactive or not) and could spawn a nested
// autonomous `claude -p` run unprompted — this file must stay a no-op
// whenever the loop hasn't been explicitly enabled.
const config = loadConfig();

if (config.enabled) {
  runIteration();
}
