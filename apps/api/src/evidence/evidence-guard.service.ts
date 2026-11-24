import { Injectable } from '@nestjs/common';
import { EvidenceItem } from '@prisma/client';
import { TargetedCvContentOutput } from '../pipeline/schemas/targeted-cv-content.schema';
import {
  CareerRegistries,
  normalizeRegistryName,
} from './career-registry.parser';
import {
  RegistryField,
  RegistrySnapshot,
  buildRegistrySnapshot,
  findRegistryViolations,
  findUnregisteredInclusions,
  formatRegistryViolation,
  registryInputFromPrompt2,
} from './registry-compliance';

export interface EvidenceGuardResult {
  critical_issues: string[];
  warnings: string[];
  needs_evidence: string[];
  registry_violations: string[];
  registry_snapshot: RegistrySnapshot;
}

interface RegistryCheckResult {
  violations: string[];
  warnings: string[];
  snapshot: RegistrySnapshot;
}

interface CriticalPattern {
  regex: RegExp;
  message: string;
}

// "production-style" / "production-grade" describe a design standard, not
// production experience, so the AI patterns below do not read them as a claim.
const PRODUCTION_CLAIM =
  'production(?![\\s\\-\\u2013\\u2014_]?(?:style|grade))';

// "non-commercial" / "not commercial" is honest personal-project framing.
const COMMERCIAL_CLAIM =
  '(?<!\\bnon[\\s\\-\\u2013\\u2014]?)(?<!\\bnot\\s)commercial';

const AGENTIC_AI = 'agentic.{0,20}AI';

const CRITICAL_PATTERNS: CriticalPattern[] = [
  {
    regex:
      /commercial.{0,30}AI.{0,30}production|commercial.{0,30}RAG.{0,30}production/i,
    message:
      'Commercial AI/RAG production experience is not supported by evidence',
  },
  {
    regex: /commercial.{0,30}NestJS.{0,30}production/i,
    message: 'Commercial NestJS production experience is not supported',
  },
  {
    regex:
      /NestJS.{0,30}EPAM.{0,30}production|commercial.{0,30}NestJS.{0,30}EPAM/i,
    message: 'Commercial NestJS EPAM production stack claim is not supported',
  },
  {
    regex: /commercial.{0,30}(?:JobFlow|OpenAI).{0,30}production/i,
    message: 'Commercial JobFlow/OpenAI production experience is not supported',
  },
  {
    regex:
      /commercial.{0,30}MCP.{0,30}production|MCP.{0,30}production.{0,30}experience/i,
    message: 'Commercial MCP production experience is not supported',
  },
  {
    regex:
      /Docker.{0,30}production.{0,30}ownership|production.{0,30}ownership.{0,30}Docker/i,
    message: 'Docker production ownership is not supported by evidence',
  },
  {
    regex: /Kubernetes.{0,10}production|production.{0,10}Kubernetes/i,
    message: 'Kubernetes production experience is not supported',
  },
  {
    regex: /AWS.{0,30}production|production.{0,30}AWS/i,
    message: 'AWS production experience is not supported without evidence',
  },
  {
    regex: /Kafka.{0,30}production|production.{0,30}Kafka/i,
    message: 'Kafka production experience is not supported',
  },
  {
    regex: /\bAI[\s-]?Engineer\b/i,
    message: 'AI Engineer as a job title or role claim is not supported',
  },
  {
    regex: /LLM.{0,20}platform.{0,20}engineer/i,
    message: 'LLM platform engineer claim is not supported',
  },
  {
    regex: new RegExp(
      `${PRODUCTION_CLAIM}.{0,30}Claude\\s+Code.{0,30}automat|Claude\\s+Code.{0,30}${PRODUCTION_CLAIM}.{0,30}automat`,
      'i',
    ),
    message: 'Production Claude Code automation is not supported',
  },
  {
    regex: new RegExp(
      [
        `${AGENTIC_AI}.{0,30}${PRODUCTION_CLAIM}`,
        `${PRODUCTION_CLAIM}.{0,30}${AGENTIC_AI}`,
        `${COMMERCIAL_CLAIM}.{0,30}${AGENTIC_AI}`,
        `${AGENTIC_AI}.{0,30}${COMMERCIAL_CLAIM}`,
      ].join('|'),
      'i',
    ),
    message: 'Agentic AI production experience is not supported',
  },
  {
    regex: /fluent.{0,10}English|English.{0,10}fluent/i,
    message: 'Fluent English claim requires explicit evidence',
  },
  {
    regex: /professional.{0,10}German|German.{0,10}professional/i,
    message: 'Professional German claim requires explicit evidence',
  },
  {
    regex: /DynamoDB.{0,30}production|production.{0,30}DynamoDB/i,
    message: 'DynamoDB production experience is not supported without evidence',
  },
  {
    regex: /MySQL.{0,30}production|production.{0,30}MySQL/i,
    message: 'MySQL production experience is not supported without evidence',
  },
];

