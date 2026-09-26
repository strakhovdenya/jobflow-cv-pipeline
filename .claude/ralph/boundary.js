// Agent boundary checks owned by the controller (issue #398). Everything here is deterministic and
// runs outside the agent: the prompt only asks the agent to stay inside its lane, these functions
// are what actually notices when it did not. Pure where possible so .claude/ralph/boundary.test.js
// can cover them without spawning git or claude.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- scrubbed environment for the agent and for agent-written code (tests run by the gate) ---

// Exact names (case-insensitive: Windows env keys are case-insensitive and come as `Path`,
// `SystemRoot`, ...). Enough for `claude`, node, npx and git to start; no tokens of any kind.
const AGENT_ENV_NAMES = new Set([
  'PATH',
  'PATHEXT',
  'HOME',
  'USERPROFILE',
  'HOMEDRIVE',
  'HOMEPATH',
  'APPDATA',
  'LOCALAPPDATA',
  'PROGRAMDATA',
  'PROGRAMFILES',
  'SYSTEMROOT',
  'SYSTEMDRIVE',
  'WINDIR',
  'COMSPEC',
  'TEMP',
  'TMP',
  'TMPDIR',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TERM',
  'SHELL',
  'USER',
  'USERNAME',
  'LOGNAME',
  'XDG_CONFIG_HOME',
  'XDG_CACHE_HOME',
  'XDG_DATA_HOME',
  'NODE_EXTRA_CA_CERTS',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
]);

// `claude` itself reads its API key / OAuth token and settings from these.
const AGENT_ENV_PREFIXES = ['ANTHROPIC_', 'CLAUDE_CODE_'];

const isAgentEnvName = (name) => {
  const upper = name.toUpperCase();
  if (AGENT_ENV_NAMES.has(upper)) return true;
  return AGENT_ENV_PREFIXES.some((prefix) => upper.startsWith(prefix));
};

// GH_TOKEN, GITHUB_TOKEN, cloud keys, DATABASE_URL etc. are never copied: an allowlist, not a
// denylist, so a secret with a name nobody thought of stays out too.
function buildAgentEnv(sourceEnv) {
  const env = {};
  for (const [name, value] of Object.entries(sourceEnv)) {
    if (value !== undefined && isAgentEnvName(name)) env[name] = value;
  }
  return env;
}

// --- `git status --porcelain -z -uall` ---

// -z output: `XY path\0`, and for a rename/copy `XY new\0old\0`. Paths are raw (no quoting), so
// names with spaces or non-ASCII characters come through unchanged, unlike the line format.
function parseStatusZ(output) {
  const parts = output.split('\0');
  const entries = [];
  for (let index = 0; index < parts.length; index++) {
    const entry = parts[index];
    if (entry.length < 4) continue;
    const status = entry.slice(0, 2);
    const isRenameOrCopy = status[0] === 'R' || status[0] === 'C';
    const origPath = isRenameOrCopy ? parts[++index] || null : null;
    entries.push({ status, path: entry.slice(3), origPath });
  }
  return entries;
}

const entryPaths = (entry) => (entry.origPath ? [entry.path, entry.origPath] : [entry.path]);

// Case-insensitive on purpose: on Windows and macOS `.GitHub/workflows/x.yml` IS `.github/...`.
function isProtectedPath(filePath, protectedPrefixes) {
  const lower = filePath.replace(/\\/g, '/').toLowerCase();
  return protectedPrefixes.some((prefix) => {
    const normalized = prefix.toLowerCase();
    return lower.startsWith(normalized) || `${lower}/` === normalized;
  });
}

// Returns every changed path (either side of a rename) under a protected prefix.
function findProtectedChanges(entries, protectedPrefixes) {
  const hits = [];
  for (const entry of entries) {
    for (const filePath of entryPaths(entry)) {
      if (isProtectedPath(filePath, protectedPrefixes)) hits.push(filePath);
    }
  }
  return hits;
}

// --- package.json / tool configs the gate depends on ---

// Fields that change what the gate or `npm install` executes.
const GUARDED_PACKAGE_FIELDS = [
  'scripts',
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'overrides',
  'workspaces',
  'jest',
  'eslintConfig',
];

