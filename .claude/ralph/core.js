const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const RALPH_DIR = path.join('.claude', 'ralph');
const CONFIG_PATH = path.join(RALPH_DIR, 'config.json');
const STATE_PATH = path.join(RALPH_DIR, 'state.json');
const LOCK_PATH = path.join(RALPH_DIR, 'run.lock');
const RUNS_ROOT = '.ralph-runs';

// Set on an Issue when implementing it would require changing AI prompts
// (apps/api/prisma/prompts) or knowledge sources (apps/api/knowledge-sources)
// — those need human review, so the loop must never touch them itself.
const BLOCK_LABEL = 'ralph-needs-prompt-change';

// Set on ANY BLOCKED issue (not just prompt/knowledge-source ones). Without
// this, a plain BLOCKED verdict was only excluded in-memory for the
// lifetime of one `run.js` process (see run.js's `excluded` Set) — a
// separate later invocation (the normal way this tool is actually run: one
// shot at a time, not a long-lived daemon) would re-pick the exact same
// still-ambiguous issue, re-clone, re-install deps and re-run the agent
// only to hit the same BLOCKED outcome again, with no forward progress
// until a human resolves the ambiguity. Found via code review, not a live
// run — a human must remove this label once the ambiguity is resolved.
const GENERIC_BLOCK_LABEL = 'ralph-blocked';

// Fallback when config.json has no `reviewMaxTurns` of its own — deliberately
// smaller than the implementer's own maxTurns, since the reviewer only reads
// a diff and runs read-only verification commands, it never edits anything,
// so it needs far fewer turns regardless of how large config.maxTurns is set
// for implementation work. Configurable per-run (`reviewMaxTurns` in
// config.json) rather than hardcoded, same as maxIterations/maxTurns/
// branchPrefix already are.
const DEFAULT_REVIEW_MAX_TURNS = 40;

// How many review-FAIL -> point-fix -> re-review cycles to allow before
// giving up and treating the iteration as blocked. Bounds cost/turns on a
// review that keeps finding new things — 2 gives a genuine chance to
// self-correct without turning one issue into an unbounded loop.
const MAX_REVIEW_FIX_ATTEMPTS = 2;

