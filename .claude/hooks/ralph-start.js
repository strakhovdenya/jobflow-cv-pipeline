const { setEnabled, runIteration } = require('./ralph-core');

// Explicit entry point for the Ralph loop: sets config.enabled = true
// (resetting iterationsRun to 0) and runs the first iteration. Run from a
// plain terminal, not from inside an interactive Claude Code chat:
// `node .claude/hooks/ralph-start.js`.
setEnabled(true);
console.log('🚀 Ralph loop запущен (enabled: true, iterationsRun сброшен в 0).');
runIteration();