const TOOL_CONFIG_RE =
  /(^|\/)(jest\.config\.[^/]+|vitest\.(config|workspace)\.[^/]+|eslint\.config\.[^/]+|\.eslintrc(\.[^/]+)?|tsconfig(\.[^/]+)?\.json)$/i;

const isPackageJson = (filePath) => filePath === 'package.json' || filePath.endsWith('/package.json');

const parseJsonOrNull = (text) => {
  if (text === null) return {};
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// Guarded fields whose value differs between the two texts (`null` text = file absent).
function changedPackageFields(beforeText, afterText) {
  const before = parseJsonOrNull(beforeText);
  const after = parseJsonOrNull(afterText);
  if (before === null || after === null) return ['(unparseable package.json)'];
  return GUARDED_PACKAGE_FIELDS.filter(
    (field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null),
  );
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The path must appear as its own token in `## Affects` — plain substring matching would let
// `apps/api/package.json` in Affects excuse a change to the root `package.json`.
function isNamedInAffects(filePath, affectsText) {
  const pattern = new RegExp(`(^|[\\s\`'"(,])${escapeRegExp(filePath)}($|[\\s\`'"),:;])`, 'm');
  return pattern.test(affectsText || '');
}

// `readBefore(path)` -> content at HEAD or null; `readAfter(path)` -> working-tree content or null.
function findUndeclaredToolingChanges(entries, affectsText, readBefore, readAfter) {
  const violations = [];
  for (const entry of entries) {
    for (const filePath of entryPaths(entry)) {
      if (isNamedInAffects(filePath, affectsText)) continue;
      if (isPackageJson(filePath)) {
        const fields = changedPackageFields(readBefore(filePath), readAfter(filePath));
        if (fields.length > 0) violations.push(`${filePath} (${fields.join(', ')})`);
      } else if (TOOL_CONFIG_RE.test(filePath)) {
        violations.push(filePath);
      }
    }
  }
  return violations;
}

// --- .git/ fingerprint (git status never reports changes inside .git itself) ---

function listFilesRecursive(dir) {
  let names;
  try {
    names = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const item of names) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...listFilesRecursive(full));
    else files.push(full);
  }
  return files.sort();
}

// Hooks run on the controller's own `git commit`, config holds remotes and hooksPath — the two
// places inside .git/ where an agent edit turns into code execution or a push elsewhere.
function gitMetaFingerprint(runDir) {
  const gitDir = path.join(runDir, '.git');
  const files = [path.join(gitDir, 'config'), ...listFilesRecursive(path.join(gitDir, 'hooks'))];
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(path.relative(gitDir, file));
    hash.update('\0');
    try {
      hash.update(fs.readFileSync(file));
    } catch {
      hash.update('(missing)');
    }
    hash.update('\0');
  }
  return hash.digest('hex');
}

// --- whole-task budget (all agent calls of one issue together) ---

function createTaskBudget({ maxWallClockMs, maxUsd, now = Date.now }) {
  const startedAt = now();
  let spentUsd = 0;

  const remainingMs = () => maxWallClockMs - (now() - startedAt);
  const remainingUsd = () => (maxUsd == null ? null : maxUsd - spentUsd);

  const record = (costUsd) => {
    if (typeof costUsd === 'number' && Number.isFinite(costUsd)) spentUsd += costUsd;
  };

  const exhaustedReason = () => {
    if (remainingMs() <= 0) return `task time budget of ${Math.round(maxWallClockMs / 60000)} min exhausted`;
    const usd = remainingUsd();
    if (usd !== null && usd <= 0) return `task cost budget of $${maxUsd} exhausted (spent $${spentUsd.toFixed(2)})`;
    return null;
  };

  return { record, remainingMs, remainingUsd, exhaustedReason, spentUsd: () => spentUsd };
}

module.exports = {
  buildAgentEnv,
  parseStatusZ,
  isProtectedPath,
  findProtectedChanges,
  changedPackageFields,
  isNamedInAffects,
  findUndeclaredToolingChanges,
  gitMetaFingerprint,
  createTaskBudget,
};
