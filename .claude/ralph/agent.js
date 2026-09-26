const { spawn, spawnSync } = require('child_process');

function describeToolUse(block) {
  const name = block.name || 'tool';
  const input = block.input || {};
  if (input.command) return `Bash: ${String(input.command).slice(0, 200)}`;
  if (input.file_path) return `${name}: ${input.file_path}`;
  return name;
}

const KILL_GRACE_MS = 10000;

// Children currently running, so a controller exit (Ctrl-C, crash) does not leave an agent and its
// tool subprocesses running unattended.
const activeChildren = new Set();

// POSIX: the agent is spawned as its own process group (`detached`), so the whole tree — claude
// plus every Bash tool process it started — goes down with one signal to `-pid`, even after
// claude itself has exited (a tool process that ignored SIGTERM is still in the group).
// Windows has no process groups here; `taskkill /T` walks the tree from a still-running root.
function killTree(child, signal) {
  if (process.platform === 'win32') {
    if (child.exitCode !== null || child.signalCode !== null) return;
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    // group already empty
  }
}

const killActiveChildren = () => {
  for (const child of activeChildren) killTree(child, 'SIGKILL');
};

// A detached group does not receive the terminal's Ctrl-C, and Node skips 'exit' listeners when a
// signal kills it — so without these handlers Ctrl-C would stop the controller but leave the agent
// running on its own. process.exit() still runs 'exit' listeners (run.js releases its lock there).
const EXIT_CODE_BY_SIGNAL = { SIGINT: 130, SIGTERM: 143 };
for (const signal of Object.keys(EXIT_CODE_BY_SIGNAL)) {
  process.once(signal, () => {
    killActiveChildren();
    process.exit(EXIT_CODE_BY_SIGNAL[signal]);
  });
}
process.on('exit', killActiveChildren);

function buildClaudeArgs(maxTurns, maxBudgetUsd) {
  // Pinned explicitly rather than left to inherit whatever the ambient
  // `claude` CLI default happens to be in this environment — an
  // unattended run with no human to catch a shortcut-y answer should not
  // be at the mercy of an unpinned, unknown model/effort tier. Found via
  // manual review after ISSUE-287's autonomous run silently violated its
  // own Key Invariant (deactivated real dev-DB rows instead of finding a
  // fix that touched none) — the kind of multi-file call-path reasoning
  // ("trace findActive() into loadContent()") a lower effort tier is more
  // likely to shortcut on.
  const args = [
    '-p',
    '--output-format',
    'stream-json',
    '--verbose',
    '--model',
    'sonnet',
    '--effort',
    'high',
  ];
  if (maxTurns != null) args.push('--max-turns', String(maxTurns));
  if (maxBudgetUsd != null) args.push('--max-budget-usd', maxBudgetUsd.toFixed(2));
  return args;
}

