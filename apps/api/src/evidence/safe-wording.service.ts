import { Injectable } from '@nestjs/common';
import { EvidenceItem } from '@prisma/client';

export interface SafeWordingSuggestion {
  claim: string;
  category: string;
  suggestedWording: string;
}

@Injectable()
export class SafeWordingService {
  suggest(
    claim: string,
    evidenceItem: EvidenceItem | null,
  ): SafeWordingSuggestion {
    if (!evidenceItem) {
      return {
        claim,
        category: 'needs_evidence',
        suggestedWording: `"${claim}" has no matching evidence record — mark as needs evidence or remove until evidence is added.`,
      };
    }

    switch (evidenceItem.category) {
      case 'allowed':
        return {
          claim,
          category: evidenceItem.category,
          suggestedWording: `"${claim}" is supported by commercial evidence (${evidenceItem.claimArea}) — commercial production wording may be used as-is.`,
        };
      case 'risky':
        return {
          claim,
          category: evidenceItem.category,
          suggestedWording: `Rephrase "${claim}" as personal project / non-commercial experience with ${evidenceItem.claimArea} — do not present as commercial production experience.`,
        };
      case 'unsupported':
        return {
          claim,
          category: evidenceItem.category,
          suggestedWording: `Rephrase "${claim}" as basic exposure to ${evidenceItem.claimArea} — do not claim commercial or production experience without evidence.`,
        };
      default:
        return {
          claim,
          category: evidenceItem.category,
          suggestedWording: `"${claim}" has an unrecognized evidence category (${evidenceItem.category}) — mark as needs evidence until reviewed.`,
        };
    }
  }
}
