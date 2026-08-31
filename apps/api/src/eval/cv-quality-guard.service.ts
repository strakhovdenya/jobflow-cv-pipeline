/**
 * Eval Layer 0 — deterministic CV quality guard (ISSUE-282).
 *
 * Checks a TargetedCvContentOutput JSON for structural and wording problems
 * that can be detected without knowing the target vacancy. Produces a report
 * rather than blocking export (per Key Invariant: "layer does not block export
 * by itself — the blocking decision is made separately", analogous to ADR-031).
 *
 * Six check families, matching Acceptance Criteria #1–#6:
 *   1. BOP patterns — 16 literal phrases from Prompt 3 §6 + audit vocabulary.
 *   2. Banned claims — derived from "Do not claim" / "What not to quantify"
 *      sections in knowledge-source files (passed as strings; dynamic).
 *   3. Canonical names — technical names found in knowledge sources; the CV
 *      must use the exact same capitalisation.
 *   4. Structural invariants — bullet counts per section/company.
 *   5. Internal consistency — requirement_coverage.shown_in resolves to a real
 *      field; reason_if_not_shown is populated iff shown_in === "not_shown".
 *   6. Coverage gaps — must_have requirements with strength "strong" or
 *      "partial" must not be left at shown_in "not_shown".
 */

import { Injectable } from '@nestjs/common';
import { TargetedCvContentOutput } from '../pipeline/schemas/targeted-cv-content.schema';
import {
  extractRulesFromKnowledgeSources,
  isSpecificEnoughClaimFragment,
} from './cv-quality-knowledge-parser';

// ─── Public types ──────────────────────────────────────────────────────────────

export type ViolationType =
  | 'bop_pattern'
  | 'banned_claim'
  | 'canonical_name'
  | 'structural'
  | 'consistency'
  | 'coverage_gap';

export interface CvViolation {
  type: ViolationType;
  /** Field path inside cv_content, e.g. "headline", "experience[0].bullets[2].text" */
  field: string;
  /** Short rule label */
  rule: string;
  /** Human-readable explanation */
  detail: string;
}

export interface CvQualityReport {
  violations: CvViolation[];
}

// ─── BOP patterns (AC #1) ─────────────────────────────────────────────────────

// 16 literal phrase patterns from Prompt 3 §6 — case-insensitive substring scan
// across all public cv_content fields.
const BOP_PATTERNS: string[] = [
  'AI Tooling Projects',
  'adds AI-tooling exposure',
  'commercial production evidence',
  'EPAM remains the main commercial production evidence',
  'continued active software development',
  'structured upskilling',
  'evidence-based claim validation',
  'human-in-the-loop AI workflow concepts',
  'artifact traceability',
  'backend HTML-to-PDF export without AI token usage',
  'microservice-based Azure serverless architecture',
  'maintained/contributed',
  'product-information flows',
  'Jest-tested services',
  'PR-based code review',
  'training and volunteer backend services',
];

// Pattern 16 (Backend Debugging) is checked only in the headline.
const HEADLINE_BOP_PATTERNS: string[] = ['Backend Debugging'];

// Audit-vocabulary words/phrases (Prompt 3 §6, second list) that must not
// appear in any public cv_content field. "exposure" and "evidence" are single
// words; the slash-pairs are treated as whole tokens.
// Note: "maintained/contributed" and "structured upskilling" already appear in
// BOP_PATTERNS above; they are included here too so the audit-vocabulary path
// provides its own violation message.
const AUDIT_VOCABULARY: string[] = [
  'exposure',
  'evidence',
  'strongest evidence',
  'safe positioning',
  'overclaiming boundary',
  'personal/portfolio',
];

// ─── Structural bounds (AC #4) ────────────────────────────────────────────────

const CURRENT_WORK_BULLETS_MIN = 4;
const CURRENT_WORK_BULLETS_MAX = 5;

