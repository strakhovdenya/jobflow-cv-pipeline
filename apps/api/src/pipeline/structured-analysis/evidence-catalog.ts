// The deterministic evidence catalog of ADR-046 item 7: item keys derived only from structure the
// pinned sources already have. A key is valid only together with the snapshot id recorded next to
// it. Pure: the caller passes the snapshot id, the career-case text and the parsed registries.

import {
  Credential,
  CredentialType,
  PortfolioProject,
  normalizeRegistryName,
} from '../../evidence/career-registry.parser';

export const EVIDENCE_KINDS = ['project', 'credential', 'case'] as const;
export const EVIDENCE_PROVENANCES = [
  'commercial',
  'personal',
  'training',
  'manual_note',
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
export type EvidenceProvenance = (typeof EVIDENCE_PROVENANCES)[number];

// Grammar `<kind>:<container id>[#<item key>]` (contract version 1). Manual-note items use the
// separate kind `manual_note` and are never catalog entries (ADR-034, INV-5).
const REFERENCE =
  /^(project|credential|case):([a-z0-9]+(?:-[a-z0-9]+)*)(?:#([a-z0-9]+(?:-[a-z0-9]+)*))?$/;
export const MANUAL_NOTE_REFERENCE = /^manual_note:[A-Za-z0-9_-]+$/;

export interface EvidenceCatalogEntry {
  key: string;
  container: string;
  kind: EvidenceKind;
  // Fixed only where the source structure fixes it; null means the assessment judges it.
  provenance: 'personal' | 'training' | null;
  // May support a requirement at all.
  assessable: boolean;
  // May be named in a CV (the registry's `cvEligible`).
  displayable: boolean;
}

export interface EvidenceCatalog {
  snapshotId: string;
  entries: ReadonlyMap<string, EvidenceCatalogEntry>;
}

export interface EvidenceCatalogInput {
  snapshotId: string;
  careerCasesText: string;
  projects: readonly PortfolioProject[];
  credentials: readonly Credential[];
}

export interface ParsedReference {
  kind: EvidenceKind;
  container: string;
  item: string | null;
}

export type ReferenceResolution =
  | { resolved: true; entry: EvidenceCatalogEntry }
  | { resolved: false; reason: string };

interface CareerCase {
  number: string;
  title: string;
  lines: string[];
}

const CASE_HEADING = /^# Case (P?\d+) [—–-] (.+)$/u;
const TOP_HEADING = /^# /u;
const VERIFIED_FACTS_HEADING = /^## Verified facts\b/u;
const SUB_HEADING = /^## /u;
const NUMBERED_SECTION = /^## (\d+)\. /u;
const TABLE_ROW = /^\|/u;
const TABLE_SEPARATOR = /^\|[\s:|-]+\|?\s*$/u;
const TRAILING_PARENTHESIS = /\s*\([^)]*\)\s*$/u;

// Credentials that support nothing even when completed (`prompt1_v13.txt` line 73).
const UNSUPPORTING_CREDENTIAL_TYPES: readonly CredentialType[] = [
  'learning_path',
  'assessment',
];

export const parseEvidenceReference = (ref: string): ParsedReference | null => {
  const match = REFERENCE.exec(ref);
  if (!match) return null;
  return {
    kind: match[1] as EvidenceKind,
    container: match[2],
    item: match[3] ?? null,
  };
};

const entryKey = (
  kind: EvidenceKind,
  container: string,
  item: string | null,
) => (item === null ? `${kind}:${container}` : `${kind}:${container}#${item}`);

const splitCareerCases = (text: string): CareerCase[] => {
  const cases: CareerCase[] = [];
  let current: CareerCase | null = null;
  for (const line of text.split(/\r?\n/u)) {
    if (TOP_HEADING.test(line)) {
      const heading = CASE_HEADING.exec(line);
      current = heading
        ? { number: heading[1], title: heading[2], lines: [] }
        : null;
      if (current) cases.push(current);
      continue;
    }
    if (current) current.lines.push(line);
  }
  return cases;
};

// Data rows of the first "Verified facts" table of a case: header and separator excluded.
const verifiedFactRowCount = (lines: readonly string[]): number => {
  const start = lines.findIndex((line) => VERIFIED_FACTS_HEADING.test(line));
  if (start === -1) return 0;
  const tableRows: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (TABLE_ROW.test(trimmed)) {
      tableRows.push(trimmed);
      continue;
    }
    if (tableRows.length > 0 || SUB_HEADING.test(line)) break;
  }
  const rows = tableRows.filter((row) => !TABLE_SEPARATOR.test(row));
  return Math.max(0, rows.length - 1);
};

