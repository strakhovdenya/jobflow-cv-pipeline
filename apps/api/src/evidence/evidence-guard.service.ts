import { Injectable } from '@nestjs/common';
import { EvidenceItem } from '@prisma/client';
import { TargetedCvContentOutput } from '../pipeline/schemas/targeted-cv-content.schema';

export interface EvidenceGuardResult {
  critical_issues: string[];
  warnings: string[];
  needs_evidence: string[];
}

interface CriticalPattern {
  regex: RegExp;
  message: string;
}

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
    regex:
      /production.{0,30}Claude\s+Code.{0,30}automat|Claude\s+Code.{0,30}production.{0,30}automat/i,
    message: 'Production Claude Code automation is not supported',
  },
  {
    regex:
      /agentic.{0,20}AI.{0,30}production|production.{0,30}agentic.{0,20}AI/i,
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

@Injectable()
export class EvidenceGuardService {
  checkOutput(
    output: TargetedCvContentOutput,
    evidenceItems: EvidenceItem[],
  ): EvidenceGuardResult {
    const texts = this.extractTexts(output);
    const critical_issues = this.matchCriticalPatterns(texts);
    const needs_evidence = this.collectNeedsEvidence(output, evidenceItems);

    return {
      critical_issues,
      warnings: [],
      needs_evidence,
    };
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
    const forcedSignals = this.collectForcedSignals(output);
    const allTechSkills = this.extractTechSkills(output);
    for (const skill of allTechSkills) {
      const hasSupport = evidenceItems.some(
        (item) =>
          item.claimArea.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(item.claimArea.toLowerCase()),
      );
      const isForced = forcedSignals.some((signal) =>
        this.containsWholeWord(signal, skill.toLowerCase()),
      );
      if (!hasSupport && !isForced) {
        result.add(skill);
      }
    }

    return Array.from(result);
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

  private extractTechSkills(output: TargetedCvContentOutput): string[] {
    const skills = new Set<string>();

    for (const skill of output.cv_content.top_skills) {
      skills.add(skill);
    }

    for (const exp of output.cv_content.experience) {
      for (const tech of exp.tech_stack) {
        skills.add(tech);
      }
    }

    for (const proj of output.cv_content.selected_projects) {
      for (const tech of proj.tech_stack) {
        skills.add(tech);
      }
    }

    return Array.from(skills);
  }
}
