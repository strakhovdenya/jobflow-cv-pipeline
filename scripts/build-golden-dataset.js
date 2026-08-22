#!/usr/bin/env node
/**
 * One-off script for ISSUE-204: walk the real processed-application tree
 * (outside this repo, at SOURCE_ROOT below) and generate
 * project-management/golden-dataset/<case-slug>/{case.md,manual-cv.md}
 * for every usable case, per docs/10_calibration_and_parity.md §3.2 and
 * docs/research-ai-output-calibration.md §4.1.
 *
 * Classification mirrors the manual review already done in ISSUE-203
 * (see project-management/TEST_LOG.md, "ISSUE-203" entry):
 *   - has vacancy .txt + real sent CV (03_targeted_CV_content_*.md and/or CV .pdf, non-cover) -> apply/maybe
 *   - has vacancy .txt + SKIP_*reason*.md and no CV -> skip
 *   - has vacancy .txt + both -> mixed (manual_decision: apply, skip_draft_present: true)
 *   - has vacancy .txt + neither -> excluded (in-progress/abandoned)
 */
const fs = require('fs');
const path = require('path');

const SOURCE_ROOT = 'D:\\infa\\Documents\\jobs for analys\\2026';
const OUT_ROOT = path.join(__dirname, '..', 'project-management', 'golden-dataset');
const DATE_ADDED = '2026-08-22';

function isTxt(f) { return /\.txt$/i.test(f); }
function isTargetedCvMd(f) { return /^03_targeted_cv_content.*\.md$/i.test(f); }
function isSkipReason(f) { return /^skip_.*reason.*\.md$/i.test(f); }
function isCoverLetter(f) { return /cover.?letter/i.test(f); }
function isCvPdf(f) { return /\.pdf$/i.test(f) && !isCoverLetter(f); }

// Find every leaf folder that directly contains a vacancy .txt file.
function findCaseFolders(root) {
  const results = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }
    const files = entries.filter((e) => e.isFile()).map((e) => e.name);
    if (files.some(isTxt)) {
      results.push(dir);
    }
    for (const e of entries) {
      if (e.isDirectory()) walk(path.join(dir, e.name));
    }
  }
  walk(root);
  return results;
}

function classify(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
  const txtFiles = files.filter(isTxt);
  const mdCv = files.filter(isTargetedCvMd);
  const skipMd = files.filter(isSkipReason);
  const cvPdf = files.filter(isCvPdf);
  const hasCv = mdCv.length > 0 || cvPdf.length > 0;
  const hasSkip = skipMd.length > 0;

  if (!hasCv && !hasSkip) return { status: 'excluded', dir };
  if (hasCv && hasSkip) return { status: 'mixed', dir, txtFiles, mdCv, skipMd, cvPdf };
  if (hasCv) return { status: 'apply', dir, txtFiles, mdCv, cvPdf };
  return { status: 'skip', dir, txtFiles, skipMd };
}

