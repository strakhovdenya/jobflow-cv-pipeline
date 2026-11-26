// The single implementation of the career-registry rules (INV-7/8/9/15), shared by the Prompt 2
// EvidenceGuard (on the draft) and the export gate (on the corrected content the renderers get).
// Pure: data in, snapshot or violations out — no Nest, Prisma or fs (INV-1).
import type { CvContent } from '../pipeline/schemas/cv-content.schema';
import type { TargetedCvContentOutput } from '../pipeline/schemas/targeted-cv-content.schema';
import {
  CREDENTIAL_STATUSES,
  CREDENTIAL_TYPES,
  CareerRegistries,
  CredentialStatus,
  CredentialType,
  PROJECT_PLACEMENTS,
  PROJECT_STATUSES,
  ProjectPlacement,
  ProjectStatus,
  isIsoMonth,
  normalizeRegistryName,
} from './career-registry.parser';

// The one name normalization the rules match with, for the export's credential metadata.
export { normalizeRegistryName };

// The guard writes v2; a v1 snapshot stored in a draft before credential metadata existed is
// still read (its credentials carry no issuer or issue date).
export const REGISTRY_SNAPSHOT_SCHEMA = 'registry-snapshot/v2';
export const REGISTRY_SNAPSHOT_SCHEMA_V1 = 'registry-snapshot/v1';

export type RegistrySnapshotSchema =
  typeof REGISTRY_SNAPSHOT_SCHEMA | typeof REGISTRY_SNAPSHOT_SCHEMA_V1;

export interface RegistrySnapshotProject {
  title: string;
  aliases: string[];
  status: ProjectStatus;
  cvEligible: boolean;
  placement: ProjectPlacement;
}

export interface RegistrySnapshotCredential {
  title: string;
  aliases: string[];
  type: CredentialType;
  status: CredentialStatus;
  cvEligible: boolean;
  // Present in a registry-snapshot/v2 only: a non-empty issuer and YYYY-MM or null.
  issuer?: string;
  issued?: string | null;
}

// Unregistered titles the Prompt 2 guard accepted because a workspace manual note backs them
// (ADR-034). Prompt 3 cannot add to this list: the export gate reads it from the draft.
export interface RegistryAcceptedForced {
  projects: string[];
  credentials: string[];
}

export interface RegistrySnapshot {
  schema: RegistrySnapshotSchema;
  projects: RegistrySnapshotProject[];
  credentials: RegistrySnapshotCredential[];
  acceptedForced: RegistryAcceptedForced;
}

export interface RegistryField {
  fieldPath: string;
  text: string;
}

// The public CV fields the rules look at, extracted from either a Prompt 2 draft or the
// export's effective content. Both extractions yield the same field paths.
export interface RegistryCheckInput {
  publicTexts: RegistryField[];
  includedProjects: RegistryField[];
  includedCredentials: RegistryField[];
}

export interface RegistryViolation {
  fieldPath: string;
  message: string;
}

export interface UnregisteredInclusions {
  projects: RegistryField[];
  credentials: RegistryField[];
}

const EMPTY_ACCEPTED_FORCED: RegistryAcceptedForced = {
  projects: [],
  credentials: [],
};

const WORD_CHAR = /[\p{L}\p{N}_]/u;

interface CheckableBullet {
  text: string;
}

interface CheckableContent {
  headline: string;
  summary: string[];
  top_skills: string[];
  current_work_block: {
    include: boolean;
    safe_label: string;
    role_line: string;
    dates: string;
    location?: string;
    stable_intro: string;
    bullets: CheckableBullet[];
    tech_stack: string[];
  };
  experience: {
    company: string;
    role: string;
    dates: string;
    bullets: CheckableBullet[];
    tech_stack: string[];
  }[];
  selected_projects: {
    title: string;
    include: boolean;
    safe_label: string;
    bullets: CheckableBullet[];
    tech_stack: string[];
  }[];
}

