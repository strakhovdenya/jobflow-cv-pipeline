const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join('.claude', 'ralph.config.json');

// Set on an Issue when implementing it would require changing AI prompts
// (apps/api/prisma/prompts) or knowledge sources (apps/api/knowledge-sources)
// — those need human review, so the loop must never touch them itself.
const BLOCK_LABEL = 'ralph-needs-prompt-change';

// Each iteration runs in its own git worktree (sibling directory), never in
// the controller's own working directory — the agent does real git
// checkout/branch operations as part of implementing an Issue, and if that
// happened in-place it would corrupt this very controller's working copy
// (ralph.config.json/ralph-core.js would vanish the moment it switches
// branches). Learned the hard way running #215 in-place.
const WORKTREE_ROOT = path.join('..', 'jobflow-cv-pipeline-ralph-worktrees');

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

function git(args, opts) {
  return execFileSync('git', args, { encoding: 'utf8', ...opts }).trim();
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

function slugify(title) {
  const slug = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return slug || 'issue';
}

function branchNameFor(config, id, title) {
  return `${config.branchPrefix}${id}-${slugify(title)}`;
}

// Classifies every configured Issue. Adds, on top of the raw GitHub state:
// - 'blocked' / 'blocked-by-dependency': see BLOCK_LABEL handling below.
// - for 'not-started' entries only, `ready: boolean` — true when every
//   dependsOn entry already has a usable base to branch from (done/merged,
//   or in-flight with its own branch/PR already existing).
function classify(config) {
  const raw = config.issues.map((entry) => {
    const info = issueState(entry.id);
    if (!info) return { ...entry, status: 'unknown' };
    if (info.state !== 'OPEN') return { ...entry, status: 'done', title: info.title };
    if ((info.labels || []).some((l) => l.name === BLOCK_LABEL)) return { ...entry, status: 'blocked', title: info.title };
    return { ...entry, status: hasExistingPr(config, entry.id) ? 'in-flight' : 'not-started', title: info.title };
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

  const withBlocking = raw.map((entry) => {
    if (entry.status === 'not-started' && isBlockedTransitively(entry.id, new Set())) {
      return { ...entry, status: 'blocked-by-dependency' };
    }
    return entry;
  });

  const byId2 = new Map(withBlocking.map((e) => [e.id, e]));
  return withBlocking.map((entry) => {
    if (entry.status !== 'not-started') return entry;
    const ready = (entry.dependsOn || []).every((depId) => {
      const dep = byId2.get(depId);
      return dep && (dep.status === 'done' || dep.status === 'in-flight');
    });
    return { ...entry, ready };
  });
}

// Which ref a new branch for this issue should be created from: origin/main
// for an independent issue, or the (not-yet-merged) dependency's own branch
// for a dependent one — a stacked PR, per ralph.md's auto-retarget note.
// Assumes classify() already confirmed this issue is `ready` (its
// dependency chain has a usable base at every step).
function resolveBaseRef(config, byId, entry) {
  if (!entry.dependsOn || entry.dependsOn.length === 0) return 'origin/main';
  const depId = entry.dependsOn[0];
  const dep = byId.get(depId);
  if (dep.status === 'done') return 'origin/main';
  return branchNameFor(config, depId, dep.title);
}

function buildPrompt(chosen, branchName) {
  return [
    `Прочитай .claude/ralph.md и следуй всем правилам оттуда: правила реализации (TDD, тесты, 5 неудачных попыток -> BLOCKED), ограничение по apps/api/prisma/prompts и apps/api/knowledge-sources (ставь лейбл ${BLOCK_LABEL} вместо изменения), правила завершения итерации (commit, push, gh pr create с Closes #<n>, не мёрджить), и раздел 'Не делай'.`,
    '',
    `Ты уже находишься в отдельной git worktree-директории, уже переключённой на ветку \`${branchName}\`, ответвлённую от правильного base branch для Issue #${chosen.id} (main для независимого issue, либо ветка ещё не смёрженной зависимости для зависимого) — этот выбор уже сделан за тебя контроллером. Не переключай ветку, не создавай новую ветку, не переходи в другую директорию.`,
    '',
    `Прочитай тело issue (\`gh issue view ${chosen.id}\`) и реализуй задачу строго согласно Context, Affects, Docs to Read, Key Invariants, Acceptance Criteria, Test Requirement и Definition of Done. Следуй Issue-first protocol (issue уже специфицирован — не создавай новый) и Branch-first protocol из корневого CLAUDE.md — ветка и base branch уже подготовлены, дальше следуй остальным шагам протокола (проверка git status перед изменениями и т.д.).`,
    '',
    `Обработай только Issue #${chosen.id} — не переходи к другим issue в этой же итерации. Следуй правилам завершения итерации из .claude/ralph.md: commit, push, \`gh pr create --base ${branchName === 'main' ? 'main' : '<base branch, как в git log --oneline на этой ветке>'} --body 'Closes #${chosen.id} ...'\`, не мёрджи созданный PR и не жди его review/merge.`,
  ].join('\n');
}

function ensureWorktreeRoot() {
  fs.mkdirSync(WORKTREE_ROOT, { recursive: true });
}

function worktreePathFor(id) {
  return path.join(WORKTREE_ROOT, `issue-${id}`);
}

function removeWorktreeIfExists(wtPath) {
  if (fs.existsSync(wtPath)) {
    try {
      git(['worktree', 'remove', wtPath, '--force']);
    } catch {
      fs.rmSync(wtPath, { recursive: true, force: true });
    }
  }
  try { git(['worktree', 'prune']); } catch { /* best-effort */ }
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
  const byId = new Map(statuses.map((e) => [e.id, e]));
  const unknown = statuses.filter((s) => s.status === 'unknown');
  const inFlight = statuses.filter((s) => s.status === 'in-flight');
  const blocked = statuses.filter((s) => s.status === 'blocked');
  const blockedByDependency = statuses.filter((s) => s.status === 'blocked-by-dependency');
  const notStarted = statuses.filter((s) => s.status === 'not-started');
  const ready = notStarted.filter((s) => s.ready);
  const waiting = notStarted.filter((s) => !s.ready);

  if (unknown.length > 0) {
    console.log(`⚠️ Issue не найден на GitHub (проверь ralph.config.json): ${unknown.map((e) => `#${e.id}`).join(', ')}`);
  }
  if (blocked.length > 0) {
    console.log(`🚫 Заблокированы лейблом ${BLOCK_LABEL} (нужны ручные изменения prompts/knowledge-sources): ${blocked.map((e) => `#${e.id}`).join(', ')}`);
  }
  if (blockedByDependency.length > 0) {
    console.log(`🚫 Заблокированы транзитивно через зависимость: ${blockedByDependency.map((e) => `#${e.id}`).join(', ')}`);
  }

  if (ready.length > 0) {
    const chosen = ready[0];
    console.log(`🔄 Беру Issue #${chosen.id}${chosen.title ? ` (${chosen.title})` : ''}.`);
    if (waiting.length > 0) console.log(`⏳ Ждут своей очереди (зависимость ещё не готова): ${waiting.map((e) => `#${e.id}`).join(', ')}`);
    if (inFlight.length > 0) console.log(`⏳ Ожидают review/merge (пропускаются): ${inFlight.map((e) => `#${e.id}`).join(', ')}`);

    const branchName = branchNameFor(config, chosen.id, chosen.title);
    const baseRef = resolveBaseRef(config, byId, chosen);
    const wtPath = worktreePathFor(chosen.id);

    ensureWorktreeRoot();
    removeWorktreeIfExists(wtPath);
    try {
      git(['fetch', 'origin', 'main']);
    } catch (err) {
      console.log(`⚠️ git fetch origin main не удался: ${err.message}`);
    }

    console.log(`🌱 Worktree ${wtPath}, ветка ${branchName} от ${baseRef}.`);
    git(['worktree', 'add', '-b', branchName, wtPath, baseRef]);

    console.log(`▶️ Итерация ${iterationsRun + 1}${config.maxIterations != null ? `/${config.maxIterations}` : ''}.`);
    const prompt = buildPrompt(chosen, branchName);
    const args = ['-p', prompt];
    if (config.maxTurns != null) args.push('--max-turns', String(config.maxTurns));

    let failed = false;
    try {
      execFileSync('claude', args, { stdio: 'inherit', cwd: wtPath });
    } catch (err) {
      failed = true;
      console.log(`⚠️ Итерация по #${chosen.id} завершилась с ошибкой (exit ${err.status ?? 'unknown'}). Worktree оставлен для разбора: ${wtPath}`);
    }

    writeConfig({ iterationsRun: iterationsRun + 1 });

    if (!failed) {
      const dirty = git(['status', '--porcelain'], { cwd: wtPath });
      if (dirty) {
        console.log(`⚠️ Итерация по #${chosen.id} завершилась успешно (exit 0), но worktree не чист — есть незакоммиченные изменения. Не удаляю его на всякий случай, разбери вручную: ${wtPath}`);
      } else {
        removeWorktreeIfExists(wtPath);
      }
    }
    return true;
  }

  if (inFlight.length > 0) {
    console.log(`⏳ Все оставшиеся Issue уже имеют открытый PR и ждут review/merge: ${inFlight.map((e) => `#${e.id}`).join(', ')}. Loop приостановлен — смёрджи PR вручную, чтобы продолжить (следующий Stop hook продолжит цикл автоматически).`);
    return false;
  }

  if (waiting.length > 0) {
    console.log(`⏳ Есть Issue, ждущие своей зависимости: ${waiting.map((e) => `#${e.id}`).join(', ')}. Прямо сейчас ничего не готово к запуску.`);
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