const MIN_NOTE_MATCH_LENGTH = 3;

@Injectable()
export class EvidenceGuardService {
  // Strips forced markers (ADR-034) that no workspace manual note backs, mutating `output` in
  // place so the artifacts written afterwards hold the sanitized result. Registry violations are
  // reported on their own and repeated in critical_issues so the review shows them.
  checkOutput(
    output: TargetedCvContentOutput,
    evidenceItems: EvidenceItem[],
    manualNotes: { text: string }[],
    registries: CareerRegistries,
  ): EvidenceGuardResult {
    const texts = this.extractTexts(output);
    const patternIssues = this.matchCriticalPatterns(texts);
    const unbackedClaims = this.stripUnbackedForcedMarkers(output, manualNotes);
    const needs_evidence = Array.from(
      new Set([
        ...this.collectNeedsEvidence(output, evidenceItems),
        ...unbackedClaims,
      ]),
    );
    const registry = this.checkRegistry(output, registries, manualNotes);

    return {
      critical_issues: [...patternIssues, ...registry.violations],
      warnings: registry.warnings,
      needs_evidence,
      registry_violations: registry.violations,
      registry_snapshot: registry.snapshot,
    };
  }

  // Runs after stripUnbackedForcedMarkers, so manual_note_forced_claims holds only claims that a
  // workspace manual note backs. An unregistered project or credential is accepted only when its
  // title occurs both in such a claim and in the text of a manual note itself: a model-written
  // claim alone never decides the exception. An entry the registry excludes is never accepted
  // (ADR-034 amendment of 2026-11-24).
  private checkRegistry(
    output: TargetedCvContentOutput,
    registries: CareerRegistries,
    manualNotes: { text: string }[],
  ): RegistryCheckResult {
    const input = registryInputFromPrompt2(output);
    const unregistered = findUnregisteredInclusions(
      input,
      buildRegistrySnapshot(registries),
    );
    const backedClaims = (output.manual_note_forced_claims ?? []).map((claim) =>
      normalizeRegistryName(claim.text),
    );
    const notes = manualNotes.map((note) => normalizeRegistryName(note.text));
    const isBacked = (field: RegistryField): boolean => {
      const title = normalizeRegistryName(field.text);
      const inClaim = backedClaims.some((claim) =>
        this.containsPhrase(claim, title),
      );
      const inNote = notes.some((note) => this.containsPhrase(note, title));
      return inClaim && inNote;
    };
    const acceptedProjects = unregistered.projects.filter(isBacked);
    const acceptedCredentials = unregistered.credentials.filter(isBacked);
    const snapshot = buildRegistrySnapshot(registries, {
      projects: acceptedProjects.map((field) => field.text),
      credentials: acceptedCredentials.map((field) => field.text),
    });
    const violations = Array.from(
      new Set(
        findRegistryViolations(input, snapshot).map(formatRegistryViolation),
      ),
    );
    const describeForced = (kind: string) => (field: RegistryField) =>
      `${field.fieldPath}: unregistered ${kind} ${JSON.stringify(field.text)} is included through a workspace manual note (user-forced, unverified)`;
    const warnings = [
      ...acceptedProjects.map(describeForced('project')),
      ...acceptedCredentials.map(describeForced('credential')),
    ];
    return { violations, warnings, snapshot };
  }

