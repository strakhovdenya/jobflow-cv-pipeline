#!/usr/bin/env node
/**
 * postinstall: копирует skills пакета `metaskills` в .claude/skills/<name>.
 *
 * Claude Code (и автономные агенты) ищут skills на глубине .claude/skills/<name>/SKILL.md, а
 * пакет кладёт их в node_modules/metaskills/skills/<name>. Симлинки/junction не подходят:
 * перечисление через entry.isDirectory() для ссылок даёт false, к тому же ссылки не переживают
 * git clone. Поэтому копируем обычные директории; обновление пакета подтягивается на
 * следующем `npm install` (или через `npm run skills:update`). Копии лежат в .gitignore.
 *
 * Скрипт никогда не валит установку: нет пакета — молча пропускаем.
 */
const fs = require('node:fs');
const path = require('node:path');

const SKILLS = [
  'data-structures',
  'js-data-structures',
  'js-conventions',
  'error-handling',
  'js-gof',
];

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'node_modules', 'metaskills', 'skills');
const target = path.join(root, '.claude', 'skills');

const removeExisting = (dest) => {
  const stat = fs.lstatSync(dest, { throwIfNoEntry: false });
  if (!stat) return;
  // Ссылку (symlink/junction) снимаем как ссылку, не заходя внутрь
  if (stat.isSymbolicLink()) fs.unlinkSync(dest);
  else fs.rmSync(dest, { recursive: true, force: true });
};

try {
  if (!fs.existsSync(source)) {
    console.log('setup-metaskills: metaskills не установлен, пропускаю');
    process.exit(0);
  }

  fs.mkdirSync(target, { recursive: true });
  for (const name of SKILLS) {
    const from = path.join(source, name);
    if (!fs.existsSync(from)) {
      console.warn(`setup-metaskills: нет ${name} в пакете, пропускаю`);
      continue;
    }
    const dest = path.join(target, name);
    removeExisting(dest);
    fs.cpSync(from, dest, { recursive: true });
  }
  console.log(`setup-metaskills: скопировано skills: ${SKILLS.length}`);
} catch (error) {
  console.warn('setup-metaskills: не удалось скопировать skills:', error);
}