// Doc-only changes skip the post-DONE review entirely (see runIssue()) — a
// pure prose/markdown edit (like #271/#272/#273) has no code-level Key
// Invariant to violate the way #287's real fix did, so spending a second
// full agent invocation on it is pure cost with no corresponding safety
// benefit. Deliberately conservative: anything NOT matching one of these
// patterns counts as "code" and triggers review, including config/schema/
// prompt files — false positives (reviewing something that turns out to be
// harmless) are cheap; false negatives (skipping review on something that
// wasn't actually just docs) are exactly the risk this whole feature exists
// to close.
const DOC_ONLY_PATH_PATTERNS = [/\.md$/i, /(^|\/)docs\//, /(^|\/)project-management\//];

// `porcelain` is `git status --porcelain` output — reused as-is from the
// caller rather than a fresh `git diff --name-only`, since porcelain format
// already covers untracked new files (`??`) that a plain `git diff` misses.
function changedFilePathsFromPorcelain(porcelain) {
  return porcelain
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

function hasCodeChanges(porcelainStatus) {
  const files = changedFilePathsFromPorcelain(porcelainStatus);
  return files.some((f) => !DOC_ONLY_PATH_PATTERNS.some((re) => re.test(f)));
}

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function writeState(patch) {
  let current = {};
  try {
    current = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    // no prior state, start fresh
  }
  fs.mkdirSync(RALPH_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify({ ...current, ...patch }, null, 2) + '\n');
}

// --- lock: refuse to run two orchestrators against the same repo at once ---

function acquireLock() {
  fs.mkdirSync(RALPH_DIR, { recursive: true });
  if (fs.existsSync(LOCK_PATH)) {
    const prior = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
    let alive = true;
    try {
      process.kill(prior.pid, 0);
    } catch {
      alive = false;
    }
    if (alive) {
      throw new Error(`Another Ralph run is already active (PID ${prior.pid}, started ${prior.startedAt}). Refusing to start a second one.`);
    }
    console.log(`⚠️ Stale lock from PID ${prior.pid} (no longer running) — taking over.`);
  }
  fs.writeFileSync(LOCK_PATH, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2) + '\n');
}

function releaseLock() {
  try {
    fs.unlinkSync(LOCK_PATH);
  } catch {
    // already gone, fine
  }
}

// --- git/gh helpers ---

function git(args, opts) {
  return execFileSync('git', args, { encoding: 'utf8', ...opts }).trim();
}

function gh(args, opts) {
  return execFileSync('gh', args, { encoding: 'utf8', ...opts }).trim();
}

function issueState(id) {
  try {
    const out = gh(['issue', 'view', String(id), '--json', 'number,title,body,url,state,labels']);
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function hasExistingPr(config, id) {
  try {
    const out = gh(['pr', 'list', '--state', 'all', '--search', `head:${config.branchPrefix}${id}-`, '--json', 'number,state']);
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

// Classifies every configured Issue against live GitHub state. Adds:
// - 'blocked' / 'blocked-by-dependency': ralph-needs-prompt-change label,
//   direct or transitive through dependsOn.
// - for 'not-started' entries only, `ready: boolean` — true when every
//   dependsOn entry already has a usable base to branch from (done/merged,
//   or in-flight with its own branch/PR already existing).
function classify(config) {
  const raw = config.issues.map((entry) => {
    const info = issueState(entry.id);
    if (!info) return { ...entry, status: 'unknown' };
    if (info.state !== 'OPEN') return { ...entry, status: 'done', title: info.title };
    if ((info.labels || []).some((l) => l.name === BLOCK_LABEL || l.name === GENERIC_BLOCK_LABEL)) return { ...entry, status: 'blocked', title: info.title, body: info.body };
    return { ...entry, status: hasExistingPr(config, entry.id) ? 'in-flight' : 'not-started', title: info.title, body: info.body };
  });

  const byId = new Map(raw.map((e) => [e.id, e]));

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

// Which ref a new branch should be created from: origin/main for an
// independent issue, or the dependency's own remote branch (stacked PR) if
// it's not merged yet — always returned as an origin/... ref, since a fresh
// clone only has remote-tracking refs, no local branches of its own yet.
function resolveBaseRef(config, byId, entry) {
  if (!entry.dependsOn || entry.dependsOn.length === 0) return 'origin/main';
  const depId = entry.dependsOn[0];
  const dep = byId.get(depId);
  if (dep.status === 'done') return 'origin/main';
  return `origin/${branchNameFor(config, depId, dep.title)}`;
}

// --- per-issue clone (replaces git worktree — see .claude/ralph/README.md) ---

function runDirFor(id) {
  return path.join(RUNS_ROOT, `issue-${id}`);
}

function removeRunDirIfExists(runDir) {
  if (fs.existsSync(runDir)) {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
}

function getOriginUrl() {
  return git(['remote', 'get-url', 'origin']);
}

function prepareClone(runDir, baseRef, branchName) {
  fs.mkdirSync(RUNS_ROOT, { recursive: true });
  removeRunDirIfExists(runDir);
  const originUrl = getOriginUrl();
  git(['clone', originUrl, runDir]);
  git(['checkout', '-b', branchName, baseRef], { cwd: runDir });
}

// A fresh clone has no node_modules at all (gitignored, like any checkout).
// The agent has no `npm install` permission — installing deps is
// environment setup, not part of "implement the issue," so the controller
// does it deterministically before the agent ever runs, not on the agent's
// own turns/time. Found the hard way: a real run against #215 sat silent
// for 23 minutes with almost no diff — most likely stuck on missing deps,
// since plain-text `-p` mode doesn't surface what a blocked/failing Bash
// call was even trying to do.
function installDependencies(runDir) {
  for (const app of ['apps/api', 'apps/web']) {
    const dir = path.join(runDir, app);
    if (!fs.existsSync(path.join(dir, 'package.json'))) continue;
    console.log(`📦 npm install в ${app}...`);
    // `npm` is a .cmd shim on Windows — execFileSync needs shell:true to
    // resolve it (unlike git/gh, which are plain .exe). Found via a real
    // ENOENT on a live smoke test.
    execFileSync('npm', ['install'], { cwd: dir, stdio: 'inherit', shell: true });
  }
}

// A fresh clone only ever gets tracked files — .claude/settings.local.json
// (where a human's personal git*/gh* allow-list would live) never reaches
// it, and that's deliberate here: the agent gets NO git-mutation and NO gh
// permissions at all. It only edits code and reports DONE/BLOCKED; every
// git/gh mutation (commit, push, PR, issue comments/labels) is owned by
// this controller. See .claude/ralph/README.md for why.
function writeAgentPermissions(runDir) {
  // Self-sufficient on purpose — must not depend on whatever happens to be
  // committed in the repo's own .claude/settings.json at clone time (e.g.
  // right after this very redesign, main won't have it yet). Covers exactly
  // what ralph's prompt asks the agent to run.
  // 'Edit' and 'Write' are two separate tools/permissions — Edit only
  // covers modifying an existing file, Write covers creating a new one.
  // Missing 'Write' here once made a real run silently unable to create a
  // new spec file: the Write tool call was denied with nothing to approve
  // it in headless mode, and the agent burned many turns trying to work
  // around it via Bash (echo/heredoc/python/node -e/PowerShell), none of
  // which were allowlisted either.
  const settings = {
    permissions: {
      allow: [
        'Edit',
        'Write',
        'Bash(git status:*)',
        'Bash(git diff:*)',
        'Bash(git log:*)',
        // Broad on purpose (not one exact string per invocation) — a real
        // run tried `npm run test -- --testPathPattern=...`, which the
        // narrower exact-match version of this list didn't cover, and burned
        // several turns trying different shell syntax (cd/Set-Location/
        // --prefix) before we noticed. `npm run *`/`npx *` still can't touch
        // git/gh/the filesystem outside runDir — just covers "any npm
        // script, any npx tool, with any flags."
        'Bash(npm run *)',
        'Bash(npx *)',
      ],
      // Backstop for two of the prompt's own rules — a prompt instruction is
      // only a request, not an enforcement. Deny rules take precedence over
      // the blanket 'Edit'/'Write' allow above, so even if the agent ignores
      // the prompt (or a future prompt edit drops one of these rules), it
      // still cannot touch these paths:
      //  - .claude/** — its own permission files ("don't self-grant access").
      //  - apps/api/prisma/prompts/** and apps/api/knowledge-sources/** — AI
      //    prompts and the knowledge-source corpus; changing these is a
      //    deliberate product decision for a human, not an autonomous agent
      //    (the prompt's BLOCKED-PROMPT-CHANGE rule already asks the agent to
      //    stop instead of editing them — this makes that non-optional).
      deny: [
        'Edit(.claude/**)',
        'Write(.claude/**)',
        'Edit(apps/api/prisma/prompts/**)',
        'Write(apps/api/prisma/prompts/**)',
        'Edit(apps/api/knowledge-sources/**)',
        'Write(apps/api/knowledge-sources/**)',
      ],
    },
  };
  const dir = path.join(runDir, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'settings.local.json'), JSON.stringify(settings, null, 2) + '\n');
}

// Overwrites the same settings.local.json with a strictly read-only profile
// for the post-DONE self-review pass (see runIssue()) — deliberately no
// 'Edit'/'Write' in `allow` at all (not even denied explicitly; omission is
// enough in headless mode, same as any other unlisted tool). The reviewer's
// only job is to read the diff and run verification commands, never to fix
// anything itself — if it finds a real problem, the whole iteration is
// BLOCKED and a human looks at it, rather than letting the reviewer "helpfully"
// patch its way to a false PASS.
function writeReviewerPermissions(runDir) {
  const settings = {
    permissions: {
      allow: [
        'Bash(git status:*)',
        'Bash(git diff:*)',
        'Bash(git log:*)',
        'Bash(git show:*)',
        'Bash(npm run *)',
        'Bash(npx *)',
      ],
    },
  };
  const dir = path.join(runDir, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'settings.local.json'), JSON.stringify(settings, null, 2) + '\n');
}

// --- prompt + verdict parsing ---

// Shared by buildPrompt() (fresh implementation) and buildFixPrompt() (a
// point fix requested by the post-DONE review below) — both need the exact
// same standing rules (organizational-protocol exclusions, BLOCKED
// conditions, mutation-testing/real-file discipline, final-answer format),
// only the opening framing and DONE-triggering task differ.
function buildTaskRules(maxTurns) {
  return [
    'Реализуй задачу строго согласно Context, Affects, Docs to Read, Key Invariants, Acceptance Criteria, Test Requirement и Definition of Done из тела issue выше и из корневого CLAUDE.md. Сначала тесты, потом реализация (TDD), где применимо. После финальных изменений прогоняй relevant tests/tsc --noEmit/lint для затронутых apps/*.',
    '',
    maxTurns != null
      ? `У тебя есть примерно ${maxTurns} ходов на всю задачу (сообщение + вызов инструмента = один ход), и на этом бюджет заканчивается — если ты не успеешь ответить DONE/BLOCKED до его исчерпания, вся проделанная работа теряется (следующий прогон начнётся с нуля, без памяти о том, что ты уже сделал). Не трать больше примерно трети бюджета на изучение кодовой базы перед тем, как начать писать тесты/реализацию — читай целенаправленно то, что реально нужно для этой задачи (issue уже указывает Docs to Read), а не исследуй широко "на всякий случай".`
      : null,
    '',
    '`npm install` для apps/api и apps/web уже выполнен контроллером в этой рабочей директории — не запускай его сам (и не нужно, `Bash(npm install)` не в списке разрешённых команд).',
    '',
    'Read-only git-команды разрешены и предназначены для самопроверки: `git status`/`git diff`/`git log` (но не `add`/`commit`/`push` — их нет и не будет). Перед тем как писать DONE, посмотри `git diff` на свои изменения так, как это сделал бы ревьюер со стороны — это дешёвый способ заметить случайно оставленный debug-код, забытый TODO или файл, изменённый по ошибке.',
    '',
    'ВАЖНО про CLAUDE.md (корневой, apps/api/, apps/web/): эти файлы написаны для интерактивной работы Claude Code с человеком за клавиатурой. Ты работаешь автономно, внутри внешнего контроллера, и часть их правил к тебе НЕ применяется — не потому что их можно нарушать, а потому что их выполняет контроллер до и после тебя. Не пытайся их выполнять и не трать на них ходы:',
    '- **Plan-first protocol** (составить план и ждать подтверждения "go"/"approved") — не применяется: подтверждать некому, план уже утверждён в виде самого issue. Не останавливайся в ожидании ответа.',
    '- **Issue-first protocol** (проверить/создать GitHub Issue, добавить в Project) — уже сделано, issue существует, его тело приведено выше.',
    '- **Branch-first protocol** (`git status`/`git branch`, переключение на main, `git pull`, создание ветки, выставление Project Status) — уже сделано контроллером: ты уже на правильной ветке от правильного base branch.',
    '- **Task Closure Checklist** целиком (отметить Acceptance Criteria через `gh issue edit`, запись в `project-management/TEST_LOG.md`, "Closes #N" в описании PR, вопросы пользователю про `/code-review` и про README.md) — всё это делает контроллер/человек после тебя. Не редактируй TEST_LOG.md и не пытайся задавать вопросы пользователю — ответить некому.',
    '- **Git/PR order** (`git add`/`git commit`/`git push`/`gh pr create`) — делает контроллер, см. правило про отсутствие доступа к git/gh ниже.',
    '- **"Read First" → `gh issue view <n>`** — не нужно и не сработает: полное тело issue уже приведено выше между маркерами === ISSUE === / === END ISSUE ===.',
    '',
    'При этом ВСЁ содержательное из CLAUDE.md применяется к тебе в полном объёме, и его нарушение — это плохо сделанная задача: Architecture Rules и Архитектурные правила (границы модулей, ADR-017), Key Invariants (STORAGE_ROOT, отсутствие AiRun для экспорта, slug regex и т.д.), Prompt Pipeline Rules, Anti-Overclaiming Rules, Testing Rules (в частности ADR-020: один исходный файл — один одноимённый spec-файл; моки вместо реальных AI-вызовов), Documentation Rules (если поменялась структура модулей — обнови соответствующий раздел "Структура проекта" в apps/api/CLAUDE.md или apps/web/CLAUDE.md в том же изменении), принятые решения из project-management/DECISIONS.md и общий стиль/конвенции кода. Кратко: организационные протоколы вокруг задачи — не твои; правила о том, каким должен быть сам код, — твои.',
    '',
    'Если тесты остаются красными после 5 попыток исправить — не продолжай бесконечно, заверши ответ строкой `BLOCKED: <описание проблемы>`.',
    '',
    'Если для продолжения нужно решение человека — формулировка issue неоднозначна, есть несколько разумных вариантов реализации и непонятно, какой правильный, или чего-то не хватает в Context/Acceptance Criteria — НЕ гадай и НЕ выбирай вариант сам. Заверши ответ строкой `BLOCKED: <какое решение нужно и почему неоднозначно>`. Ты работаешь без присмотра — нет человека, который прямо сейчас подтвердит твоё предположение, поэтому неверное предположение хуже, чем остановка.',
    '',
    'Если в процессе реализации выясняется, что буквальное выполнение Acceptance Criteria и одновременное соблюдение всех Key Invariants из этой же issue физически невозможны без нарушения одного из них (например: способ, явно описанный в issue как решённый, на самом деле требует задеть данные/файлы/поведение, которые тот же issue запрещает трогать) — это НЕ повод тихо выбрать один пункт issue в ущерб другому и продолжить как ни в чём не бывало. Сформулируй противоречие явно и заверши ответ строкой `BLOCKED: <в чём конкретно конфликт между каким пунктом AC/Implementation Approach и каким Key Invariant>`. Молчаливый компромисс между двумя требованиями одной и той же issue — это ровно то же самое гадание за человека, которое запрещено правилом выше про неоднозначность, только обнаруженное не в начале, а в процессе работы.',
    '',
    'Если для выполнения задачи требуется менять файлы в apps/api/prisma/prompts (AI-промпты) или apps/api/knowledge-sources (база знаний) — НЕ вноси эти изменения. Это осознанное продуктовое решение, которое должен принять человек, не автономный агент. Вместо этого заверши ответ строкой `BLOCKED-PROMPT-CHANGE: <что именно и почему нужно поменять>`.',
    '',
    'Перед тем как завершить ответ строкой DONE — среди своих новых тестов найди assertions именно высокого риска: проверка подстроки/слова (`toContain`/`toMatch`/`includes`) внутри БОЛЬШОГО свободного текста — целого файла, целого документа, многострочного prose-контента (например: "содержимое промпт-файла содержит слово X"). Это высокий риск, потому что короткое слово может случайно встретиться где-то ещё в тексте по несвязанной причине — так и произошло в #215 (`content.toContain(\'"apply"\')` по всему файлу промпта прошёл бы, даже если убрать реальный enum, потому что слово "apply" ещё несколько раз встречается в прозе). Если таких assertions высокого риска пять или меньше — проверь на мутации каждый. Если больше пяти — проверь первые пять (например, по одному на каждый отдельный `it()`/`describe()` блок, где такой assertion встречается, чтобы покрыть разные части логики, а не пять подряд из одного блока) и не трать ходы на остальные — риск одного и того же класса ошибки в одном файле обычно системный, а не per-assertion, и пяти проверок достаточно, чтобы его заметить. Мутационная проверка: временно вырежи/измени именно то, что assertion должен ловить, прогони тест, убедись что он ПАДАЕТ, верни файл обратно. Это НЕ относится к assertions вида `violations.some(v => v.detail.includes(\'X\'))`/проверке короткого сообщения или label, которые твой же код только что сформировал специально под этот тест-кейс — там нет риска случайного совпадения в другом месте, эти проверки в мутационной проверке не нуждаются, даже если технически используют `toContain`/`includes`.',
    '',
    'Если твой код читает/парсит/анализирует реальные файлы, уже существующие в этой рабочей директории (например, файлы из apps/api/knowledge-sources, а не только придуманные тобой в юнит-тестах строки) — прогони свой код на этих реальных файлах и посмотри на результат, прежде чем считать логику готовой. Юнит-тесты на искусственных 2-3-строчных фикстурах, которые ты сам написал, не доказывают, что логика работает на настоящих данных — они лишь доказывают, что она делает то, что ты задумал в изолированном примере. Если результат на реальных данных выглядит бессмысленно (например, извлечённые «канонические имена» на самом деле являются именами файлов, подписями полей или случайными словами) — это баг в логике извлечения, который нужно исправить до DONE, а не то, что можно узнать только после мержа.',
    '',
    'Если Test Requirement, Acceptance Criteria или Docs to Read в issue ссылаются на файл/путь/директорию, которых на самом деле не существует в этой рабочей директории — это классический случай неоднозначности из правила выше (issue написан с ошибочным предположением). НЕ подставляй тихо синтетическую замену и не придумывай собственную интерпретацию того, что автор issue «на самом деле имел в виду» — заверши ответ строкой `BLOCKED: <какой путь не существует и что нужно уточнить>`.',
    '',
    'Если для реализации нужно прочитать данные/логику, уже определённые в другом файле (например, seed-данные, конфиг, схему), и прямой импорт натыкается на препятствие (например, у файла есть побочный эффект при импорте — top-level вызов, запись в БД и т.п.) — сначала попробуй устранить само препятствие в исходном файле (например, обернуть побочный эффект в `if (require.main === module)` и экспортировать нужные данные), а не копировать данные в новый файл с комментарием «синхронизируй вручную». Ручное дублирование источника правды — это в точности тот же класс бага (тихий дрейф между копиями), который ты, возможно, и должен предотвратить своим текущим тестом. Дублирование допустимо только если реальное препятствие невозможно убрать в рамках текущей задачи — и тогда явно объясни в SUMMARY, почему.',
    '',
    'У тебя НЕТ доступа к git commit/push/worktree и НЕТ доступа к gh — не пытайся их использовать, коммит/push/PR делает внешний контроллер после тебя. Твоя единственная задача — отредактировать файлы и прогнать тесты/lint/typecheck в этой директории.',
    '',
    'НЕ редактируй `.claude/settings.json` и `.claude/settings.local.json`, чтобы выдать себе дополнительные права (например, доступ к git/gh) — это осознанное ограничение, а не случайный пробел, и попытка обойти его — грубое нарушение, а не решение проблемы. Если тебе не хватает какого-то конкретного разрешения — это `BLOCKED` (см. правило про отказ в правах выше), не повод редактировать файлы настроек.',
    '',
    'Если какой-то инструмент или команда отклонена из-за прав доступа (permission denied / "not permitted" / "not in the allowed list") — это ограничение Claude Code, а не проблема пути/shell/директории. Повторная попытка той же команды другим синтаксисом (другой shell, `cd`/`Set-Location`, `--prefix`, heredoc и т.п.) НЕ поможет — это тот же самый отказ. Не трать на это больше одной попытки. Единственное исключение — если отказ пришёл именно на попытку отредактировать файл в apps/api/prisma/prompts или apps/api/knowledge-sources: это не баг permissions, это тот же самый случай "нужно менять промпты/базу знаний" из правила выше, просто он проявился как отказ прав, а не как осознанное решение до попытки редактирования. В этом случае заверши строкой `BLOCKED-PROMPT-CHANGE: <что именно и почему>`, а не `BLOCKED`. Для любого другого отказа прав сразу заверши строкой `BLOCKED: доступ отклонён для <что именно> — нужно расширить permissions.allow`.',
    '',
    'Когда закончишь, ЗАВЕРШИ свой финальный ответ РОВНО одним из трёх вариантов, каждый на новой строке, БЕЗ markdown-разметки (никакого `**жирного**`, `` `кода` `` или других символов вокруг этих строк — контроллер ищет ровно эти литеральные строки):',
    '',
    '1) Если задача выполнена и все Acceptance Criteria удовлетворены — НЕПОСРЕДСТВЕННО перед сентинель-строкой DONE выведи короткий самоотчёт: каждый пункт Acceptance Criteria из issue отдельной строкой, и одной фразой — чем конкретно он закрыт (какой файл, тест, проверка). Это не для контроллера, он это не парсит — это проверка для тебя самого: если по какому-то пункту не получается написать конкретный, а не общий ответ ("сделано", "готово") — этот пункт, скорее всего, не выполнен, и DONE писать рано. Дальше сама сентинель-строка:',
    'DONE',
    'TYPE: <feat|fix|docs|chore|refactor|test>',
    'SUMMARY: <короткое однострочное описание изменения, без номера issue>',
    '',
    '2) Если задача заблокирована (кроме случая с промптами/knowledge-sources выше):',
    'BLOCKED: <причина>',
    '',
    '3) Если нужны изменения промптов/knowledge-sources (см. выше):',
    'BLOCKED-PROMPT-CHANGE: <что и почему>',
  ];
}

function buildPrompt(chosen, maxTurns) {
  return [
    `Ты реализуешь GitHub Issue #${chosen.id} в этой рабочей директории (уже на правильной ветке, ответвлённой от правильного base branch — не переключай и не создавай ветку).`,
    '',
    `=== ISSUE #${chosen.id}: ${chosen.title || ''} ===`,
    chosen.body || '(тело issue пустое)',
    '=== END ISSUE ===',
    '',
    ...buildTaskRules(maxTurns),
  ].join('\n');
}

// Point-fix pass requested by the post-DONE review (see runIssue()) — same
// runDir/branch as the original DONE, same agent role and standing rules,
// but framed around fixing exactly what an independent reviewer (no shared
// memory, no Edit/Write access) found wrong, not redoing the whole task.
function buildFixPrompt(chosen, reviewFindings, maxTurns) {
  return [
    `Ты дорабатываешь свою же предыдущую реализацию GitHub Issue #${chosen.id} в этой же рабочей директории (та же ветка, тот же клон, ничего не переключай и не создавай заново). Независимый ревьюер — отдельный запуск без доступа к Edit/Write и без общей с тобой памяти — проверил твой предыдущий ответ DONE и нашёл проблему, которую нужно исправить.`,
    '',
    `=== ISSUE #${chosen.id}: ${chosen.title || ''} ===`,
    chosen.body || '(тело issue пустое)',
    '=== END ISSUE ===',
    '',
    '=== ЧТО НАШЁЛ REVIEW (обязательно разобрать) ===',
    reviewFindings,
    '=== END REVIEW ===',
    '',
    'Исправь именно то, что описано выше, точечно — не переделывай всю реализацию заново и не трогай то, что ревью не упомянул. Если, разобравшись, ты считаешь находку ложным срабатыванием — не меняй код ради самого изменения; опиши в самоотчёте перед DONE, почему находка не применима, и оставь код как есть, объяснение попадёт в SUMMARY. Если находка реальна, но её нельзя исправить, не нарушив что-то другое из этой же issue — это BLOCKED (см. правило про конфликт AC/Key Invariants ниже), а не молчаливый компромисс.',
    '',
    ...buildTaskRules(maxTurns),
  ].join('\n');
}

// Post-DONE self-review pass (see runIssue()) — a SEPARATE, fresh `claude -p`
// invocation with read-only permissions (writeReviewerPermissions()), so it
// has no way to "helpfully" patch its way to a false PASS. Exists because
// tsc/lint/test/test:e2e all being green does not prove the diff actually
// satisfies the issue's Key Invariants — found the hard way on ISSUE-287's
// own autonomous run, which passed all four and still silently deactivated
// real dev-DB rows the issue explicitly said not to touch. This prompt asks
// the same kind of question a human `/code-review` pass would, scoped
// specifically to the failure classes already observed across Ralph runs.
function buildReviewPrompt(chosen, diffText) {
  return [
    `Ты проверяешь уже готовую реализацию GitHub Issue #${chosen.id} — НЕ дописывай и не исправляй код, у тебя нет прав на Edit/Write, только на чтение и диагностические команды (git diff/log/show, npm run test/lint, npx tsc/*).`,
    '',
    `=== ISSUE #${chosen.id}: ${chosen.title || ''} ===`,
    chosen.body || '(тело issue пустое)',
    '=== END ISSUE ===',
    '',
    '=== DIFF (git diff HEAD) ===',
    diffText || '(диф пуст)',
    '=== END DIFF ===',
    '',
    'Другой агент (без общей с тобой памяти) только что реализовал эту issue и сам заявил, что всё сделано и все проверки (tsc/lint/test) зелёные. Зелёные проверки НЕ доказывают, что реализация соответствует issue — несколько раз уже случалось, что тесты проходили, а реализация тихо нарушала явно прописанный в issue инвариант или не ловила ту регрессию, ради которой писалась. Твоя задача — независимо перепроверить именно это, а не повторно гонять те же команды и доверять их результату на слово.',
    '',
    'Проверь диф по каждому из следующих пунктов и держи в голове, что "тесты зелёные" — не аргумент ни по одному из них:',
    '',
    '1. **Key Invariants из issue соблюдены буквально, не только по духу.** Если issue говорит "не трогать X" — найди в дифе любое место, где X читается, изменяется или удаляется, даже временно (например, "выключить и потом включить обратно" — это тоже "трогать"). Если invariant явно нарушен — это FAIL, независимо от того, что тесты проходят.',
    '2. **Acceptance Criteria выполнены по существу, а не только по факту наличия кода с похожим названием.** Если AC требует конкретную проверку (например, "убедиться, что тест падает при поломке X") — в дифе/логах должны быть настоящие следы того, что эта проверка правда выполнялась (не просто текстовый комментарий "проверено"), а не быть на честном слове самоотчёта другого агента.',
    '3. **Риск false-negative тестов**: assertions вида `toContain`/`toMatch`/`includes` по большому свободному тексту (файл целиком, многострочный prose) — временно испорти именно то, что assertion должен ловить, прогони тест, убедись что он ПАДАЕТ, верни обратно. Если у тебя нет прав что-то менять для этой проверки — опиши, что нашёл, и является ли это риском, вместо того чтобы промолчать.',
    '4. **Реальные данные, а не только придуманные фикстуры**, если код читает/парсит что-то из реального репозитория (например, apps/api/knowledge-sources) — проверь, что логика прогонялась и осмысленно работает на настоящих файлах, а не только на 2-3-строчных синтетических примерах.',
    '5. **Дублирование источника правды**: если что-то скопировано вручную из другого файла вместо того, чтобы устранить реальное препятствие к прямому использованию оригинала — отметь это.',
    '',
    'Не придирайся к стилю/оформлению — ищи именно содержательные расхождения с issue и реальные риски ложноположительных тестов, не косметику.',
    '',
    'Заверши ответ РОВНО одной из двух строк, каждая на новой строке, БЕЗ markdown-разметки вокруг неё:',
    '',
    '1) Если содержательных проблем не найдено:',
    'REVIEW: PASS',
    '',
    '2) Если найдена хотя бы одна содержательная проблема (нарушение Key Invariant, AC не выполнен по существу, недоказанная критичная проверка, тест не ловит то, для чего писался):',
    'REVIEW: FAIL: <конкретно что и где — файл/строка, какой пункт issue нарушен>',
  ].join('\n');
}

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
      prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--model',
      'sonnet',
      '--effort',
      'high',
    ];
    if (maxTurns != null) args.push('--max-turns', String(maxTurns));
    // stdin explicitly 'ignore' — we never write to it, and leaving it as an
    // open, silent pipe (spawn()'s default) made claude -p wait ~3s per
    // iteration for stdin it was never going to get.
    const child = spawn('claude', args, { cwd: runDir, stdio: ['ignore', 'pipe', 'pipe'] });

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

// Takes the LAST match of `re` in `text`, not the first — the agent's
// transcript can legitimately contain earlier text that quotes/plans around
// these exact sentinel words (e.g. restating the instructions) before the
// real, final verdict. Matching the first occurrence risked treating that
// as the verdict instead of what the agent actually concluded with.
function lastMatch(text, re) {
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  let match;
  let last = null;
  while ((match = global.exec(text)) !== null) {
    last = match;
    if (match.index === global.lastIndex) global.lastIndex++; // avoid infinite loop on zero-width match
  }
  return last;
}

// The agent sometimes wraps the sentinel line in markdown emphasis
// (`**DONE**` instead of `DONE`) despite the prompt asking for a literal
// line — found live on a real #282 run, where an otherwise fully-valid,
// fully-tested implementation was reported as agent_failed purely because
// the strict `^DONE\s*$` regex didn't match the bold-wrapped line. Strip
// leading/trailing markdown emphasis/code markers (`*`, `_`, backtick) from
// each line before matching, rather than trying to enumerate every possible
// wrapping in the regex itself.
function stripLineMarkdownEmphasis(text) {
  return text.replace(/^[ \t]*[*_`]+|[*_`]+[ \t]*$/gm, '');
}

// `rawOutput` accumulates the assistant's text across EVERY turn of the
// whole agent run (runAgent() does `output += block.text` per turn, not
// just the final message) — a long run can easily echo one of these
// sentinel words in passing (e.g. reasoning about why something is *not*
// a BLOCKED-PROMPT-CHANGE case) well before the real, final verdict. Fixed
// by index (each `lastMatch()` gives the last occurrence's index): pick
// whichever sentinel actually occurs LAST in the whole text, not the first
// one found by checking patterns in a fixed priority order — a fixed
// priority order would let an early, incidental mention of
// "BLOCKED-PROMPT-CHANGE:" win over a legitimate final DONE.
function parseVerdict(rawOutput) {
  const output = stripLineMarkdownEmphasis(rawOutput);
  const blockedPromptMatch = lastMatch(output, /^BLOCKED-PROMPT-CHANGE:\s*([\s\S]*)$/m);
  const blockedMatch = lastMatch(output, /^BLOCKED:\s*([\s\S]*)$/m);
  const doneMatch = lastMatch(output, /^DONE\s*$/m);

  const candidates = [];
  if (blockedPromptMatch) candidates.push({ index: blockedPromptMatch.index, kind: 'blocked-prompt-change', reason: blockedPromptMatch[1].trim() });
  if (blockedMatch) candidates.push({ index: blockedMatch.index, kind: 'blocked', reason: blockedMatch[1].trim() });
  if (doneMatch) candidates.push({ index: doneMatch.index, kind: 'done' });

  if (candidates.length === 0) return { kind: 'unknown' };
  candidates.sort((a, b) => b.index - a.index);
  const winner = candidates[0];

  if (winner.kind === 'done') {
    const typeMatch = lastMatch(output, /^TYPE:\s*(\w+)/m);
    const summaryMatch = lastMatch(output, /^SUMMARY:\s*(.+)$/m);
    return {
      kind: 'done',
      type: typeMatch ? typeMatch[1] : 'chore',
      summary: summaryMatch ? summaryMatch[1].trim() : 'implement issue',
    };
  }
  return { kind: winner.kind, reason: winner.reason };
}

// Same last-occurrence-wins approach as parseVerdict() above, for the
// separate post-DONE self-review pass's own sentinel lines.
function parseReviewVerdict(rawOutput) {
  const output = stripLineMarkdownEmphasis(rawOutput);
  const failMatch = lastMatch(output, /^REVIEW: FAIL:\s*([\s\S]*)$/m);
  const passMatch = lastMatch(output, /^REVIEW: PASS\s*$/m);

  const candidates = [];
  if (failMatch) candidates.push({ index: failMatch.index, kind: 'fail', reason: failMatch[1].trim() });
  if (passMatch) candidates.push({ index: passMatch.index, kind: 'pass' });

  if (candidates.length === 0) return { kind: 'unknown' };
  candidates.sort((a, b) => b.index - a.index);
  return candidates[0];
}

// --- controller-owned git/gh mutations (the agent never does these) ---

function postBlockedComment(id, reason, promptChange) {
  gh(['issue', 'comment', String(id), '--body', `BLOCKED: ${reason}`]);
  gh(['issue', 'edit', String(id), '--add-label', GENERIC_BLOCK_LABEL]);
  if (promptChange) {
    gh(['issue', 'edit', String(id), '--add-label', BLOCK_LABEL]);
  }
}

// The agent is explicitly told not to touch TEST_LOG.md (it has no way to
// verify a human would agree the entry is honest, and CLAUDE.md's Task
// Closure Checklist treats this file as a human-facing record) — the
// controller writes it instead, from what it actually observed (the agent's
// own DONE verdict), clearly labeled as self-reported rather than
// independently re-verified.
function appendTestLogEntry(runDir, chosen, verdict, branchName) {
  const logPath = path.join(runDir, 'project-management', 'TEST_LOG.md');
  if (!fs.existsSync(logPath)) return; // don't create the file from a fresh clone if missing
  const date = new Date().toISOString().slice(0, 10);
  const entry = [
    '',
    `## ${date} — ISSUE-${chosen.id} — ${chosen.title || ''} (Ralph loop)`,
    '',
    '### Commands',
    '',
    '```bash',
    'node .claude/ralph/run.js',
    '```',
    '',
    '### Result',
    '',
    `Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: \`${branchName}\`.`,
    '',
    '### Evidence',
    '',
    `- TYPE: ${verdict.type}`,
    `- SUMMARY: ${verdict.summary}`,
    '',
  ].join('\n');
  fs.appendFileSync(logPath, entry);
}

function commitChanges(runDir, chosen, verdict) {
  git(['add', '-A'], { cwd: runDir });
  const message = `${verdict.type}: ISSUE-${chosen.id} ${verdict.summary}`;
  git(['commit', '-m', message], { cwd: runDir });
  return message;
}

function pushBranch(runDir, branchName) {
  git(['push', '-u', 'origin', branchName], { cwd: runDir });
}

function createPr(chosen, branchName, baseRef, commitMessage) {
  const base = baseRef.replace(/^origin\//, '');
  const body = `Closes #${chosen.id}\n\nImplemented by Ralph loop. Passed an automated post-DONE self-review pass (separate read-only agent invocation) — still review the diff yourself before merging.`;
  return gh(['pr', 'create', '--base', base, '--head', branchName, '--title', commitMessage, '--body', body]);
}

// --- one issue, full state machine ---

async function runIssue(config, byId, chosen) {
  const branchName = branchNameFor(config, chosen.id, chosen.title);
  const baseRef = resolveBaseRef(config, byId, chosen);
  const runDir = runDirFor(chosen.id);
  const reviewMaxTurns = config.reviewMaxTurns ?? DEFAULT_REVIEW_MAX_TURNS;

  console.log(`🌱 Клон ${runDir}, ветка ${branchName} от ${baseRef}.`);
  try {
    prepareClone(runDir, baseRef, branchName);
    writeAgentPermissions(runDir);
    installDependencies(runDir);
  } catch (err) {
    return { status: 'prepare_failed', error: err.message };
  }

  const prompt = buildPrompt(chosen, config.maxTurns);
  const agentResult = await runAgent(prompt, runDir, config.maxTurns);
  if (!agentResult.ok) {
    return { status: 'agent_failed', error: agentResult.error, runDir };
  }

  let verdict = parseVerdict(agentResult.output);

  if (verdict.kind === 'blocked' || verdict.kind === 'blocked-prompt-change') {
    try {
      postBlockedComment(chosen.id, verdict.reason, verdict.kind === 'blocked-prompt-change');
    } catch (err) {
      console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
    }
    removeRunDirIfExists(runDir);
    return { status: 'blocked', reason: verdict.reason, promptChange: verdict.kind === 'blocked-prompt-change' };
  }

  if (verdict.kind !== 'done') {
    return { status: 'agent_failed', error: 'agent did not return DONE or BLOCKED', runDir, output: agentResult.output.slice(-2000) };
  }

  let diff = git(['status', '--porcelain'], { cwd: runDir });
  if (!diff) {
    return { status: 'validate_failed', error: 'agent said DONE but produced no diff', runDir };
  }

  // Post-DONE self-review — only for diffs that actually touch code, not
  // pure docs (see hasCodeChanges()/DOC_ONLY_PATH_PATTERNS above). A
  // doc-only change like #271/#272/#273 has no code-level Key Invariant to
  // silently violate, so a second full agent invocation on it is pure cost.
  // Exists because tsc/lint/test all green does not prove a CODE diff
  // actually satisfies the issue's own Key Invariants — found on ISSUE-287's
  // own autonomous run (see buildReviewPrompt()'s comment).
  //
  // On a real finding, this does NOT jump straight to BLOCKED — it gives the
  // implementer up to MAX_REVIEW_FIX_ATTEMPTS point-fix-then-re-review
  // cycles first (a SEPARATE agent invocation per attempt, framed around
  // fixing exactly what was found — buildFixPrompt()). Only exhausting that
  // budget (or the fixer itself saying BLOCKED, or an unparseable review
  // verdict) escalates to the same BLOCKED handling as an implementer
  // BLOCKED: no commit, no PR, `ralph-blocked` label so it isn't silently
  // re-picked next run.
  if (hasCodeChanges(diff)) {
    let reviewAttempt = 0;
    for (;;) {
      console.log(`🔎 Пост-DONE self-review для issue #${chosen.id} (попытка ${reviewAttempt + 1}/${MAX_REVIEW_FIX_ATTEMPTS + 1})...`);
      writeReviewerPermissions(runDir);
      const diffText = git(['diff', 'HEAD'], { cwd: runDir });
      const reviewPrompt = buildReviewPrompt(chosen, diffText);
      const reviewAgentResult = await runAgent(reviewPrompt, runDir, reviewMaxTurns);
      if (!reviewAgentResult.ok) {
        return { status: 'review_failed', error: reviewAgentResult.error, runDir };
      }

      const reviewVerdict = parseReviewVerdict(reviewAgentResult.output);

      if (reviewVerdict.kind === 'pass') {
        console.log(`✅ Self-review пройден для issue #${chosen.id}${reviewAttempt > 0 ? ` (после ${reviewAttempt} фикс-итераци${reviewAttempt === 1 ? 'и' : 'й'})` : ''}.`);
        break;
      }

      const unparseable = reviewVerdict.kind !== 'fail';
      const outOfAttempts = reviewAttempt >= MAX_REVIEW_FIX_ATTEMPTS;

      if (unparseable || outOfAttempts) {
        const reason = unparseable
          ? 'Self-review (Ralph loop code-review pass) did not return a clear PASS/FAIL verdict — treating as blocked out of caution.'
          : `Self-review (Ralph loop code-review pass) still found a real issue after ${reviewAttempt} fix attempt(s): ${reviewVerdict.reason}`;
        try {
          postBlockedComment(chosen.id, reason, false);
        } catch (err) {
          console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
        }
        removeRunDirIfExists(runDir);
        return { status: 'review_blocked', reason };
      }

      // Real, fixable-in-principle finding, and attempts remain — try a
      // point fix. Restore full Edit/Write permissions (writeReviewerPermissions()
      // above stripped them) before running the fixer.
      console.log(`🔧 Self-review нашёл проблему для issue #${chosen.id}, пробую точечный фикс: ${reviewVerdict.reason}`);
      writeAgentPermissions(runDir);
      const fixPrompt = buildFixPrompt(chosen, reviewVerdict.reason, config.maxTurns);
      const fixAgentResult = await runAgent(fixPrompt, runDir, config.maxTurns);
      if (!fixAgentResult.ok) {
        return { status: 'agent_failed', error: fixAgentResult.error, runDir };
      }

      const fixVerdict = parseVerdict(fixAgentResult.output);

      if (fixVerdict.kind === 'blocked' || fixVerdict.kind === 'blocked-prompt-change') {
        try {
          postBlockedComment(chosen.id, fixVerdict.reason, fixVerdict.kind === 'blocked-prompt-change');
        } catch (err) {
          console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
        }
        removeRunDirIfExists(runDir);
        return { status: 'blocked', reason: fixVerdict.reason, promptChange: fixVerdict.kind === 'blocked-prompt-change' };
      }

      if (fixVerdict.kind !== 'done') {
        return { status: 'agent_failed', error: 'fix agent did not return DONE or BLOCKED', runDir, output: fixAgentResult.output.slice(-2000) };
      }

      // Fix applied — re-verify there's still an actual diff, adopt the
      // fixer's TYPE/SUMMARY as the current verdict (it superseeds the
      // original one for commit-message purposes), and loop back to review
      // it again from scratch.
      diff = git(['status', '--porcelain'], { cwd: runDir });
      if (!diff) {
        return { status: 'validate_failed', error: 'fix agent said DONE but produced no diff', runDir };
      }
      verdict = fixVerdict;
      reviewAttempt++;
    }
  }

  try {
    appendTestLogEntry(runDir, chosen, verdict, branchName);
  } catch (err) {
    console.log(`⚠️ Не удалось дописать TEST_LOG.md для issue #${chosen.id}: ${err.message}`);
  }

  let commitMessage;
  try {
    commitMessage = commitChanges(runDir, chosen, verdict);
  } catch (err) {
    return { status: 'commit_failed', error: err.message, runDir };
  }

  try {
    pushBranch(runDir, branchName);
  } catch (err) {
    return { status: 'push_failed', error: err.message, runDir };
  }

  let pr;
  try {
    pr = createPr(chosen, branchName, baseRef, commitMessage);
  } catch (err) {
    return { status: 'pr_failed', error: err.message, runDir };
  }

  removeRunDirIfExists(runDir);
  return { status: 'done', pr };
}

module.exports = {
  BLOCK_LABEL,
  GENERIC_BLOCK_LABEL,
  loadConfig,
  writeState,
  acquireLock,
  releaseLock,
  classify,
  runIssue,
  buildPrompt,
  buildReviewPrompt,
  buildFixPrompt,
  appendTestLogEntry,
  parseVerdict,
  parseReviewVerdict,
  hasCodeChanges,
};