export function buildRegistrySnapshot(
  registries: CareerRegistries,
  acceptedForced: RegistryAcceptedForced = EMPTY_ACCEPTED_FORCED,
): RegistrySnapshot {
  return {
    schema: REGISTRY_SNAPSHOT_SCHEMA,
    projects: registries.portfolio.projects.map((project) => ({
      title: project.title,
      aliases: [...project.aliases],
      status: project.status,
      cvEligible: project.cvEligible,
      placement: project.placement,
    })),
    credentials: registries.credentials.credentials.map((credential) => ({
      title: credential.title,
      aliases: [...credential.aliases],
      type: credential.type,
      status: credential.status,
      cvEligible: credential.cvEligible,
      issuer: credential.issuer,
      issued: credential.issued,
    })),
    acceptedForced: {
      projects: [...acceptedForced.projects],
      credentials: [...acceptedForced.credentials],
    },
  };
}

// ─── Field extraction ────────────────────────────────────────────────────────

const pushText = (
  fields: RegistryField[],
  fieldPath: string,
  text: unknown,
): void => {
  if (typeof text === 'string' && text.length > 0) {
    fields.push({ fieldPath, text });
  }
};

const pushList = (
  fields: RegistryField[],
  basePath: string,
  items: string[],
): void => {
  items.forEach((item, index) =>
    pushText(fields, `${basePath}[${index}]`, item),
  );
};

const pushBullets = (
  fields: RegistryField[],
  basePath: string,
  bullets: CheckableBullet[],
): void => {
  bullets.forEach((bullet, index) =>
    pushText(fields, `${basePath}.bullets[${index}].text`, bullet.text),
  );
};

// Walks exactly the fields the CV templates render (the static candidate profile excluded,
// ADR-032), skipping a current work block or project that is not included.
function collectFields(
  content: CheckableContent,
  includedCredentials: RegistryField[],
): RegistryCheckInput {
  const publicTexts: RegistryField[] = [];
  const includedProjects: RegistryField[] = [];

  pushText(publicTexts, 'headline', content.headline);
  pushList(publicTexts, 'summary', content.summary);
  pushList(publicTexts, 'top_skills', content.top_skills);

  const block = content.current_work_block;
  if (block.include) {
    const base = 'current_work_block';
    pushText(publicTexts, `${base}.safe_label`, block.safe_label);
    pushText(publicTexts, `${base}.role_line`, block.role_line);
    pushText(publicTexts, `${base}.dates`, block.dates);
    pushText(publicTexts, `${base}.location`, block.location);
    pushText(publicTexts, `${base}.stable_intro`, block.stable_intro);
    pushBullets(publicTexts, base, block.bullets);
    pushList(publicTexts, `${base}.tech_stack`, block.tech_stack);
  }

  content.experience.forEach((item, index) => {
    const base = `experience[${index}]`;
    pushText(publicTexts, `${base}.company`, item.company);
    pushText(publicTexts, `${base}.role`, item.role);
    pushText(publicTexts, `${base}.dates`, item.dates);
    pushBullets(publicTexts, base, item.bullets);
    pushList(publicTexts, `${base}.tech_stack`, item.tech_stack);
  });

  content.selected_projects.forEach((project, index) => {
    if (!project.include) return;
    const base = `selected_projects[${index}]`;
    includedProjects.push({
      fieldPath: `${base}.title`,
      text: typeof project.title === 'string' ? project.title : '',
    });
    pushText(publicTexts, `${base}.title`, project.title);
    pushText(publicTexts, `${base}.safe_label`, project.safe_label);
    pushBullets(publicTexts, base, project.bullets);
    pushList(publicTexts, `${base}.tech_stack`, project.tech_stack);
  });

  for (const credential of includedCredentials) {
    pushText(publicTexts, credential.fieldPath, credential.text);
  }

  return { publicTexts, includedProjects, includedCredentials };
}

