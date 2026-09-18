const { spawn } = require('child_process');

function describeToolUse(block) {
  const name = block.name || 'tool';
  const input = block.input || {};
  if (input.command) return `Bash: ${String(input.command).slice(0, 200)}`;
  if (input.file_path) return `${name}: ${input.file_path}`;
  return name;
}

// Streams the agent's output live via --output-format stream-json: plain
// `-p` text mode only prints the FINAL response, nothing while the agent is
// reading files/running tests/editing — found the hard way when a real run
// sat silent for 23 minutes with no visible progress at all. stream-json
// gives one JSON event per turn (assistant text, tool_use, tool result,
// final summary); we print a short readable line per event and separately
// accumulate just the assistant's text blocks into `output` for
// parseVerdict() below, which never has to know the format changed.
function runAgent(prompt, runDir, maxTurns) {
  return new Promise((resolve) => {
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
    // Prompt is written to stdin rather than passed as an argv element — a
    // large review prompt (full issue body + `git diff HEAD`) can exceed
    // Windows' ~32K command-line length limit, which crashes spawn() with
    // ENAMETOOLONG before the process even starts (found live on a real
    // review-pass run once the diff grew past a few hundred lines). `claude
    // -p` reads the prompt from stdin when none is given positionally.
    const child = spawn('claude', args, { cwd: runDir, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.write(prompt);
    child.stdin.end();

    let output = ''; // assistant text only — what parseVerdict() looks at
    let lineBuffer = '';

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
        const turns = evt.num_turns ?? evt.turns;
        const seconds = evt.duration_ms != null ? Math.round(evt.duration_ms / 1000) : null;
        process.stdout.write(`\n🏁 ${turns != null ? `ходов: ${turns}` : 'завершено'}${seconds != null ? `, ${seconds}s` : ''}\n`);
      }
    }

    child.stdout.on('data', (chunk) => {
      lineBuffer += chunk.toString();
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
      process.stderr.write(chunk.toString());
    });
    child.on('error', (err) => {
      resolve({ ok: false, error: err.message, output });
    });
    child.on('close', (code) => {
      if (lineBuffer.trim()) {
        try {
          handleEvent(JSON.parse(lineBuffer));
        } catch {
          // trailing partial line, nothing usable — ignore
        }
      }
      if (code !== 0) {
        resolve({ ok: false, error: `claude -p exited ${code}`, output });
      } else {
        resolve({ ok: true, output });
      }
    });
  });
}

module.exports = {
  describeToolUse,
  runAgent,
};
