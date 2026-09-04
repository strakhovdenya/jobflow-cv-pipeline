/**
 * Parses knowledge-source markdown files to extract two kinds of rules
 * used by CvQualityGuardService:
 *
 *   - bannedClaims: bullet points from "Do not claim", "What not to quantify",
 *     "What not to overclaim" sections — things the CV must never say.
 *   - canonicalNames: technical proper nouns that appear consistently across
 *     the knowledge base — the exact, canonical spelling the CV must use when
 *     it mentions that technology.
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

// Any letter-led word token, checked against looksTechnical() below rather
// than trying to enumerate every technical shape in the regex itself — an
// earlier version required either ALL-CAPS or a PascalCase internal case
// transition, which missed real mixed-case compounds like "MLOps" (all-caps
// prefix + lowercase suffix, matching neither shape).
const WORD_TOKEN_RE = /\b[A-Za-z][A-Za-z0-9]*\b/g;

/**
 * True when `token` has the shape of a technical proper noun rather than an
 * ordinary capitalized English word. A plain word like "Denis" or "Backend"
 * is one uppercase letter followed by only lowercase letters — the standard
 * shape of a name, a contact-field label, or a sentence-initial word. A
 * genuine technical term almost always breaks that shape: it is either
 * ALL-CAPS (GZIP), has a second internal uppercase (CommerceTools, NestJS),
 * a mixed case run (MLOps), or contains a digit.
 */
function looksTechnical(token: string): boolean {
  if (!/^[A-Z]/.test(token)) return false;
  return !/^[A-Z][a-z]*$/.test(token);
}

// Lines unlikely to contain genuine canonical technical names — filenames,
// template placeholders and contact-field labels. Filtered out before
// scanning for TECH_TOKEN_RE matches, rather than trying to exclude specific
// junk tokens after the fact (found live: without this, extraction against
// the real knowledge-source corpus pulled in filenames like
// "Master_CV_RU_v0_6_current_work_sync.md" and template placeholders like
// "SKIP_<Company>_<Role>_reason_RU.md" as "canonical names").
const NOISE_LINE_RE = /\.(?:md|txt|json|pdf)\b|[<>]/i;

/**
 * Minimum number of times a technical-looking token must appear across the
 * *entire* knowledge-source corpus (not just one file) before it is trusted
 * as a genuine canonical name rather than a one-off mention (a class name
 * referenced once in a prompt-design doc, an internal code identifier,
 * etc.). Found live: without this, `apps/api/knowledge-sources/prompts/`
 * mentioning an internal class name once was enough to produce a spurious
 * "canonical name" that would never legitimately appear in a CV.
 */
const MIN_CANONICAL_NAME_FREQUENCY = 3;

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
 * True when `fragment` is specific enough to safely use as a substring
 * search needle for a banned claim: either a multi-word phrase, or a
 * single word that itself looks like a technical term (matches
 * TECH_TOKEN_RE) or contains a digit. Filters out generic single English
 * words such as "externally" that split out of a longer "do not claim..."
 * sentence and would otherwise false-positive on unrelated CV text.
 * Exported for CvQualityGuardService's own claim-fragment splitting
 * (checkBannedClaims) to apply — kept here since it uses the same
 * TECH_TOKEN_RE definition as canonical-name extraction.
 */
export function isSpecificEnoughClaimFragment(fragment: string): boolean {
  if (/\s/.test(fragment)) return true;
  if (/\d/.test(fragment)) return true;
  return looksTechnical(fragment);
}

/**
 * Extracts canonical technical names from a single knowledge-source markdown
 * text: technical-looking tokens (looksTechnical()) found on lines that are
 * not filenames, template placeholders or contact-field labels (NOISE_LINE_RE).
 * Returns a deduplicated list of the raw casing(s) seen in this text — cross-
 * file frequency filtering and majority-casing resolution happen in
 * extractRulesFromKnowledgeSources, which is what CvQualityGuardService
 * actually calls.
 */
export function extractCanonicalNamesFromText(text: string): string[] {
  const names = new Set<string>();
  for (const name of iterateCanonicalNameOccurrences(text)) {
    names.add(name);
  }
  return Array.from(names);
}

/**
 * Yields every technical-looking token occurrence (not deduplicated) found
 * on non-noise lines of `text`, in original casing. Used both by
 * extractCanonicalNamesFromText (per-file, deduplicated) and
 * extractRulesFromKnowledgeSources (cross-file frequency counting).
 */
function* iterateCanonicalNameOccurrences(text: string): Generator<string> {
  for (const line of text.split('\n')) {
    if (NOISE_LINE_RE.test(line)) continue;
    const re = new RegExp(WORD_TOKEN_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      if (looksTechnical(m[0])) yield m[0];
    }
  }
}

/**
 * Merges results from multiple knowledge-source texts into a single
 * ExtractedRules object.
 *
 * Canonical names are frequency-filtered and casing-resolved across the
 * whole corpus (see MIN_CANONICAL_NAME_FREQUENCY and iterateCanonicalNameOccurrences)
 * rather than per-file, since a one-off mention in a single file is not
 * reliable evidence of a real "canonical spelling" convention.
 */
export function extractRulesFromKnowledgeSources(
  texts: string[],
): ExtractedRules {
  const allClaims = new Set<string>();

  // lowercase key -> (casing variant -> occurrence count), aggregated across
  // every file in the corpus.
  const casingCounts = new Map<string, Map<string, number>>();

  for (const text of texts) {
    for (const c of extractBannedClaimsFromText(text)) {
      allClaims.add(c);
    }
    for (const name of iterateCanonicalNameOccurrences(text)) {
      const key = name.toLowerCase();
      const variants = casingCounts.get(key) ?? new Map<string, number>();
      variants.set(name, (variants.get(name) ?? 0) + 1);
      casingCounts.set(key, variants);
    }
  }

  const canonicalNames: string[] = [];
  for (const variants of casingCounts.values()) {
    const total = Array.from(variants.values()).reduce((a, b) => a + b, 0);
    if (total < MIN_CANONICAL_NAME_FREQUENCY) continue;

    let bestCasing = '';
    let bestCount = -1;
    for (const [casing, count] of variants) {
      if (count > bestCount) {
        bestCasing = casing;
        bestCount = count;
      }
    }
    canonicalNames.push(bestCasing);
  }

  return {
    bannedClaims: Array.from(allClaims),
    canonicalNames,
  };
}