// Prompt 2 types certifications as unknown[]; an entry is shown when `include` is truthy,
// mirroring mapPrompt2OutputToCvContent. Paths use the Prompt 2 index, as Prompt 3 does.
function collectPrompt2Credentials(items: unknown[]): RegistryField[] {
  const fields: RegistryField[] = [];
  items.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) return;
    const entry = item as { include?: unknown; title?: unknown };
    if (!entry.include) return;
    fields.push({
      fieldPath: `certifications[${index}]`,
      text: typeof entry.title === 'string' ? entry.title : '',
    });
  });
  return fields;
}

export function registryInputFromPrompt2(
  output: TargetedCvContentOutput,
): RegistryCheckInput {
  const cv = output.cv_content;
  return collectFields(cv, collectPrompt2Credentials(cv.certifications));
}

export function registryInputFromCvContent(
  content: CvContent,
): RegistryCheckInput {
  const credentials = content.certifications.map((certification, index) => ({
    fieldPath: `certifications[${certification.source_index ?? index}]`,
    text: typeof certification.name === 'string' ? certification.name : '',
  }));
  return collectFields(content, credentials);
}

// ─── Rules ───────────────────────────────────────────────────────────────────

function indexByName<T extends { title: string; aliases: string[] }>(
  entries: T[],
): Map<string, T> {
  const index = new Map<string, T>();
  for (const entry of entries) {
    for (const name of [entry.title, ...entry.aliases]) {
      index.set(normalizeRegistryName(name), entry);
    }
  }
  return index;
}

const toNameSet = (names: string[]): Set<string> =>
  new Set(names.map(normalizeRegistryName));

// The snapshot credential a CV certification name stands for, by normalized title or alias.
export function findSnapshotCredential(
  snapshot: RegistrySnapshot,
  name: string,
): RegistrySnapshotCredential | undefined {
  return indexByName(snapshot.credentials).get(normalizeRegistryName(name));
}

// Whole-phrase containment on normalized text, without building a regex from the name: a
// neighbouring Unicode letter, digit or underscore breaks the match (INV-6).
export function containsRegistryName(text: string, name: string): boolean {
  const haystack = normalizeRegistryName(text);
  const needle = normalizeRegistryName(name);
  if (needle.length === 0) return false;
  let from = haystack.indexOf(needle);
  while (from !== -1) {
    const before = from > 0 ? haystack[from - 1] : '';
    const after = haystack[from + needle.length] ?? '';
    const isBounded = !WORD_CHAR.test(before) && !WORD_CHAR.test(after);
    if (isBounded) return true;
    from = haystack.indexOf(needle, from + 1);
  }
  return false;
}

export function findUnregisteredInclusions(
  input: RegistryCheckInput,
  snapshot: RegistrySnapshot,
): UnregisteredInclusions {
  const projects = indexByName(snapshot.projects);
  const credentials = indexByName(snapshot.credentials);
  const isUnknown =
    (index: Map<string, unknown>) =>
    (field: RegistryField): boolean =>
      !index.has(normalizeRegistryName(field.text));
  return {
    projects: input.includedProjects.filter(isUnknown(projects)),
    credentials: input.includedCredentials.filter(isUnknown(credentials)),
  };
}

function checkProject(
  field: RegistryField,
  entry: RegistrySnapshotProject | undefined,
  accepted: Set<string>,
): string | null {
  const title = JSON.stringify(field.text);
  if (entry === undefined) {
    if (accepted.has(normalizeRegistryName(field.text))) return null;
    return `project ${title} is not in the portfolio registry and no workspace manual note backs it`;
  }
  if (!entry.cvEligible) {
    return `project ${title} is excluded by the portfolio registry (status: ${entry.status}, cvEligible: false)`;
  }
  if (entry.placement !== 'selected_projects') {
    return `project ${title} has placement "${entry.placement}" in the portfolio registry and must not be listed in selected_projects`;
  }
  return null;
}

