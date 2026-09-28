const { loadConfig, writeState, acquireLock, releaseLock, BLOCK_LABEL } = require('./config');
const { classify } = require('./github');
const { runIssue } = require('./core');

function parseMaxIterationsArg() {
  const idx = process.argv.indexOf('--max-iterations');
  if (idx === -1) return null;
  const value = Number(process.argv[idx + 1]);
  return Number.isFinite(value) ? value : null;
}

// Groups classify()'s per-issue statuses into what's ready to run vs. why
// everything else isn't, and renders the same summary lines main() used to
// print inline — pulled out so it's directly testable without mocking the
// child process classify() itself would need (issue #475). Pure: no I/O.
function summarizeStatuses(statuses, excluded) {
  const byStatus = (status) => statuses.filter((s) => s.status === status);
  const unknown = byStatus('unknown');
  const inFlight = byStatus('in-flight');
  const blocked = byStatus('blocked');
  const blockedByDependency = byStatus('blocked-by-dependency');
  const unapproved = byStatus('unapproved');
  const notStarted = byStatus('not-started');
  const ready = notStarted.filter((s) => s.ready && !excluded.has(s.id));
  const waiting = notStarted.filter((s) => !s.ready);

  const lines = [];
  if (unknown.length > 0) {
    lines.push(`⚠️ Issue не найден на GitHub: ${unknown.map((e) => `#${e.id}`).join(', ')}`);
  }
  if (blocked.length > 0) {
    lines.push(`🚫 Заблокированы лейблом ${BLOCK_LABEL}: ${blocked.map((e) => `#${e.id}`).join(', ')}`);
  }
  if (blockedByDependency.length > 0) {
    lines.push(`🚫 Заблокированы транзитивно через зависимость: ${blockedByDependency.map((e) => `#${e.id}`).join(', ')}`);
  }
  if (unapproved.length > 0) {
    lines.push(`🔒 Спека не одобрена: ${unapproved.map((e) => `#${e.id} (${e.unapprovedReason})`).join(', ')}`);
  }

  if (ready.length === 0) {
    if (inFlight.length > 0) {
      lines.push(`⏳ Есть Issue с открытым PR, ждут review/merge: ${inFlight.map((e) => `#${e.id}`).join(', ')}.`);
    }
    if (waiting.length > 0) {
      lines.push(`⏳ Есть Issue, ждущие своей зависимости: ${waiting.map((e) => `#${e.id}`).join(', ')}.`);
    }
    const nothingElseOutstanding =
      inFlight.length === 0 && waiting.length === 0 && blocked.length === 0 && blockedByDependency.length === 0 && unapproved.length === 0;
    lines.push(nothingElseOutstanding ? '✅ Все Issue из конфига закрыты. Ralph loop завершён.' : '⏸️ Ничего не готово к запуску прямо сейчас. Останавливаюсь.');
  }

  return { unknown, inFlight, blocked, blockedByDependency, unapproved, notStarted, ready, waiting, lines };
}

async function main() {
  acquireLock();
  process.on('exit', releaseLock);

  const config = loadConfig();
  const maxIterations = parseMaxIterationsArg() ?? config.maxIterations ?? null;
  const excluded = new Set(); // issues already blocked/failed this run — don't re-pick them

  let iterations = 0;
  const perIssueResults = {};

  while (true) {
    if (maxIterations != null && iterations >= maxIterations) {
      console.log(`🛑 Достигнут maxIterations (${maxIterations}). Останавливаюсь.`);
      break;
    }

    const statuses = classify(config);
    const byId = new Map(statuses.map((s) => [s.id, s]));

    const summary = summarizeStatuses(statuses, excluded);
    summary.lines.forEach((line) => console.log(line));

    if (summary.ready.length === 0) {
      break;
    }

    const chosen = summary.ready[0];
    console.log(`🔄 Итерация ${iterations + 1}${maxIterations != null ? `/${maxIterations}` : ''}: Issue #${chosen.id}${chosen.title ? ` (${chosen.title})` : ''}.`);

    const result = await runIssue(config, byId, chosen);
    iterations++;
    perIssueResults[chosen.id] = result;
    writeState({ iterations, lastResult: { issue: chosen.id, ...result }, updatedAt: new Date().toISOString() });

    switch (result.status) {
      case 'done':
        console.log(`✅ Issue #${chosen.id} готов, PR: ${result.pr}`);
        break;
      case 'blocked':
        console.log(`🚫 Issue #${chosen.id} заблокирован${result.promptChange ? ' (нужны изменения промптов/knowledge-sources)' : ''}: ${result.reason}`);
        excluded.add(chosen.id);
        break;
      case 'review_blocked':
        console.log(`🔎🚫 Issue #${chosen.id} остановлен на пост-DONE self-review: ${result.reason}`);
        excluded.add(chosen.id);
        break;
      case 'code_review_blocked':
        console.log(`🔎🚫 Issue #${chosen.id} остановлен на пост-self-review code-review: ${result.reason}`);
        excluded.add(chosen.id);
        break;
      default:
        console.log(`⚠️ Issue #${chosen.id}: ${result.status} — ${result.error || 'см. лог выше'}${result.runDir ? ` (оставлено для разбора: ${result.runDir})` : ''}`);
        excluded.add(chosen.id);
        break;
    }
  }

  writeState({ iterations, finishedAt: new Date().toISOString() });
}

// Guarded so run.test.js can require this module (to test summarizeStatuses)
// without triggering a real run — main() acquires a process lock and talks
// to GitHub, neither of which a test should do (issue #475).
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { main, summarizeStatuses };