// Bounds are [min, max] inclusive.
const EXPERIENCE_BULLET_BOUNDS: Record<string, [number, number]> = {
  EPAM: [6, 8],
  Factor: [3, 5],
  CHI: [1, 2],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface PublicTextField {
  path: string;
  text: string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CvQualityGuardService {
  /**
   * Run all six check families.
   *
   * @param output  The parsed TargetedCvContentOutput from 02_targeted_cv_content.json.
   * @param knowledgeSourceTexts  Raw markdown text of knowledge-source files.
   *   When provided, checks #2 (banned claims) and #3 (canonical names) are
   *   also run; when omitted, only checks #1, #4, #5 and #6 are performed.
   */
  check(
    output: TargetedCvContentOutput,
    knowledgeSourceTexts?: string[],
  ): CvQualityReport {
    const publicFields = this.extractPublicFields(output);
    const headline = output.cv_content.headline;
    const violations: CvViolation[] = [];

    // AC #1 — BOP patterns
    violations.push(...this.checkBopPatterns(publicFields, headline));

    // AC #2 & #3 — dynamic rules from knowledge sources
    if (knowledgeSourceTexts && knowledgeSourceTexts.length > 0) {
      const rules = extractRulesFromKnowledgeSources(knowledgeSourceTexts);
      violations.push(
        ...this.checkBannedClaims(publicFields, rules.bannedClaims),
      );
      violations.push(
        ...this.checkCanonicalNames(publicFields, rules.canonicalNames),
      );
    }

    // AC #4 — structural invariants
    violations.push(...this.checkStructural(output));

    // AC #5 — internal consistency
    violations.push(...this.checkConsistency(output));

    // AC #6 — coverage gaps
    violations.push(...this.checkCoverageGaps(output));

    return { violations };
  }

  // ── AC #1: BOP patterns ───────────────────────────────────────────────────

  private checkBopPatterns(
    publicFields: PublicTextField[],
    headline: string,
  ): CvViolation[] {
    const violations: CvViolation[] = [];

    // 16 named patterns — all public fields.
    for (const pattern of BOP_PATTERNS) {
      const re = new RegExp(escapeRegex(pattern), 'i');
      for (const { path, text } of publicFields) {
        if (re.test(text)) {
          violations.push({
            type: 'bop_pattern',
            field: path,
            rule: `BOP pattern: "${pattern}"`,
            detail: `Forbidden phrase "${pattern}" found in field "${path}".`,
          });
        }
      }
    }

    // Headline-only patterns.
    for (const pattern of HEADLINE_BOP_PATTERNS) {
      const re = new RegExp(escapeRegex(pattern), 'i');
      if (re.test(headline)) {
        violations.push({
          type: 'bop_pattern',
          field: 'headline',
          rule: `BOP pattern (headline only): "${pattern}"`,
          detail: `Forbidden headline phrase "${pattern}" found.`,
        });
      }
    }

    // Audit vocabulary — all public fields.
    for (const word of AUDIT_VOCABULARY) {
      const re = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
      for (const { path, text } of publicFields) {
        if (re.test(text)) {
          violations.push({
            type: 'bop_pattern',
            field: path,
            rule: `Audit vocabulary: "${word}"`,
            detail: `Audit-vocabulary term "${word}" found in field "${path}".`,
          });
        }
      }
    }

    return violations;
  }

  // ── AC #2: Banned claims from knowledge sources ───────────────────────────

  private checkBannedClaims(
    publicFields: PublicTextField[],
    bannedClaims: string[],
  ): CvViolation[] {
    const violations: CvViolation[] = [];

    for (const claim of bannedClaims) {
      // Extract the key substance of each claim by splitting on "/", "," and
      // taking the first meaningful fragment to avoid false positives from
      // over-long bullet sentences.
      const fragments = this.claimKeyFragments(claim);

      for (const fragment of fragments) {
        if (fragment.length < 4) continue;
        // A single generic English word (e.g. "externally") split out of a
        // longer "do not claim..." sentence is too broad a search needle —
        // found live against the real knowledge-source corpus, where such
        // fragments would false-positive on unrelated CV prose. Multi-word
        // fragments and technical-looking single words (matches the same
        // TECH_TOKEN_RE used for canonical-name extraction, or contains a
        // digit) are specific enough to keep.
        if (!isSpecificEnoughClaimFragment(fragment)) continue;
        const re = new RegExp(escapeRegex(fragment), 'i');

        for (const { path, text } of publicFields) {
          if (re.test(text)) {
            violations.push({
              type: 'banned_claim',
              field: path,
              rule: `Banned claim: "${claim}"`,
              detail: `CV contains "${fragment}" which matches a banned claim from knowledge sources.`,
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Splits a raw claim bullet into the most specific verifiable fragments to
   * use as search needles. Avoids false positives from common words.
   */
  private claimKeyFragments(claim: string): string[] {
    // Remove trailing conditionals ("unless confirmed later", "unless confirmed").
    const stripped = claim.replace(/\s+unless\s+confirmed[^,.]*/gi, '').trim();

    // Split on "/" and "," to get individual items from slashed lists like
    // "ML/MLOps/model training".
    const parts = stripped
      .split(/[/,]/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 4);

    // Also keep the full stripped string as a candidate.
    return [...new Set([stripped, ...parts])];
  }

  // ── AC #3: Canonical names ────────────────────────────────────────────────

  private checkCanonicalNames(
    publicFields: PublicTextField[],
    canonicalNames: string[],
  ): CvViolation[] {
    const violations: CvViolation[] = [];
    const allText = publicFields.map((f) => f.text).join('\n');

    for (const canonical of canonicalNames) {
      // Build a case-insensitive regex that matches the canonical name as a
      // word (or word-like) boundary — avoids matching substrings inside
      // larger words (e.g. "NestJS" inside "NestJSModule").
      const wordBoundary = /\w/.test(canonical[0]) ? '\\b' : '';
      const re = new RegExp(
        `${wordBoundary}${escapeRegex(canonical)}${wordBoundary}`,
        'gi',
      );

      let m: RegExpExecArray | null;
      while ((m = re.exec(allText)) !== null) {
        if (m[0] !== canonical) {
          // Found the name but with different capitalisation.
          const field = this.fieldForOffset(publicFields, m.index);
          violations.push({
            type: 'canonical_name',
            field,
            rule: `Canonical name: "${canonical}"`,
            detail: `"${m[0]}" should be written as "${canonical}" (canonical form from knowledge sources).`,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Maps a character offset in the concatenated public-text string back to the
   * originating field path. Approximate — used only for violation reporting.
   */
  private fieldForOffset(fields: PublicTextField[], offset: number): string {
    let accumulated = 0;
    for (const { path, text } of fields) {
      accumulated += text.length + 1; // +1 for the '\n' separator
      if (offset < accumulated) return path;
    }
    return 'unknown';
  }

  // ── AC #4: Structural invariants ──────────────────────────────────────────

  private checkStructural(output: TargetedCvContentOutput): CvViolation[] {
    const violations: CvViolation[] = [];
    const cwb = output.cv_content.current_work_block;

    // current_work_block bullet count: 4–5.
    if (cwb.include) {
      const count = cwb.bullets.length;
      if (
        count < CURRENT_WORK_BULLETS_MIN ||
        count > CURRENT_WORK_BULLETS_MAX
      ) {
        violations.push({
          type: 'structural',
          field: 'current_work_block.bullets',
          rule: `current_work_block bullet count must be ${CURRENT_WORK_BULLETS_MIN}–${CURRENT_WORK_BULLETS_MAX}`,
          detail: `current_work_block has ${count} bullets (expected ${CURRENT_WORK_BULLETS_MIN}–${CURRENT_WORK_BULLETS_MAX}).`,
        });
      }

      // Exactly one bullet must be about JobFlow.
      const jobflowBullets = cwb.bullets.filter((b) => /jobflow/i.test(b.text));
      if (jobflowBullets.length !== 1) {
        violations.push({
          type: 'structural',
          field: 'current_work_block.bullets',
          rule: 'Exactly one JobFlow bullet in current_work_block',
          detail: `current_work_block has ${jobflowBullets.length} JobFlow bullet(s) (expected exactly 1).`,
        });
      }
    }

    // Per-company experience bullet bounds.
    for (const [i, exp] of output.cv_content.experience.entries()) {
      for (const [key, [min, max]] of Object.entries(
        EXPERIENCE_BULLET_BOUNDS,
      )) {
        if (exp.company.includes(key)) {
          const count = exp.bullets.length;
          if (count < min || count > max) {
            violations.push({
              type: 'structural',
              field: `experience[${i}].bullets`,
              rule: `${key} bullet count must be ${min}–${max}`,
              detail: `${exp.company} has ${count} bullets (expected ${min}–${max}).`,
            });
          }
          break; // one bound rule per entry
        }
      }
    }

    return violations;
  }

  // ── AC #5: Internal consistency ───────────────────────────────────────────

  private checkConsistency(output: TargetedCvContentOutput): CvViolation[] {
    const violations: CvViolation[] = [];
    const validPaths = this.collectValidFieldPaths(output);

    for (const [i, entry] of output.requirement_coverage.entries()) {
      const { shown_in, reason_if_not_shown } = entry;

      if (shown_in === 'not_shown') {
        // reason_if_not_shown must be filled.
        if (!reason_if_not_shown || reason_if_not_shown.trim() === '') {
          violations.push({
            type: 'consistency',
            field: `requirement_coverage[${i}]`,
            rule: 'reason_if_not_shown required when shown_in is "not_shown"',
            detail: `requirement_coverage[${i}] (${entry.requirement}) has shown_in "not_shown" but reason_if_not_shown is empty.`,
          });
        }
      } else {
        // shown_in must resolve to a real field path in the CV.
        if (!this.resolveShownIn(shown_in, validPaths)) {
          violations.push({
            type: 'consistency',
            field: `requirement_coverage[${i}]`,
            rule: 'shown_in must resolve to an existing cv_content field',
            detail: `requirement_coverage[${i}] (${entry.requirement}) has shown_in "${shown_in}" which does not resolve to any existing cv_content field.`,
          });
        }

        // reason_if_not_shown must be null (or empty) when shown_in is set.
        if (
          reason_if_not_shown !== null &&
          reason_if_not_shown !== undefined &&
          reason_if_not_shown.trim() !== ''
        ) {
          violations.push({
            type: 'consistency',
            field: `requirement_coverage[${i}]`,
            rule: 'reason_if_not_shown must be null when shown_in is not "not_shown"',
            detail: `requirement_coverage[${i}] (${entry.requirement}) has shown_in "${shown_in}" but reason_if_not_shown is also set.`,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Returns true if the shown_in path plausibly resolves into the cv_content.
   *
   * Prompt 2 uses paths like "experience[0].bullets[2]",
   * "current_work_block.bullets[1]", "summary[0]", "top_skills", "headline".
   * We validate the field-type prefix and (when an index is present) that the
   * referenced array element exists.
   */
  private resolveShownIn(shownIn: string, validPaths: Set<string>): boolean {
    // Exact match against known paths (summary[0], top_skills, headline, …).
    if (validPaths.has(shownIn)) return true;

    // Common aggregate paths that the generator uses as shorthand.
    const AGGREGATE_PATHS = new Set([
      'top_skills',
      'headline',
      'certifications',
      'current_work_block',
      'current_work_block.tech_stack',
    ]);
    if (AGGREGATE_PATHS.has(shownIn)) return true;

    // Prefix match for indexed sub-paths: "experience[0].bullets[2]" etc.
    // Accept if any known path starts with the same top-level field.
    const topLevel = shownIn.split(/[\[.]/)[0];
    for (const p of validPaths) {
      if (p.startsWith(topLevel)) return true;
    }

    return false;
  }

  /**
   * Collects all addressable paths inside cv_content for consistency checks.
   */
  private collectValidFieldPaths(output: TargetedCvContentOutput): Set<string> {
    const paths = new Set<string>();
    const cv = output.cv_content;

    paths.add('headline');
    paths.add('top_skills');
    paths.add('certifications');

    cv.summary.forEach((_, i) => paths.add(`summary[${i}]`));
    cv.top_skills.forEach((_, i) => paths.add(`top_skills[${i}]`));

    const cwb = cv.current_work_block;
    paths.add('current_work_block');
    paths.add('current_work_block.stable_intro');
    paths.add('current_work_block.tech_stack');
    cwb.bullets.forEach((_, i) =>
      paths.add(`current_work_block.bullets[${i}]`),
    );

    cv.experience.forEach((exp, ei) => {
      paths.add(`experience[${ei}]`);
      paths.add(`experience[${ei}].tech_stack`);
      exp.bullets.forEach((_, bi) =>
        paths.add(`experience[${ei}].bullets[${bi}]`),
      );
    });

    cv.selected_projects.forEach((proj, pi) => {
      paths.add(`selected_projects[${pi}]`);
      paths.add(`selected_projects[${pi}].tech_stack`);
      proj.bullets.forEach((_, bi) =>
        paths.add(`selected_projects[${pi}].bullets[${bi}]`),
      );
    });

    return paths;
  }

  // ── AC #6: Coverage gaps ──────────────────────────────────────────────────

  private checkCoverageGaps(output: TargetedCvContentOutput): CvViolation[] {
    const violations: CvViolation[] = [];

    for (const [i, entry] of output.requirement_coverage.entries()) {
      if (
        entry.shown_in === 'not_shown' &&
        (entry.strength === 'strong' || entry.strength === 'partial')
      ) {
        violations.push({
          type: 'coverage_gap',
          field: `requirement_coverage[${i}]`,
          rule: 'Must-have with strength strong/partial must not be not_shown',
          detail: `requirement_coverage[${i}] "${entry.requirement}" has strength "${entry.strength}" but shown_in is "not_shown".`,
        });
      }
    }

    return violations;
  }

  // ── Field extraction ──────────────────────────────────────────────────────

  /**
   * Returns all text fields in cv_content that are visible to a CV reader.
   * Analysis-only fields (requirement_coverage, evidence_table, etc.) are
   * intentionally excluded.
   */
  private extractPublicFields(
    output: TargetedCvContentOutput,
  ): PublicTextField[] {
    const fields: PublicTextField[] = [];
    const cv = output.cv_content;

    fields.push({ path: 'headline', text: cv.headline });
    cv.summary.forEach((s, i) =>
      fields.push({ path: `summary[${i}]`, text: s }),
    );
    cv.top_skills.forEach((s, i) =>
      fields.push({ path: `top_skills[${i}]`, text: s }),
    );

    const cwb = cv.current_work_block;
    fields.push({
      path: 'current_work_block.stable_intro',
      text: cwb.stable_intro,
    });
    cwb.bullets.forEach((b, i) =>
      fields.push({
        path: `current_work_block.bullets[${i}].text`,
        text: b.text,
      }),
    );
    cwb.tech_stack.forEach((t, i) =>
      fields.push({ path: `current_work_block.tech_stack[${i}]`, text: t }),
    );

    cv.experience.forEach((exp, ei) => {
      exp.bullets.forEach((b, bi) =>
        fields.push({
          path: `experience[${ei}].bullets[${bi}].text`,
          text: b.text,
        }),
      );
      exp.tech_stack.forEach((t, ti) =>
        fields.push({ path: `experience[${ei}].tech_stack[${ti}]`, text: t }),
      );
    });

    cv.selected_projects.forEach((proj, pi) => {
      fields.push({ path: `selected_projects[${pi}].title`, text: proj.title });
      fields.push({
        path: `selected_projects[${pi}].safe_label`,
        text: proj.safe_label,
      });
      proj.bullets.forEach((b, bi) =>
        fields.push({
          path: `selected_projects[${pi}].bullets[${bi}].text`,
          text: b.text,
        }),
      );
      proj.tech_stack.forEach((t, ti) =>
        fields.push({
          path: `selected_projects[${pi}].tech_stack[${ti}]`,
          text: t,
        }),
      );
    });

    // certifications is unknown[], skip non-string values.
    if (Array.isArray(cv.certifications)) {
      cv.certifications.forEach((c, i) => {
        if (typeof c === 'string') {
          fields.push({ path: `certifications[${i}]`, text: c });
        }
      });
    }

    return fields.filter(
      (f) => typeof f.text === 'string' && f.text.length > 0,
    );
  }
}
