// Collapses repeated credentials in the content an export renders: each credential identity
// (the registry entry its name resolves to in the draft's snapshot, else its normalized name)
// keeps its first row, with that row's source_index, in the original order. Distinct
// credentials are never removed or added, and the stored draft is never touched. Called only
// by buildEffectiveCvContent, after the Prompt 3 corrections (ISSUE-709).
// Pure: content and snapshot in, new content out.
import type { CvContent } from '../pipeline/schemas/cv-content.schema';
import {
  RegistrySnapshot,
  credentialIdentity,
} from '../evidence/registry-compliance';

export function collapseRepeatedCredentials(
  content: CvContent,
  snapshot: RegistrySnapshot | null,
): CvContent {
  const seen = new Set<string>();
  const certifications = content.certifications.filter((certification) => {
    // A malformed name has no identity to share; the export gate reports it as it is.
    if (typeof certification.name !== 'string') return true;
    const identity = credentialIdentity(snapshot, certification.name);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
  if (certifications.length === content.certifications.length) return content;
  return { ...content, certifications };
}