const numberedSections = (lines: readonly string[]): string[] =>
  lines
    .map((line) => NUMBERED_SECTION.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => match[1]);

const findProject = (
  projects: readonly PortfolioProject[],
  caseTitle: string,
): PortfolioProject | null => {
  const title = normalizeRegistryName(
    caseTitle.replace(TRAILING_PARENTHESIS, ''),
  );
  const matches = (name: string) => normalizeRegistryName(name) === title;
  return (
    projects.find(
      (project) => matches(project.title) || project.aliases.some(matches),
    ) ?? null
  );
};

// Whatever `cvEligible` says, an in-progress item, a learning path and an assessment support
// nothing; the registry parser rejects such an eligible entry, the catalog does not rely on it.
const isCredentialAssessable = (credential: Credential): boolean =>
  credential.status !== 'in_progress' &&
  !UNSUPPORTING_CREDENTIAL_TYPES.includes(credential.type);

export const buildEvidenceCatalog = (
  input: EvidenceCatalogInput,
): EvidenceCatalog => {
  const entries = new Map<string, EvidenceCatalogEntry>();
  const add = (entry: EvidenceCatalogEntry) => {
    if (!entries.has(entry.key)) entries.set(entry.key, entry);
  };
  const projectEntry = (
    project: PortfolioProject,
    item: string | null,
  ): EvidenceCatalogEntry => ({
    key: entryKey('project', project.id, item),
    container: entryKey('project', project.id, null),
    kind: 'project',
    provenance: 'personal',
    assessable: project.cvEligible,
    displayable: project.cvEligible,
  });

  for (const project of input.projects) {
    add(projectEntry(project, null));
    for (const [index] of project.allowedWording.entries()) {
      add(projectEntry(project, `wording-${index + 1}`));
    }
  }

  for (const credential of input.credentials) {
    const key = entryKey('credential', credential.id, null);
    add({
      key,
      container: key,
      kind: 'credential',
      provenance: 'training',
      assessable: isCredentialAssessable(credential),
      displayable: credential.cvEligible && isCredentialAssessable(credential),
    });
  }

  const factCounts = new Map<string, number>();
  for (const careerCase of splitCareerCases(input.careerCasesText)) {
    const project = findProject(input.projects, careerCase.title);
    if (project) {
      const offset = factCounts.get(project.id) ?? 0;
      const rows = verifiedFactRowCount(careerCase.lines);
      for (let row = 1; row <= rows; row++) {
        add(projectEntry(project, `fact-${offset + row}`));
      }
      factCounts.set(project.id, offset + rows);
      continue;
    }
    // A portfolio case outside the registry is not evidence (`prompt1_v13.txt` line 73).
    if (careerCase.number.startsWith('P')) continue;
    const container = entryKey('case', careerCase.number, null);
    const caseEntry = (item: string | null): EvidenceCatalogEntry => ({
      key: entryKey('case', careerCase.number, item),
      container,
      kind: 'case',
      provenance: null,
      assessable: true,
      displayable: true,
    });
    add(caseEntry(null));
    for (const section of numberedSections(careerCase.lines)) {
      add(caseEntry(`section-${section}`));
    }
  }

  return { snapshotId: input.snapshotId, entries };
};

export const resolveEvidenceReference = (
  catalog: EvidenceCatalog,
  ref: string,
  snapshotId: string | null | undefined,
): ReferenceResolution => {
  if (typeof snapshotId !== 'string' || snapshotId === '') {
    return { resolved: false, reason: `reference ${ref} has no snapshot id` };
  }
  if (snapshotId !== catalog.snapshotId) {
    return {
      resolved: false,
      reason: `reference ${ref} is recorded for snapshot ${snapshotId}, not ${catalog.snapshotId}`,
    };
  }
  const entry = catalog.entries.get(ref);
  if (!entry) {
    return {
      resolved: false,
      reason: `reference ${ref} does not resolve in snapshot ${catalog.snapshotId}`,
    };
  }
  return { resolved: true, entry };
};