// Streams the agent's output live via --output-format stream-json: plain
// `-p` text mode only prints the FINAL response, nothing while the agent is
// reading files/running tests/editing — found the hard way when a real run
// sat silent for 23 minutes with no visible progress at all. stream-json
// gives one JSON event per turn (assistant text, tool_use, tool result,
// final summary); we print a short readable line per event and separately
// accumulate just the assistant's text blocks into `output` for
// parseVerdict() below, which never has to know the format changed.
//
// options (issue #398):
//   env          — environment for the child; the caller passes boundary.buildAgentEnv(), so no
//                  GH_TOKEN/GITHUB_TOKEN/other secrets reach the agent or anything it runs.
//   timeoutMs    — the whole call is killed (process tree) after this long; result ok: false.
//   maxBudgetUsd — passed to the CLI as --max-budget-usd.
//   command      — { cmd, args } override, only for tests (defaults to `claude` + buildClaudeArgs).
// Result: { ok, output, costUsd, error? }. A `result` event with is_error: true is a failure even
// when the process exits 0 (e.g. max turns or budget reached).
function runAgent(prompt, runDir, maxTurns, options = {}) {
  const { env, timeoutMs, maxBudgetUsd, command } = options;
  return new Promise((resolve) => {
    const cmd = command ? command.cmd : 'claude';
    const args = command ? command.args : buildClaudeArgs(maxTurns, maxBudgetUsd);
    // Prompt is written to stdin rather than passed as an argv element — a
    // large review prompt (full issue body + `git diff HEAD`) can exceed
    // Windows' ~32K command-line length limit, which crashes spawn() with
    // ENAMETOOLONG before the process even starts (found live on a real
    // review-pass run once the diff grew past a few hundred lines). `claude
    // -p` reads the prompt from stdin when none is given positionally.
    const child = spawn(cmd, args, {
      cwd: runDir,
      env: env || process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    activeChildren.add(child);

    let output = ''; // assistant text only — what parseVerdict() looks at
    let lineBuffer = '';
    let costUsd = null;
    let resultError = null;
    let timedOut = false;
    let settled = false;
    let killTimer = null;
    let forceKillTimer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      clearTimeout(forceKillTimer);
      activeChildren.delete(child);
      resolve({ costUsd, ...result, output });
    };

    if (timeoutMs != null) {
      killTimer = setTimeout(() => {
        timedOut = true;
        process.stdout.write(`\n⏱️ claude -p превысил ${Math.round(timeoutMs / 1000)}s — останавливаю процесс.\n`);
        killTree(child, 'SIGTERM');
        forceKillTimer = setTimeout(() => killTree(child, 'SIGKILL'), KILL_GRACE_MS);
      }, timeoutMs);
    }

    // EPIPE when the child dies before reading its prompt; the 'close' handler reports the exit.
    child.stdin.on('error', (error) => {
      process.stderr.write(`⚠️ stdin claude -p: ${error.message}\n`);
    });
    child.stdin.write(prompt);
    child.stdin.end();

    function handleEvent(evt) {
      if (evt.type === 'assistant' && evt.message && Array.isArray(evt.message.content)) {
        for (const block of evt.message.content) {
          if (block.type === 'text' && block.text) {
            output += block.text;
            process.stdout.write(block.text);
          } else if (block.type === 'tool_use') {
            process.stdout.write(`\n🔧 ${describeToolUse(block)}\n`);
          }
        }
      } else if (evt.type === 'result') {
        if (typeof evt.total_cost_usd === 'number') costUsd = evt.total_cost_usd;
        if (evt.is_error) resultError = `claude -p reported an error result (${evt.subtype || 'is_error'})`;
        const turns = evt.num_turns ?? evt.turns;
        const seconds = evt.duration_ms != null ? Math.round(evt.duration_ms / 1000) : null;
        process.stdout.write(`\n🏁 ${turns != null ? `ходов: ${turns}` : 'завершено'}${seconds != null ? `, ${seconds}s` : ''}\n`);
      }
    }

    // setEncoding: a multi-byte UTF-8 character (Cyrillic) split across two chunks is decoded
    // correctly instead of turning into two replacement characters.
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      lineBuffer += chunk;
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          handleEvent(JSON.parse(line));
        } catch {
          process.stdout.write(`${line}\n`); // unexpected non-JSON line — don't swallow it
        }
      }
    });
    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });
    child.on('error', (error) => {
      finish({ ok: false, error: error.message });
    });
    child.on('close', (code) => {
      // Whatever the agent left running in the background (a dev server, a stuck test) goes too.
      if (process.platform !== 'win32') killTree(child, 'SIGKILL');
      if (lineBuffer.trim()) {
        try {
          handleEvent(JSON.parse(lineBuffer));
        } catch {
          // trailing partial line, nothing usable — ignore
        }
      }
      if (timedOut) {
        finish({ ok: false, error: `claude -p timed out after ${Math.round(timeoutMs / 1000)}s and was killed` });
      } else if (code !== 0) {
        finish({ ok: false, error: `claude -p exited ${code}` });
      } else if (resultError) {
        finish({ ok: false, error: resultError });
      } else {
        finish({ ok: true });
      }
    });
  });
}

module.exports = {
  describeToolUse,
  buildClaudeArgs,
  runAgent,
};
