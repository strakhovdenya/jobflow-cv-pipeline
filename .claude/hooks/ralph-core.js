const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join('.claude', 'ralph.config.json');

// Set on an Issue when implementing it would require changing AI prompts
// (apps/api/prisma/prompts) or knowledge sources (apps/api/knowledge-sources)
// — those need human review, so the loop must never touch them itself.
const BLOCK_LABEL = 'ralph-needs-prompt-change';

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function writeConfig(patch) {
  const current = loadConfig();
  const next = { ...current, ...patch };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + '\n');
  return next;
}

// Enabling (re-)arms the loop and resets the iteration counter — a fresh
// `enabled: true` always means "start counting toward maxIterations again."
// Disabling leaves iterationsRun as-is, for diagnostics.
function setEnabled(enabled) {
  return writeConfig(enabled ? { enabled, iterationsRun: 0 } : { enabled });
}

function issueState(id) {
  try {
    const out = execFileSync('gh', ['issue', 'view', String(id), '--json', 'number,title,state,labels']).toString();
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function hasExistingPr(config, id) {
  try {
    const out = execFileSync('gh', [
      'pr', 'list', '--state', 'all', '--search', `head:${config.branchPrefix}${id}-`,
      '--json', 'number,state',
    ]).toString();
    return JSON.parse(out).length > 0;
  } catch {
    return false;
  }
}

function classify(config) {
  const raw = config.issues.map((entry) => {
    const info = issueState(entry.id);
    if (!info) return { ...entry, status: 'unknown' };
    if (info.state !== 'OPEN') return { ...entry, status: 'done' };
    if ((info.labels || []).some((l) => l.name === BLOCK_LABEL)) return { ...entry, status: 'blocked' };
    return { ...entry, status: hasExistingPr(config, entry.id) ? 'in-flight' : 'not-started' };
  });

  const byId = new Map(raw.map((e) => [e.id, e]));

  // An issue is transitively blocked if it (or anything in its dependsOn
  // chain, however deep) is directly marked with BLOCK_LABEL.
  function isBlockedTransitively(id, seen) {
    if (seen.has(id)) return false;
    seen.add(id);
    const entry = byId.get(id);
    if (!entry) return false;
    if (entry.status === 'blocked') return true;
    return (entry.dependsOn || []).some((depId) => isBlockedTransitively(depId, seen));
  }

  return raw.map((entry) => {
    if (entry.status === 'not-started' && isBlockedTransitively(entry.id, new Set())) {
      return { ...entry, status: 'blocked-by-dependency' };
    }
    return entry;
  });
}

// Runs one Ralph loop iteration. Assumes the caller already checked
// config.enabled. Returns true if it spawned work, false if there was
// nothing more to do right now (and, if every issue is done, flips
// config.enabled back to false so the loop is inert again).
function runIteration() {
  const config = loadConfig();
  const iterationsRun = config.iterationsRun || 0;

  if (config.maxIterations != null && iterationsRun >= config.maxIterations) {
    console.log(`🛑 Достигнут maxIterations (${config.maxIterations}). Loop остановлен — увеличь maxIterations и/или снова включи enabled, чтобы продолжить.`);
    setEnabled(false);
    return false;
  }

  const statuses = classify(config);
  const unknown = statuses.filter((s) => s.status === 'unknown');
  const notStarted = statuses.filter((s) => s.status === 'not-started');
  const inFlight = statuses.filter((s) => s.status === 'in-flight');
  const blocked = statuses.filter((s) => s.status === 'blocked');
  const blockedByDependency = statuses.filter((s) => s.status === 'blocked-by-dependency');

  if (unknown.length > 0) {
    console.log(`⚠️ Issue не найден на GitHub (проверь ralph.config.json): ${unknown.map((e) => `#${e.id}`).join(', ')}`);
  }
  if (blocked.length > 0) {
    console.log(`🚫 Заблокированы лейблом ${BLOCK_LABEL} (нужны ручные изменения prompts/knowledge-sources): ${blocked.map((e) => `#${e.id}`).join(', ')}`);
  }
  if (blockedByDependency.length > 0) {
    console.log(`🚫 Заблокированы транзитивно через зависимость: ${blockedByDependency.map((e) => `#${e.id}`).join(', ')}`);
  }

  if (notStarted.length > 0) {
    console.log(`🔄 Есть незапущенные Issue: ${notStarted.map((e) => `#${e.id}`).join(', ')}`);
    if (inFlight.length > 0) {
      console.log(`⏳ Ожидают review/merge (пропускаются): ${inFlight.map((e) => `#${e.id}`).join(', ')}`);
    }
    console.log(`▶️ Итерация ${iterationsRun + 1}${config.maxIterations != null ? `/${config.maxIterations}` : ''}.`);
    const issuesText = JSON.stringify(config.issues, null, 2);
    const prompt = config.prompt.replace('{issues}', issuesText);
    const args = ['-p', prompt];
    if (config.maxTurns != null) args.push('--max-turns', String(config.maxTurns));
    execFileSync('claude', args, { stdio: 'inherit' });
    writeConfig({ iterationsRun: iterationsRun + 1 });
    return true;
  }

  if (inFlight.length > 0) {
    console.log(`⏳ Все оставшиеся Issue уже имеют открытый PR и ждут review/merge: ${inFlight.map((e) => `#${e.id}`).join(', ')}. Loop приостановлен — смёрджи PR вручную, чтобы продолжить (следующий Stop hook продолжит цикл автоматически).`);
    return false;
  }

  if (blocked.length > 0 || blockedByDependency.length > 0) {
    console.log('🚫 Все оставшиеся Issue заблокированы (напрямую или транзитивно) — нужно ручное вмешательство человека (обнови prompts/knowledge-sources, затем сними лейбл ' + BLOCK_LABEL + '). Loop приостановлен.');
    return false;
  }

  console.log('✅ Все Issue из ralph.config.json закрыты. Ralph loop завершён — enabled сброшен в false.');
  setEnabled(false);
  return false;
}

module.exports = { loadConfig, setEnabled, runIteration, BLOCK_LABEL };
