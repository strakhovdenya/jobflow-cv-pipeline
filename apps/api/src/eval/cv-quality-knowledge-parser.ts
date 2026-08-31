/**
 * Parses knowledge-source markdown files to extract two kinds of rules
 * used by CvQualityGuardService:
 *
 *   - bannedClaims: bullet points from "Do not claim", "What not to quantify",
 *     "What not to overclaim" sections — things the CV must never say.
 *   - canonicalNames: backtick-wrapped technical names — the exact, canonical
 *     spelling the CV must use when it mentions a technology.
 *
 * Both lists are built at runtime from the knowledge-source files, so editing
 * those files automatically changes the guard's behavior (Key Invariant,
 * ISSUE-282).
 */

export interface ExtractedRules {
  bannedClaims: string[];
  canonicalNames: string[];
}

// Section-title patterns that introduce banned-claim bullet lists.
const BANNED_SECTION_RE =
  /^(?:do not claim|what not to(?: quantify| overclaim| claim)?|unsafe(?:\s*\/\s*do not claim)?)[:\s]*$/i;

// Inline "do not claim X" pattern — catches sentences like
// "Redis/BullMQ queue migration is a future design target only; do not claim
//  implemented Redis/BullMQ unless confirmed later."
const INLINE_DO_NOT_CLAIM_RE = /do not claim\s+([^.;\n]{3,})/gi;

// A backtick-wrapped token that looks like a proper technical name:
//   - contains at least one uppercase letter (to skip lowercase words)
//   - length ≥ 3
//   - no spaces (single token, not a phrase)
//   - not a pure number
const BACKTICK_TECH_NAME_RE = /`([A-Za-z][^\s`]{2,})`/g;

/**
 * Extracts banned claim strings from a single knowledge-source markdown text.
 *
 * Strategy:
 *   1. Detect section headers whose title matches BANNED_SECTION_RE and collect
 *      the bullet items that follow.
 *   2. Additionally match inline "do not claim X" phrases anywhere in the text.
 */
export function extractBannedClaimsFromText(text: string): string[] {
  const claims = new Set<string>();
  const lines = text.split('\n');
  let inBannedSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Strip leading markdown heading markers (e.g. "### 23." → "")
    const sectionTitle = trimmed.replace(/^#+\s*(?:\d+\.?\s+)?/, '');

    // Detect section header (may be a markdown heading or plain text line).
    if (BANNED_SECTION_RE.test(sectionTitle)) {
      inBannedSection = true;
      continue;
    }

    if (inBannedSection) {
      if (/^[-*]\s+/.test(trimmed)) {
        // A bullet point inside the banned section.
        const claim = trimmed.replace(/^[-*]\s+/, '').trim();
        if (claim.length >= 3) {
          claims.add(claim);
        }
      } else if (trimmed === '') {
        // Blank line inside a section — keep scanning.
      } else if (/^#+\s/.test(trimmed) || /^\|/.test(trimmed)) {
        // New heading or table — leave the section.
        inBannedSection = false;
      } else {
        // Non-bullet, non-blank, non-header content terminates the section.
        inBannedSection = false;
      }
    }

    // Inline pattern (checked on every line regardless of section).
    let m: RegExpExecArray | null;
    const re = new RegExp(INLINE_DO_NOT_CLAIM_RE.source, 'gi');
    while ((m = re.exec(trimmed)) !== null) {
      const claim = m[1]
        .trim()
        .replace(/\s+unless.*$/i, '')
        .trim();
      if (claim.length >= 3) {
        claims.add(claim);
      }
    }
  }

  return Array.from(claims);
}

/**
 * Extracts canonical technical names from a single knowledge-source markdown
 * text. A name is "canonical" when it appears wrapped in backticks, starts
 * with an upper- or mixed-case letter, is at least 3 chars, and contains no
 * spaces — matching the convention used throughout the tech-stack matrix and
 * career-case files.
 */
export function extractCanonicalNamesFromText(text: string): string[] {
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(BACKTICK_TECH_NAME_RE.source, 'g');

  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    // At least one uppercase letter (excluding pure-number tokens like `v2`).
    if (/[A-Z]/.test(name) && !/^\d/.test(name)) {
      names.add(name);
    }
  }

  return Array.from(names);
}

/**
 * Merges results from multiple knowledge-source texts into a single
 * ExtractedRules object.
 */
export function extractRulesFromKnowledgeSources(
  texts: string[],
): ExtractedRules {
  const allClaims = new Set<string>();
  const allNames = new Set<string>();

  for (const text of texts) {
    for (const c of extractBannedClaimsFromText(text)) {
      allClaims.add(c);
    }
    for (const n of extractCanonicalNamesFromText(text)) {
      allNames.add(n);
    }
  }

  return {
    bannedClaims: Array.from(allClaims),
    canonicalNames: Array.from(allNames),
  };
}
