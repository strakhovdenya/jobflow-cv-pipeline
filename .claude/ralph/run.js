const { loadConfig, loadSandboxConfig, writeState, acquireLock, releaseLock, BLOCK_LABEL } = require('./config');
const { classify } = require('./github');
const { runIssue } = require('./core');
const { resolveAgentModel } = require('./agent');
const sandbox = require('./sandbox');

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

// Everything that has to hold before the first clone (issue #506), in this order: a valid sandbox
// config, a valid agent model ID, a runs root outside the operator's home, a reachable Docker engine, no containers left by
// a killed earlier run of this repository, and an up-to-date sandbox image. Any failure throws, so
// nothing is cloned and no agent runs. `sandboxApi` is injectable for tests only.
function startup(config, { repoRoot = process.cwd(), sandboxApi = sandbox, docker } = {}) {
  const sandboxConfig = loadSandboxConfig(config);
  const agentModel = resolveAgentModel(config);
  const runsRoot = sandboxApi.resolveRunsRoot(sandboxConfig, repoRoot);
  sandboxApi.assertAvailable({ docker });
  const rootKey = sandboxApi.rootKeyFor(repoRoot);
  const leftovers = sandboxApi.removeLeftovers(rootKey, { docker });
  if (leftovers.containers > 0 || leftovers.networks > 0) {
    console.log(`🧹 Убраны остатки прошлого запуска: контейнеров ${leftovers.containers}, сетей ${leftovers.networks}.`);
  }
  console.log(`🐳 Сборка образа песочницы ${sandboxConfig.image} (слои из кэша, если ничего не менялось)...`);
  sandboxApi.buildImage(sandboxConfig, { docker });
  console.log(`🤖 Модель агента: ${agentModel}`);
  return { sandboxConfig, runsRoot, rootKey, agentModel, docker };
}

// The whole loop after the lock. Dependencies are injectable so run.test.js can drive it without
// GitHub, a real clone or the real state file.
async function runController(config, deps = {}) {
  const {
    maxIterations = config.maxIterations ?? null,
    classifyIssues = classify,
    runOneIssue = runIssue,
    saveState = writeState,
    startupOptions = {},
  } = deps;
  const sandboxEnv = startup(config, startupOptions);
  const excluded = new Set(); // issues already blocked/failed this run — don't re-pick them

  let iterations = 0;
  const perIssueResults = {};

  while (true) {
    if (maxIterations != null && iterations >= maxIterations) {
      console.log(`🛑 Достигнут maxIterations (${maxIterations}). Останавливаюсь.`);
      break;
    }

    const statuses = classifyIssues(config);
    const byId = new Map(statuses.map((s) => [s.id, s]));

    const summary = summarizeStatuses(statuses, excluded);
    summary.lines.forEach((line) => console.log(line));

    if (summary.ready.length === 0) {
      break;
    }

    const chosen = summary.ready[0];
    console.log(`🔄 Итерация ${iterations + 1}${maxIterations != null ? `/${maxIterations}` : ''}: Issue #${chosen.id}${chosen.title ? ` (${chosen.title})` : ''}.`);

    const result = await runOneIssue(config, byId, chosen, sandboxEnv);
    iterations++;
    perIssueResults[chosen.id] = result;
    saveState({ iterations, lastResult: { issue: chosen.id, ...result }, updatedAt: new Date().toISOString() });

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
        // final_gate_blocked / lockfile_sync_blocked carry their cause in `reason`, the *_failed
        // statuses in `error`; without the reason the console said only "see the log above".
        console.log(`⚠️ Issue #${chosen.id}: ${result.status} — ${result.error || result.reason || 'см. лог выше'}${result.runDir ? ` (оставлено для разбора: ${result.runDir})` : ''}`);
        excluded.add(chosen.id);
        break;
    }
  }

  saveState({ iterations, finishedAt: new Date().toISOString() });
  return perIssueResults;
}

async function main() {
  acquireLock();
  process.on('exit', releaseLock);
  sandbox.installExitHandlers();

  const config = loadConfig();
  await runController(config, { maxIterations: parseMaxIterationsArg() ?? config.maxIterations ?? null });
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

module.exports = { main, startup, runController, summarizeStatuses };