function slugifyPart(s) {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[®™,]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function makeSlug(companyFolder, dateFolder) {
  // company folder relative to SOURCE_ROOT is the top-level company name.
  const company = slugifyPart(companyFolder);
  const dateSlug = dateFolder ? dateFolder.replace(/\./g, '') : null;
  const base = dateSlug ? `${company}_${dateSlug}` : company;
  return base;
}

function readTextFile(p) {
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}

function yamlSingleQuote(s) {
  return String(s).replace(/'/g, "''");
}

// 03_targeted_CV_content_*.md always carries a "Decision before CV: <apply|maybe|...>" metadata
// line (Prompt 2's own Metadata section) — this is the real recorded decision, and it is often
// "maybe", not "apply". Extract it instead of assuming every case with a CV was an "apply".
function extractDecisionBeforeCv(mdText) {
  const m = mdText.match(/Decision before CV:\s*(.+)/i);
  return m ? m[1].trim() : null;
}

function normalizeDecision(raw) {
  const lower = raw.toLowerCase();
  if (lower.startsWith('maybe')) return 'maybe';
  if (lower.startsWith('apply')) return 'apply';
  // e.g. "skip, overridden by user request to apply" — a CV was actually produced, so the
  // decision that led to a real CV was, in the end, apply; the raw text preserves the nuance.
  if (lower.includes('maybe') && !lower.includes('apply')) return 'maybe';
  return 'apply';
}

function main() {
  const caseDirs = findCaseFolders(SOURCE_ROOT);
  const results = caseDirs.map(classify);

  const included = results.filter((r) => r.status !== 'excluded');
  const excluded = results.filter((r) => r.status === 'excluded');

  fs.mkdirSync(OUT_ROOT, { recursive: true });

  const slugCounts = new Map();
  const manifest = [];

  for (const r of included) {
    const rel = path.relative(SOURCE_ROOT, r.dir);
    const parts = rel.split(path.sep);
    const companyFolder = parts[0];
    const dateFolder = parts.length > 1 ? parts[1] : null;

    let slug = makeSlug(companyFolder, dateFolder);
    if (slugCounts.has(slug)) {
      const n = slugCounts.get(slug) + 1;
      slugCounts.set(slug, n);
      slug = `${slug}_${n}`;
    } else {
      slugCounts.set(slug, 1);
    }

    const caseDir = path.join(OUT_ROOT, slug);
    fs.mkdirSync(caseDir, { recursive: true });

    // vacancy text: concatenate all .txt files found in the folder (normally one).
    const vacancyText = r.txtFiles
      .map((f) => readTextFile(path.join(r.dir, f)))
      .join('\n\n');

    let manualDecision;
    let manualDecisionRaw = null;
    let skipDraftPresent = false;
    let manualCvBody;

    if (r.status === 'apply') {
      if (r.mdCv.length > 0) {
        manualCvBody = r.mdCv.map((f) => readTextFile(path.join(r.dir, f))).join('\n\n---\n\n');
        manualDecisionRaw = extractDecisionBeforeCv(manualCvBody);
        manualDecision = manualDecisionRaw ? normalizeDecision(manualDecisionRaw) : 'apply';
      } else {
        manualCvBody = `_No Markdown targeted-CV-content file found for this case; the real sent CV exists only as a binary PDF on disk at the source folder (see \`source_folder\` in case.md frontmatter): ${r.cvPdf.join(', ')}._`;
        manualDecision = 'apply';
      }
    } else if (r.status === 'skip') {
      manualDecision = 'skip';
      manualCvBody = r.skipMd.map((f) => readTextFile(path.join(r.dir, f))).join('\n\n---\n\n');
    } else if (r.status === 'mixed') {
      // A CV was actually produced and sent despite an earlier skip recommendation/draft, so the
      // decision that actually happened is apply — normalizeDecision() is not used here since the
      // raw text ("skip, overridden by...", "user chose to apply despite...") does not fit the
      // apply/maybe pattern it expects; the raw text is still preserved for context.
      manualDecision = 'apply';
      skipDraftPresent = true;
      if (r.mdCv.length > 0) {
        manualCvBody = r.mdCv.map((f) => readTextFile(path.join(r.dir, f))).join('\n\n---\n\n');
        manualDecisionRaw = extractDecisionBeforeCv(manualCvBody);
      } else {
        manualCvBody = `_No Markdown targeted-CV-content file found; real sent CV exists only as a binary PDF: ${r.cvPdf.join(', ')}._`;
      }
      manualCvBody += `\n\n---\n\n## SKIP reasoning from Prompt 1 (overridden — human applied anyway)\n\n`;
      manualCvBody += r.skipMd.map((f) => readTextFile(path.join(r.dir, f))).join('\n\n---\n\n');
    }

    const sourceFolderDisplay = r.dir; // absolute path outside the repo, informational only

    // Both 03_targeted_CV_content_*.md and SKIP_*_reason_*.md are outputs of the pre-automation
    // manual chat workflow, not independently hand-typed text:
    //   - Prompt 1 (quick vacancy analysis) decides apply/maybe/skip; on SKIP it also generates
    //     the SKIP_<Company>_<Role>_reason_RU.md archive note itself (see prompt §3.1) — there is
    //     no separate "skip-reason prompt".
    //   - Prompt 2 (targeted CV content) generates 03_targeted_CV_content_[Company]_[Role].md,
    //     which the human then used as the basis for the CV actually sent (PDF).
    // "Manual" here means the human ran these prompts by hand, one vacancy at a time, and
    // approved/sent the result — not that no AI was involved in producing the text.
    const manualCvOrigin = r.status === 'skip'
      ? 'produced by the manual Prompt 1 (quick vacancy analysis) run when the decision was SKIP; Prompt 1 itself generates this file, there is no separate skip-reason prompt; accepted by the human as the final skip reasoning'
      : 'produced by the manual Prompt 2 (targeted CV content) run; approved by the human and used as the basis for the CV actually sent';

    const frontmatter = [
      '---',
      `slug: '${yamlSingleQuote(slug)}'`,
      `source_folder: '${yamlSingleQuote(sourceFolderDisplay)}'`,
      `manual_decision: ${manualDecision}`,
      ...(manualDecisionRaw ? [`manual_decision_raw: '${yamlSingleQuote(manualDecisionRaw)}'`] : []),
      ...(skipDraftPresent ? ['skip_draft_present: true'] : []),
      `manual_cv_origin: '${yamlSingleQuote(manualCvOrigin)}'`,
      `date_added: "${DATE_ADDED}"`,
      '---',
      '',
    ].join('\n');

    const caseMd = frontmatter + '# Vacancy source\n\n' + vacancyText.trim() + '\n';
    fs.writeFileSync(path.join(caseDir, 'case.md'), caseMd, 'utf8');

    const manualCvHeader = r.status === 'skip'
      ? '# Skip reasoning (Prompt 1 output, SKIP branch)\n\n'
      : '# Targeted CV content (Prompt 2 output, basis for the sent CV)\n\n';
    fs.writeFileSync(path.join(caseDir, 'manual-cv.md'), manualCvHeader + manualCvBody.trim() + '\n', 'utf8');

    manifest.push({ slug, status: r.status, dir: r.dir });
  }

  console.log(`Included: ${included.length} (apply=${included.filter(r=>r.status==='apply').length}, skip=${included.filter(r=>r.status==='skip').length}, mixed=${included.filter(r=>r.status==='mixed').length})`);
  console.log(`Excluded: ${excluded.length}`);
  for (const e of excluded) console.log('  EXCLUDED:', e.dir);
  console.log(`Total case dirs found: ${caseDirs.length}`);
  fs.writeFileSync(path.join(__dirname, 'golden-dataset-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

main();