function checkCredential(
  field: RegistryField,
  entry: RegistrySnapshotCredential | undefined,
  accepted: Set<string>,
): string | null {
  const title = JSON.stringify(field.text);
  if (entry === undefined) {
    if (accepted.has(normalizeRegistryName(field.text))) return null;
    return `credential ${title} is not in the credential registry and no workspace manual note backs it`;
  }
  if (!entry.cvEligible) {
    return `credential ${title} is not CV-eligible in the credential registry (type: ${entry.type}, status: ${entry.status})`;
  }
  return null;
}

export function findRegistryViolations(
  input: RegistryCheckInput,
  snapshot: RegistrySnapshot,
): RegistryViolation[] {
  const violations: RegistryViolation[] = [];
  const projects = indexByName(snapshot.projects);
  const credentials = indexByName(snapshot.credentials);
  const acceptedProjects = toNameSet(snapshot.acceptedForced.projects);
  const acceptedCredentials = toNameSet(snapshot.acceptedForced.credentials);
  // A title that resolves to a registry entry is judged by that entry alone, so the name
  // scan below does not report it a second time.
  const resolvedTitlePaths = new Set<string>();

  for (const field of input.includedProjects) {
    const entry = projects.get(normalizeRegistryName(field.text));
    if (entry !== undefined) resolvedTitlePaths.add(field.fieldPath);
    const message = checkProject(field, entry, acceptedProjects);
    if (message !== null)
      violations.push({ fieldPath: field.fieldPath, message });
  }

  for (const field of input.includedCredentials) {
    const entry = credentials.get(normalizeRegistryName(field.text));
    const message = checkCredential(field, entry, acceptedCredentials);
    if (message !== null)
      violations.push({ fieldPath: field.fieldPath, message });
  }

  // Every project the registry excludes (archived or not cvEligible) is scanned by name in the
  // public text. Credentials are not: completed training is legitimately described in prose,
  // and a credential is checked where it is claimed as one, in certifications.
  const excluded = snapshot.projects.filter((project) => !project.cvEligible);
  for (const field of input.publicTexts) {
    if (resolvedTitlePaths.has(field.fieldPath)) continue;
    for (const project of excluded) {
      const names = [project.title, ...project.aliases];
      if (names.some((name) => containsRegistryName(field.text, name))) {
        violations.push({
          fieldPath: field.fieldPath,
          message: describeNamedExclusion(project),
        });
      }
    }
  }

  return violations;
}

const describeNamedExclusion = (project: RegistrySnapshotProject): string =>
  project.status === 'archived'
    ? `names archived project ${JSON.stringify(project.title)}`
    : `names excluded project ${JSON.stringify(project.title)} (cvEligible: false)`;

export const formatRegistryViolation = (violation: RegistryViolation): string =>
  `${violation.fieldPath}: ${violation.message}`;

// ─── Snapshot read-back (export gate) ────────────────────────────────────────

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isOneOf = <T extends string>(
  value: unknown,
  values: readonly T[],
): value is T => typeof value === 'string' && values.includes(value as T);

const hasExactKeys = (record: JsonRecord, keys: string[]): boolean => {
  const actual = Object.keys(record);
  return (
    actual.length === keys.length && keys.every((key) => actual.includes(key))
  );
};

const PROJECT_SNAPSHOT_KEYS = [
  'title',
  'aliases',
  'status',
  'cvEligible',
  'placement',
];
const CREDENTIAL_SNAPSHOT_V1_KEYS = [
  'title',
  'aliases',
  'type',
  'status',
  'cvEligible',
];
const CREDENTIAL_SNAPSHOT_V2_KEYS = [
  ...CREDENTIAL_SNAPSHOT_V1_KEYS,
  'issuer',
  'issued',
];