  private stripUnbackedForcedMarkers(
    output: TargetedCvContentOutput,
    manualNotes: { text: string }[],
  ): string[] {
    const notes = manualNotes.map((note) => this.normalizeForMatch(note.text));
    const isBacked = (claim: string) => this.matchesAnyNote(claim, notes);
    const unbacked: string[] = [];

    const blocks = [
      output.cv_content.current_work_block,
      ...output.cv_content.experience,
      ...output.cv_content.selected_projects,
    ];
    for (const block of blocks) {
      for (const bullet of block?.bullets ?? []) {
        if (bullet.user_forced === true && !isBacked(bullet.text)) {
          delete bullet.user_forced;
          unbacked.push(bullet.text);
        }
      }
    }

    for (const entry of output.evidence_table) {
      if (
        entry.status === 'user-forced, unverified' &&
        !isBacked(entry.claim)
      ) {
        entry.status = 'needs evidence';
      }
    }

    output.manual_note_forced_claims = (
      output.manual_note_forced_claims ?? []
    ).filter((claim) => isBacked(claim.text));

    return unbacked;
  }

  private matchesAnyNote(claim: string, normalizedNotes: string[]): boolean {
    const normalizedClaim = this.normalizeForMatch(claim);
    if (normalizedClaim.length === 0) {
      return false;
    }
    return normalizedNotes.some((note) =>
      this.containsAsWholePhrase(normalizedClaim, note),
    );
  }

  // The shorter of the two strings must occur in the longer one at word boundaries and be at
  // least MIN_NOTE_MATCH_LENGTH long, so a short note ("go") cannot back a claim through a
  // fragment of another word ("MongoDB"). Boundaries are Unicode-aware (Cyrillic notes).
  private containsAsWholePhrase(a: string, b: string): boolean {
    const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
    return this.containsPhrase(longer, shorter);
  }

