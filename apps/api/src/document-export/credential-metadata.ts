// Adds a certification's issuer, type label and year to the CV content from the registry snapshot
// the Prompt 2 guard stored in the draft (registry-snapshot/v2). The certification name stays the
// registry identity the export gate checked; nothing is read from knowledge sources (ADR-012).
// Pure: content and snapshot in, new content out.
import type {
  CvCertification,
  CvContent,
} from '../pipeline/schemas/cv-content.schema';
import {
  REGISTRY_SNAPSHOT_SCHEMA,
  RegistrySnapshot,
  RegistrySnapshotCredential,
  findSnapshotCredential,
} from '../evidence/registry-compliance';

// A course completion is printed without a type label.
const CREDENTIAL_KIND_LABELS = new Map<
  RegistrySnapshotCredential['type'],
  string
>([
  ['skill_badge', 'skill badge'],
  ['professional_certificate', 'professional certificate'],
]);

const ISSUE_YEAR_LENGTH = 4;

function describeCertification(
  certification: CvCertification,
  snapshot: RegistrySnapshot,
): CvCertification {
  const entry = findSnapshotCredential(snapshot, certification.name);
  if (entry === undefined || !entry.cvEligible) return certification;
  if (entry.issuer === undefined) return certification;
  const issued = entry.issued ?? null;
  return {
    ...certification,
    issuer: entry.issuer,
    kind: CREDENTIAL_KIND_LABELS.get(entry.type),
    date: issued === null ? undefined : issued.slice(0, ISSUE_YEAR_LENGTH),
  };
}

// Only certifications change, and only their issuer, kind and date. A v1 snapshot, a missing
// snapshot, or a name that resolves to no CV-eligible entry (e.g. a manual-note acceptedForced
// title) leaves the certification as it is.
export function applyCredentialMetadata(
  content: CvContent,
  snapshot: RegistrySnapshot | null,
): CvContent {
  if (snapshot === null || snapshot.schema !== REGISTRY_SNAPSHOT_SCHEMA) {
    return content;
  }
  const certifications = content.certifications.map((certification) =>
    describeCertification(certification, snapshot),
  );
  return { ...content, certifications };
}