const isSnapshotProject = (value: unknown): value is RegistrySnapshotProject =>
  isRecord(value) &&
  hasExactKeys(value, PROJECT_SNAPSHOT_KEYS) &&
  typeof value['title'] === 'string' &&
  isStringArray(value['aliases']) &&
  isOneOf(value['status'], PROJECT_STATUSES) &&
  typeof value['cvEligible'] === 'boolean' &&
  isOneOf(value['placement'], PROJECT_PLACEMENTS);

const hasCredentialIdentity = (record: JsonRecord): boolean =>
  typeof record['title'] === 'string' &&
  isStringArray(record['aliases']) &&
  isOneOf(record['type'], CREDENTIAL_TYPES) &&
  isOneOf(record['status'], CREDENTIAL_STATUSES) &&
  typeof record['cvEligible'] === 'boolean';

const isSnapshotCredentialV1 = (
  value: unknown,
): value is RegistrySnapshotCredential =>
  isRecord(value) &&
  hasExactKeys(value, CREDENTIAL_SNAPSHOT_V1_KEYS) &&
  hasCredentialIdentity(value);

const isIssueDate = (value: unknown): boolean =>
  value === null || (typeof value === 'string' && isIsoMonth(value));

const isSnapshotCredentialV2 = (
  value: unknown,
): value is RegistrySnapshotCredential =>
  isRecord(value) &&
  hasExactKeys(value, CREDENTIAL_SNAPSHOT_V2_KEYS) &&
  hasCredentialIdentity(value) &&
  typeof value['issuer'] === 'string' &&
  value['issuer'].trim().length > 0 &&
  isIssueDate(value['issued']);

// The credential key set is chosen by the snapshot's own `schema`: an invalid v2 credential is
// never read as v1, and a v1 snapshot with v2 keys is rejected.
const CREDENTIAL_CHECKS = new Map<
  string,
  (value: unknown) => value is RegistrySnapshotCredential
>([
  [REGISTRY_SNAPSHOT_SCHEMA_V1, isSnapshotCredentialV1],
  [REGISTRY_SNAPSHOT_SCHEMA, isSnapshotCredentialV2],
]);

const hasUniqueNames = (
  entries: { title: string; aliases: string[] }[],
): boolean => {
  const names = entries.flatMap((entry) => [entry.title, ...entry.aliases]);
  return toNameSet(names).size === names.length;
};

const isAcceptedForced = (value: unknown): value is RegistryAcceptedForced =>
  isRecord(value) &&
  hasExactKeys(value, ['projects', 'credentials']) &&
  isStringArray(value['projects']) &&
  isStringArray(value['credentials']);

const SNAPSHOT_KEYS = ['schema', 'projects', 'credentials', 'acceptedForced'];

// The snapshot is read back from a workspace file, so it is validated as untrusted input.
// Returns null for a missing or malformed snapshot; the export gate then fails closed.
export function parseRegistrySnapshot(value: unknown): RegistrySnapshot | null {
  if (!isRecord(value) || !hasExactKeys(value, SNAPSHOT_KEYS)) return null;
  const { schema, projects, credentials, acceptedForced } = value;
  if (typeof schema !== 'string') return null;
  const isSnapshotCredential = CREDENTIAL_CHECKS.get(schema);
  if (isSnapshotCredential === undefined) return null;
  const isValid =
    Array.isArray(projects) &&
    projects.every(isSnapshotProject) &&
    hasUniqueNames(projects) &&
    Array.isArray(credentials) &&
    credentials.every(isSnapshotCredential) &&
    hasUniqueNames(credentials) &&
    isAcceptedForced(acceptedForced);
  if (!isValid) return null;
  return {
    schema: schema as RegistrySnapshotSchema,
    projects: projects.map((project) => ({
      ...project,
      aliases: [...project.aliases],
    })),
    credentials: credentials.map((credential) => ({
      ...credential,
      aliases: [...credential.aliases],
    })),
    acceptedForced: {
      projects: [...acceptedForced.projects],
      credentials: [...acceptedForced.credentials],
    },
  };
}