  // `needle` occurs in `haystack` at word boundaries and is at least MIN_NOTE_MATCH_LENGTH long.
  private containsPhrase(haystack: string, needle: string): boolean {
    if (needle.length < MIN_NOTE_MATCH_LENGTH) {
      return false;
    }
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(
      `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,
      'u',
    ).test(haystack);
  }

  private normalizeForMatch(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private extractTexts(output: TargetedCvContentOutput): string[] {
    const texts: string[] = [];

    texts.push(output.target_strategy.positioning);
    texts.push(output.target_strategy.main_angle);
    texts.push(output.cv_content.headline);
    texts.push(...output.cv_content.summary);
    texts.push(...output.cv_content.top_skills);

    for (const exp of output.cv_content.experience) {
      for (const bullet of exp.bullets) {
        texts.push(bullet.text);
      }
      texts.push(...exp.tech_stack);
    }

    for (const proj of output.cv_content.selected_projects) {
      for (const bullet of proj.bullets) {
        texts.push(bullet.text);
      }
      texts.push(...proj.tech_stack);
    }

    return texts.filter((t) => typeof t === 'string' && t.length > 0);
  }

  private matchCriticalPatterns(texts: string[]): string[] {
    const joined = texts.join('\n');
    const found: string[] = [];

    for (const pattern of CRITICAL_PATTERNS) {
      if (pattern.regex.test(joined)) {
        found.push(pattern.message);
      }
    }

    return found;
  }

  private collectNeedsEvidence(
    output: TargetedCvContentOutput,
    evidenceItems: EvidenceItem[],
  ): string[] {
    const result = new Set<string>();

    // Source 1: evidence_table entries with status 'needs evidence'. A 'user-forced, unverified'
    // status (ADR-034) is deliberately excluded — it is a human override, not a gap to flag.
    for (const entry of output.evidence_table) {
      if (entry.status === 'needs evidence') {
        result.add(entry.claim);
      }
    }

    // Source 2: tech skills with no matching EvidenceItem.claimArea. A skill explicitly named in
    // a manual-note-forced claim (ADR-034) is treated as covered by that deliberate override, not
    // flagged as a gap — otherwise a forced tech_stack/top_skills entry would be silently
    // re-flagged here even though it was never meant to be evidence-checked.
    // An 'unsupported' EvidenceItem records that evidence is missing, so it never counts as support.
    const supportingItems = evidenceItems.filter(
      (item) => item.category !== 'unsupported',
    );
    const forcedSignals = this.collectForcedSignals(output);
    for (const skill of this.extractGlobalTechSkills(output)) {
      const hasSupport = supportingItems.some((item) =>
        this.matchesClaimArea(item, skill),
      );
      if (!hasSupport && !this.isForced(forcedSignals, skill)) {
        result.add(skill);
      }
    }

    // Source 3: experience[].tech_stack is checked per entry. An EvidenceItem with a non-empty
    // `employers` list confirms its technology only for those employers, so a name confirmed at
    // one employer is still flagged when it appears in another employer's entry.
    for (const exp of output.cv_content.experience) {
      const employer = this.normalizeEmployer(exp.company);
      for (const tech of exp.tech_stack) {
        const hasSupport = supportingItems.some(
          (item) =>
            this.matchesClaimArea(item, tech) &&
            this.coversEmployer(item, employer),
        );
        if (!hasSupport && !this.isForced(forcedSignals, tech)) {
          result.add(`${tech} (${exp.company})`);
        }
      }
    }

    return Array.from(result);
  }

  private matchesClaimArea(item: EvidenceItem, skill: string): boolean {
    const claimArea = item.claimArea.toLowerCase();
    const name = skill.toLowerCase();
    return claimArea.includes(name) || name.includes(claimArea);
  }

  private coversEmployer(item: EvidenceItem, employer: string): boolean {
    if (item.employers.length === 0) {
      return true;
    }
    return item.employers.some(
      (scoped) => this.normalizeEmployer(scoped) === employer,
    );
  }

  private normalizeEmployer(name: string): string {
    return name.trim().toLowerCase();
  }

  private isForced(forcedSignals: string[], skill: string): boolean {
    const name = skill.toLowerCase();
    return forcedSignals.some((signal) => this.containsWholeWord(signal, name));
  }

  // Lowercased free text (manual_note_forced_claims entries and 'user-forced, unverified'
  // evidence_table claims) a Source 2 skill is checked against to decide whether it was
  // deliberately forced in by the workspace's manual note (ADR-034), not just unsupported.
  private collectForcedSignals(output: TargetedCvContentOutput): string[] {
    const signals: string[] = [];

    for (const claim of output.manual_note_forced_claims ?? []) {
      signals.push(claim.text.toLowerCase());
    }

    for (const entry of output.evidence_table) {
      if (entry.status === 'user-forced, unverified') {
        signals.push(entry.claim.toLowerCase());
      }
    }

    return signals;
  }

  // Whole-word containment, not plain substring: a short skill name like "Go" or "R" must not
  // match merely because it occurs as a substring inside an unrelated word (e.g. "Go" inside
  // "MongoDB"), which would silently exempt an unforced, unsupported skill from needs_evidence.
  // Falls back to plain substring matching only when the needle has no word-boundary-safe edges
  // (e.g. starts/ends with a symbol like "C++" or ".NET"), preserving prior behavior there.
  private containsWholeWord(haystack: string, needle: string): boolean {
    if (needle.length === 0) {
      return false;
    }
    const isWordChar = (c: string) => /\w/.test(c);
    if (!isWordChar(needle[0]) || !isWordChar(needle[needle.length - 1])) {
      return haystack.includes(needle);
    }
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`).test(haystack);
  }

  // Tech names checked against claimArea for the whole CV; experience[].tech_stack is checked
  // per employer instead (Source 3 in collectNeedsEvidence).
  private extractGlobalTechSkills(output: TargetedCvContentOutput): string[] {
    const skills = new Set<string>();

    for (const skill of output.cv_content.top_skills) {
      skills.add(skill);
    }

    for (const proj of output.cv_content.selected_projects) {
      for (const tech of proj.tech_stack) {
        skills.add(tech);
      }
    }

    return Array.from(skills);
  }
}
