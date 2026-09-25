/**
 * Single source of truth for the metaskills that must be loaded before code
 * edits in each app (root CLAUDE.md "Required Skills"). Consumed by
 * skill-gate-hook.js (interactive enforcement) and .claude/ralph/prompts.js
 * (autonomous agent prompt).
 */
const BASE_SKILLS = [
  'js-conventions',
  'js-gof',
  'js-data-structures',
  'error-handling',
];

const APPS = [
  {
    dir: 'apps/api',
    extensions: /\.(ts|js|mjs|cjs)$/,
    label: 'backend (apps/api)',
    skills: [...BASE_SKILLS, 'nestjs-best-practices'],
  },
  {
    dir: 'apps/web',
    extensions: /\.(ts|tsx|js|jsx|css)$/,
    label: 'frontend (apps/web)',
    skills: ['vercel-react-best-practices', 'ui-ux-pro-max', ...BASE_SKILLS],
  },
];

// Matches the directory as a whole path segment (either slash style), not as
// a fragment of a longer name like "docs/notes-about-apps/api-x".
const mentionsApp = (text, dir) => {
  const pattern = dir.split('/').join('[\\\\/]');
  return new RegExp(`(^|[\\s\`'"(])${pattern}([\\\\/\\s\`'")]|$)`).test(text);
};

// Union (order-preserving, deduplicated) of the required skills for every app
// that `text` (e.g. an issue's Affects section) mentions by directory.
const requiredSkillsFor = (text) => {
  const skills = new Set();
  for (const app of APPS) {
    if (!mentionsApp(text, app.dir)) continue;
    for (const skill of app.skills) skills.add(skill);
  }
  return [...skills];
};

module.exports = { APPS, requiredSkillsFor };
