const { loadConfig, writeState, acquireLock, releaseLock, classify, runIssue, BLOCK_LABEL } = require('./core');

function parseMaxIterationsArg() {
  const idx = process.argv.indexOf('--max-iterations');
  if (idx === -1) return null;
  const value = Number(process.argv[idx + 1]);
  return Number.isFinite(value) ? value : null;
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

    const unknown = statuses.filter((s) => s.status === 'unknown');
    const inFlight = statuses.filter((s) => s.status === 'in-flight');
    const blocked = statuses.filter((s) => s.status === 'blocked');
    const blockedByDependency = statuses.filter((s) => s.status === 'blocked-by-dependency');
    const notStarted = statuses.filter((s) => s.status === 'not-started');
    const ready = notStarted.filter((s) => s.ready && !excluded.has(s.id));
    const waiting = notStarted.filter((s) => !s.ready);

    if (unknown.length > 0) {
      console.log(`⚠️ Issue не найден на GitHub: ${unknown.map((e) => `#${e.id}`).join(', ')}`);
    }
    if (blocked.length > 0) {
      console.log(`🚫 Заблокированы лейблом ${BLOCK_LABEL}: ${blocked.map((e) => `#${e.id}`).join(', ')}`);
    }
    if (blockedByDependency.length > 0) {
      console.log(`🚫 Заблокированы транзитивно через зависимость: ${blockedByDependency.map((e) => `#${e.id}`).join(', ')}`);
    }

    if (ready.length === 0) {
      if (inFlight.length > 0) {
        console.log(`⏳ Есть Issue с открытым PR, ждут review/merge: ${inFlight.map((e) => `#${e.id}`).join(', ')}.`);
      }
      if (waiting.length > 0) {
        console.log(`⏳ Есть Issue, ждущие своей зависимости: ${waiting.map((e) => `#${e.id}`).join(', ')}.`);
      }
      if (inFlight.length === 0 && waiting.length === 0 && blocked.length === 0 && blockedByDependency.length === 0) {
        console.log('✅ Все Issue из конфига закрыты. Ralph loop завершён.');
      } else {
        console.log('⏸️ Ничего не готово к запуску прямо сейчас. Останавливаюсь.');
      }
      break;
    }

    const chosen = ready[0];
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

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
