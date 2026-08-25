import { Injectable } from '@nestjs/common';
import { CandidateProfileConfig } from './candidate-profile.config';

export interface CandidateProfileGuardResult {
  passed: boolean;
  issues: string[];
}

interface PlaceholderPattern {
  regex: RegExp;
  label: string;
}

const PLACEHOLDER_PATTERNS: PlaceholderPattern[] = [
  { regex: /\bplaceholder\b/i, label: '"placeholder"' },
  { regex: /\btodo\b/i, label: '"TODO"' },
  { regex: /\bfixme\b/i, label: '"FIXME"' },
  { regex: /\btbd\b/i, label: '"TBD"' },
  { regex: /\bxxx\b/i, label: '"XXX"' },
  { regex: /\bsee\s+.*\bnotes?\b/i, label: '"see ... notes" reference' },
  { regex: /\binternal\s+note\b/i, label: '"internal note" reference' },
];

@Injectable()
export class CandidateProfileGuardService {
  check(profile: CandidateProfileConfig): CandidateProfileGuardResult {
    const texts = this.extractTexts(profile);
    const issues: string[] = [];

    for (const text of texts) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.regex.test(text)) {
          issues.push(
            `Placeholder marker (${pattern.label}) found in: "${text}"`,
          );
        }
      }
    }

    return { passed: issues.length === 0, issues };
  }

  private extractTexts(profile: CandidateProfileConfig): string[] {
    const texts: string[] = [];

    texts.push(profile.candidate.name);
    texts.push(profile.candidate.location);
    texts.push(profile.candidate.work_authorization);
    if (profile.candidate.contact.phone) {
      texts.push(profile.candidate.contact.phone);
    }
    if (profile.candidate.contact.email) {
      texts.push(profile.candidate.contact.email);
    }
    if (profile.candidate.contact.linkedin) {
      texts.push(profile.candidate.contact.linkedin);
    }
    if (profile.candidate.contact.github) {
      texts.push(profile.candidate.contact.github);
    }

    for (const item of profile.education) {
      texts.push(item.institution, item.degree, item.dates);
      if (item.notes) {
        texts.push(item.notes);
      }
    }

    for (const item of profile.languages) {
      texts.push(item.language, item.level);
      if (item.notes) {
        texts.push(item.notes);
      }
    }

    for (const item of profile.links) {
      texts.push(item.label, item.url);
    }

    for (const item of profile.volunteering) {
      texts.push(item.description);
      if (item.organization) {
        texts.push(item.organization);
      }
      if (item.role) {
        texts.push(item.role);
      }
      if (item.dates) {
        texts.push(item.dates);
      }
    }

    return texts.filter((t) => typeof t === 'string' && t.length > 0);
  }
}
