// Strict parser for the career registries kept as fenced JSON blocks inside the active
// knowledge sources (PLAN-career-evidence-refresh.md, "Registry-контракт"):
// `json portfolio-registry` in the project_inventory source and `json credential-registry` in
// the certifications source. Pure: text in, typed registry out, CareerRegistryError on any
// deviation from the contract. There is no fallback — a missing or invalid registry fails closed.

export type RegistryBlockType = 'portfolio-registry' | 'credential-registry';

export class CareerRegistryError extends Error {
  constructor(
    readonly blockType: RegistryBlockType,
    readonly reason: string,
  ) {
    super(`Invalid ${blockType}: ${reason}`);
    this.name = 'CareerRegistryError';
  }
}

export const PROJECT_STATUSES = ['active', 'archived'] as const;
export const PORTFOLIO_PRIORITIES = ['primary', 'secondary', 'none'] as const;
export const PROJECT_PLACEMENTS = [
  'current_work_block',
  'selected_projects',
  'none',
] as const;
export const PROJECT_EVIDENCE_CLASSES = [
  'personal_verified',
  'candidate_confirmed',
  'needs_evidence',
] as const;
export const DEPLOYMENT_KINDS = [
  'public',
  'private_single_owner',
  'package',
  'none',
] as const;
export const ROLE_FAMILIES = [
  'backend_node',
  'nestjs',
  'ai_integration',
  'ai_assisted_engineering',
  'developer_productivity',
  'fullstack_react',
  'database_financial',
  'azure_production',
  'python_secondary',
] as const;
export const CREDENTIAL_TYPES = [
  'professional_certificate',
  'skill_badge',
  'course_completion',
  'lab',
  'learning_path',
  'assessment',
] as const;
export const CREDENTIAL_STATUSES = [
  'earned',
  'completed',
  'in_progress',
] as const;
export const CREDENTIAL_EVIDENCE_CLASSES = [
  'training_verified',
  'candidate_confirmed',
  'needs_evidence',
] as const;
export const AI_CATEGORIES = [
  'ai_assisted_engineering',
  'ai_integration',
  'agent_training',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type PortfolioPriority = (typeof PORTFOLIO_PRIORITIES)[number];
export type ProjectPlacement = (typeof PROJECT_PLACEMENTS)[number];
export type ProjectEvidenceClass = (typeof PROJECT_EVIDENCE_CLASSES)[number];
export type DeploymentKind = (typeof DEPLOYMENT_KINDS)[number];
export type RoleFamily = (typeof ROLE_FAMILIES)[number];
export type CredentialType = (typeof CREDENTIAL_TYPES)[number];
export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];
export type CredentialEvidenceClass =
  (typeof CREDENTIAL_EVIDENCE_CLASSES)[number];
export type AiCategory = (typeof AI_CATEGORIES)[number];

export interface PortfolioProject {
  id: string;
  title: string;
  aliases: string[];
  status: ProjectStatus;
  cvEligible: boolean;
  portfolioPriority: PortfolioPriority;
  placement: ProjectPlacement;
  evidenceClass: ProjectEvidenceClass;
  repositoryUrl: string | null;
  lastVerifiedAt: string;
  verifiedCommit: string | null;
  deployment: { kind: DeploymentKind; url: string | null } | null;
  roleFamilies: RoleFamily[];
  techStack: string[];
  allowedWording: string[];
  prohibitedClaims: string[];
}

export interface PortfolioRegistry {
  schema: 'portfolio-registry/v1';
  projects: PortfolioProject[];
}

export interface Credential {
  id: string;
  title: string;
  aliases: string[];
  issuer: string;
  type: CredentialType;
  status: CredentialStatus;
  cvEligible: boolean;
  evidenceClass: CredentialEvidenceClass;
  issued: string | null;
  credentialId: string | null;
  verificationUrl: string | null;
  skills: string[];
  roleFamilies: RoleFamily[];
  aiCategory: AiCategory | null;
}

export interface CredentialRegistry {
  schema: 'credential-registry/v1';
  credentials: Credential[];
}

export interface CareerRegistries {
  portfolio: PortfolioRegistry;
  credentials: CredentialRegistry;
}

export interface RegistrySourceText {
  sourceType: string;
  // null when the source file could not be read as text
  content: string | null;
}

const PORTFOLIO_SCHEMA = 'portfolio-registry/v1';
const CREDENTIAL_SCHEMA = 'credential-registry/v1';
const PORTFOLIO_SOURCE_TYPE = 'project_inventory';
const CREDENTIAL_SOURCE_TYPE = 'certifications';

const KEBAB_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const FENCE_CLOSE = '```';

// The credential `issued` format (YYYY-MM), shared with the registry snapshot read-back.
export const isIsoMonth = (value: string): boolean => ISO_MONTH.test(value);

const PROJECT_KEYS = [
  'id',
  'title',
  'aliases',
  'status',
  'cvEligible',
  'portfolioPriority',
  'placement',
  'evidenceClass',
  'repositoryUrl',
  'lastVerifiedAt',
  'verifiedCommit',
  'deployment',
  'roleFamilies',
  'techStack',
  'allowedWording',
  'prohibitedClaims',
];

const CREDENTIAL_KEYS = [
  'id',
  'title',
  'aliases',
  'issuer',
  'type',
  'status',
  'cvEligible',
  'evidenceClass',
  'issued',
  'credentialId',
  'verificationUrl',
  'skills',
  'roleFamilies',
  'aiCategory',
];

const NOT_ELIGIBLE_CREDENTIAL_TYPES: readonly CredentialType[] = [
  'lab',
  'learning_path',
  'assessment',
];

// Unicode NFKC, lowercase, collapsed whitespace, trimmed: the single matching rule for registry
// titles and aliases against each other and against CV content (INV-6).
export const normalizeRegistryName = (value: string): string =>
  value.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Reads typed fields of one JSON record and reports every deviation with the record's path.
class RecordReader {
  constructor(
    private readonly blockType: RegistryBlockType,
    private readonly record: JsonRecord,
    private readonly path: string,
  ) {}

  fail(reason: string): never {
    throw new CareerRegistryError(this.blockType, `${this.path}: ${reason}`);
  }

  assertKnownKeys(allowed: readonly string[]): void {
    for (const key of Object.keys(this.record)) {
      if (!allowed.includes(key)) this.fail(`unknown field "${key}"`);
    }
  }

  has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.record, key);
  }

  string(key: string): string {
    const value = this.record[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      this.fail(`"${key}" must be a non-empty string`);
    }
    return value;
  }

  pattern(key: string, regex: RegExp, description: string): string {
    const value = this.string(key);
    if (!regex.test(value)) this.fail(`"${key}" must be ${description}`);
    return value;
  }

  boolean(key: string): boolean {
    const value = this.record[key];
    if (typeof value !== 'boolean') this.fail(`"${key}" must be a boolean`);
    return value;
  }

  oneOf<T extends string>(key: string, values: readonly T[]): T {
    const value = this.record[key];
    if (typeof value !== 'string' || !values.includes(value as T)) {
      this.fail(`"${key}" must be one of ${values.join(', ')}`);
    }
    return value as T;
  }

  nullableString(key: string): string | null {
    if (!this.has(key)) this.fail(`"${key}" is required (string or null)`);
    if (this.record[key] === null) return null;
    return this.string(key);
  }

  optionalNullableString(key: string): string | null {
    return this.has(key) ? this.nullableString(key) : null;
  }

  optionalStringArray(key: string): string[] {
    if (!this.has(key)) return [];
    const value = this.record[key];
    const isValid =
      Array.isArray(value) &&
      value.every((item) => typeof item === 'string' && item.trim() !== '');
    if (!isValid) this.fail(`"${key}" must be an array of non-empty strings`);
    return value as string[];
  }

  optionalEnumArray<T extends string>(key: string, values: readonly T[]): T[] {
    const items = this.optionalStringArray(key);
    for (const item of items) {
      if (!values.includes(item as T)) {
        this.fail(`"${key}" contains "${item}", allowed: ${values.join(', ')}`);
      }
    }
    return items as T[];
  }
}

const isRealDate = (value: string): boolean => {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const REGISTRY_BLOCK_TYPES: readonly RegistryBlockType[] = [
  'portfolio-registry',
  'credential-registry',
];

// Line indexes of one registry block: the opening fence line and the closing fence line.
interface RegistryBlockRange {
  openLine: number;
  closeLine: number;
}

const openingBlockType = (
  line: string,
  blockTypes: readonly RegistryBlockType[],
): RegistryBlockType | null => {
  const trimmed = line.trim();
  for (const blockType of blockTypes) {
    if (trimmed === `\`\`\`json ${blockType}`) return blockType;
  }
  return null;
};

// The single rule that recognizes registry blocks: an opening line `json <blockType>` after the
// triple backtick, closed by the next line that is only the triple backtick. An unclosed block
// fails closed. Lines may keep their line breaks — the comparison trims them.
function findRegistryBlocks(
  lines: readonly string[],
  blockTypes: readonly RegistryBlockType[],
): RegistryBlockRange[] {
  const ranges: RegistryBlockRange[] = [];
  let index = 0;
  while (index < lines.length) {
    const blockType = openingBlockType(lines[index], blockTypes);
    if (blockType === null) {
      index += 1;
      continue;
    }
    let end = index + 1;
    while (end < lines.length && lines[end].trim() !== FENCE_CLOSE) end += 1;
    if (end === lines.length) {
      throw new CareerRegistryError(blockType, 'the block is not closed');
    }
    ranges.push({ openLine: index, closeLine: end });
    index = end + 1;
  }
  return ranges;
}

/**
 * The source text without its `portfolio-registry` and `credential-registry` blocks: each block
 * is removed together with its fence lines, every other character (line breaks included) stays.
 * An unclosed registry block throws `CareerRegistryError`.
 */
export function stripRegistryBlocks(sourceText: string): string {
  const lines = sourceText.split(/(?<=\n)/);
  const ranges = findRegistryBlocks(lines, REGISTRY_BLOCK_TYPES);
  if (ranges.length === 0) return sourceText;
  const kept: string[] = [];
  let next = 0;
  for (const range of ranges) {
    kept.push(...lines.slice(next, range.openLine));
    next = range.closeLine + 1;
  }
  kept.push(...lines.slice(next));
  return kept.join('');
}

export function extractRegistryBlock(
  sourceText: string,
  blockType: RegistryBlockType,
): string {
  const lines = sourceText.split(/\r?\n/);
  const blocks = findRegistryBlocks(lines, [blockType]).map((range) =>
    lines.slice(range.openLine + 1, range.closeLine).join('\n'),
  );
  if (blocks.length === 0) {
    throw new CareerRegistryError(blockType, 'no registry block found');
  }
  if (blocks.length > 1) {
    throw new CareerRegistryError(
      blockType,
      `expected exactly one registry block, found ${blocks.length}`,
    );
  }
  return blocks[0];
}

function parseBlockJson(
  sourceText: string,
  blockType: RegistryBlockType,
): JsonRecord {
  const blockText = extractRegistryBlock(sourceText, blockType);
  let value: unknown;
  try {
    value = JSON.parse(blockText);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CareerRegistryError(blockType, `malformed JSON — ${detail}`);
  }
  if (!isRecord(value)) {
    throw new CareerRegistryError(blockType, 'the root must be a JSON object');
  }
  return value;
}

function readEntries(
  root: RecordReader,
  rootRecord: JsonRecord,
  key: string,
): JsonRecord[] {
  const value = rootRecord[key];
  if (!Array.isArray(value)) root.fail(`"${key}" must be an array`);
  return (value as unknown[]).map((entry, index) => {
    if (!isRecord(entry)) root.fail(`${key}[${index}] must be an object`);
    return entry as JsonRecord;
  });
}

interface NamedEntry {
  id: string;
  title: string;
  aliases: string[];
}

function assertUniqueNames(
  blockType: RegistryBlockType,
  entries: NamedEntry[],
): void {
  const ids = new Set<string>();
  const names = new Map<string, string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) {
      throw new CareerRegistryError(blockType, `duplicate id "${entry.id}"`);
    }
    ids.add(entry.id);
    for (const name of [entry.title, ...entry.aliases]) {
      const normalized = normalizeRegistryName(name);
      const owner = names.get(normalized);
      if (owner !== undefined) {
        throw new CareerRegistryError(
          blockType,
          `duplicate normalized title or alias "${name}" (entries "${owner}" and "${entry.id}")`,
        );
      }
      names.set(normalized, entry.id);
    }
  }
}

function readDeployment(
  reader: RecordReader,
  record: JsonRecord,
  path: string,
): PortfolioProject['deployment'] {
  if (!reader.has('deployment')) return null;
  const value = record['deployment'];
  if (!isRecord(value)) reader.fail('"deployment" must be an object');
  const deployment = new RecordReader(
    'portfolio-registry',
    value as JsonRecord,
    `${path}.deployment`,
  );
  deployment.assertKnownKeys(['kind', 'url']);
  return {
    kind: deployment.oneOf('kind', DEPLOYMENT_KINDS),
    url: deployment.nullableString('url'),
  };
}

function assertProjectConsistency(
  reader: RecordReader,
  project: PortfolioProject,
): void {
  if (project.status === 'archived') {
    const isClosed =
      !project.cvEligible &&
      project.placement === 'none' &&
      project.portfolioPriority === 'none';
    if (!isClosed) {
      reader.fail(
        'an archived project must have cvEligible: false, placement: none and portfolioPriority: none',
      );
    }
  }
  if (project.evidenceClass === 'needs_evidence' && project.cvEligible) {
    reader.fail('a needs_evidence project cannot be cvEligible');
  }
  if (project.cvEligible && project.placement === 'none') {
    reader.fail('a cvEligible project needs a placement other than none');
  }
  const deployment = project.deployment;
  if (
    deployment !== null &&
    deployment.kind === 'private_single_owner' &&
    deployment.url !== null
  ) {
    reader.fail('a private_single_owner deployment must have url: null');
  }
}

function readProject(record: JsonRecord, path: string): PortfolioProject {
  const reader = new RecordReader('portfolio-registry', record, path);
  reader.assertKnownKeys(PROJECT_KEYS);
  const repositoryUrl = reader.nullableString('repositoryUrl');
  if (repositoryUrl !== null && !isHttpsUrl(repositoryUrl)) {
    reader.fail('"repositoryUrl" must be an https:// URL or null');
  }
  const lastVerifiedAt = reader.pattern(
    'lastVerifiedAt',
    ISO_DATE,
    'a YYYY-MM-DD date',
  );
  if (!isRealDate(lastVerifiedAt)) {
    reader.fail('"lastVerifiedAt" is not a calendar date');
  }
  const project: PortfolioProject = {
    id: reader.pattern('id', KEBAB_ID, 'kebab-case'),
    title: reader.string('title'),
    aliases: reader.optionalStringArray('aliases'),
    status: reader.oneOf('status', PROJECT_STATUSES),
    cvEligible: reader.boolean('cvEligible'),
    portfolioPriority: reader.oneOf('portfolioPriority', PORTFOLIO_PRIORITIES),
    placement: reader.oneOf('placement', PROJECT_PLACEMENTS),
    evidenceClass: reader.oneOf('evidenceClass', PROJECT_EVIDENCE_CLASSES),
    repositoryUrl,
    lastVerifiedAt,
    verifiedCommit: reader.has('verifiedCommit')
      ? reader.string('verifiedCommit')
      : null,
    deployment: readDeployment(reader, record, path),
    roleFamilies: reader.optionalEnumArray('roleFamilies', ROLE_FAMILIES),
    techStack: reader.optionalStringArray('techStack'),
    allowedWording: reader.optionalStringArray('allowedWording'),
    prohibitedClaims: reader.optionalStringArray('prohibitedClaims'),
  };
  assertProjectConsistency(reader, project);
  return project;
}

export function parsePortfolioRegistry(sourceText: string): PortfolioRegistry {
  const blockType: RegistryBlockType = 'portfolio-registry';
  const rootRecord = parseBlockJson(sourceText, blockType);
  const root = new RecordReader(blockType, rootRecord, 'registry');
  root.assertKnownKeys(['schema', 'projects']);
  if (rootRecord['schema'] !== PORTFOLIO_SCHEMA) {
    root.fail(`"schema" must be "${PORTFOLIO_SCHEMA}"`);
  }
  const projects = readEntries(root, rootRecord, 'projects').map(
    (record, index) => readProject(record, `projects[${index}]`),
  );
  assertUniqueNames(blockType, projects);
  const currentWork = projects.filter(
    (project) => project.placement === 'current_work_block',
  );
  if (currentWork.length > 1) {
    root.fail('at most one project may have placement current_work_block');
  }
  return { schema: PORTFOLIO_SCHEMA, projects };
}

function assertCredentialConsistency(
  reader: RecordReader,
  credential: Credential,
): void {
  if (!credential.cvEligible) return;
  if (NOT_ELIGIBLE_CREDENTIAL_TYPES.includes(credential.type)) {
    reader.fail(`a ${credential.type} credential cannot be cvEligible`);
  }
  if (credential.status === 'in_progress') {
    reader.fail('an in_progress credential cannot be cvEligible');
  }
  if (credential.evidenceClass === 'needs_evidence') {
    reader.fail('a needs_evidence credential cannot be cvEligible');
  }
}

function readCredential(record: JsonRecord, path: string): Credential {
  const reader = new RecordReader('credential-registry', record, path);
  reader.assertKnownKeys(CREDENTIAL_KEYS);
  const issued = reader.nullableString('issued');
  if (issued !== null && !isIsoMonth(issued)) {
    reader.fail('"issued" must be YYYY-MM or null');
  }
  const credential: Credential = {
    id: reader.pattern('id', KEBAB_ID, 'kebab-case'),
    title: reader.string('title'),
    aliases: reader.optionalStringArray('aliases'),
    issuer: reader.string('issuer'),
    type: reader.oneOf('type', CREDENTIAL_TYPES),
    status: reader.oneOf('status', CREDENTIAL_STATUSES),
    cvEligible: reader.boolean('cvEligible'),
    evidenceClass: reader.oneOf('evidenceClass', CREDENTIAL_EVIDENCE_CLASSES),
    issued,
    credentialId: reader.optionalNullableString('credentialId'),
    verificationUrl: reader.optionalNullableString('verificationUrl'),
    skills: reader.optionalStringArray('skills'),
    roleFamilies: reader.optionalEnumArray('roleFamilies', ROLE_FAMILIES),
    aiCategory: reader.has('aiCategory')
      ? reader.oneOf('aiCategory', AI_CATEGORIES)
      : null,
  };
  assertCredentialConsistency(reader, credential);
  return credential;
}

export function parseCredentialRegistry(
  sourceText: string,
): CredentialRegistry {
  const blockType: RegistryBlockType = 'credential-registry';
  const rootRecord = parseBlockJson(sourceText, blockType);
  const root = new RecordReader(blockType, rootRecord, 'registry');
  root.assertKnownKeys(['schema', 'credentials']);
  if (rootRecord['schema'] !== CREDENTIAL_SCHEMA) {
    root.fail(`"schema" must be "${CREDENTIAL_SCHEMA}"`);
  }
  const credentials = readEntries(root, rootRecord, 'credentials').map(
    (record, index) => readCredential(record, `credentials[${index}]`),
  );
  assertUniqueNames(blockType, credentials);
  return { schema: CREDENTIAL_SCHEMA, credentials };
}

function findSingleSourceText(
  sources: RegistrySourceText[],
  sourceType: string,
  blockType: RegistryBlockType,
): string {
  const matching = sources.filter((source) => source.sourceType === sourceType);
  if (matching.length !== 1) {
    throw new CareerRegistryError(
      blockType,
      `expected exactly one active "${sourceType}" knowledge source, found ${matching.length}`,
    );
  }
  const content = matching[0].content;
  if (content === null) {
    throw new CareerRegistryError(
      blockType,
      `the active "${sourceType}" knowledge source has no readable text`,
    );
  }
  return content;
}

// Parses both registries from already-loaded active knowledge sources; never reads files.
export function parseCareerRegistries(
  sources: RegistrySourceText[],
): CareerRegistries {
  const portfolioText = findSingleSourceText(
    sources,
    PORTFOLIO_SOURCE_TYPE,
    'portfolio-registry',
  );
  const credentialText = findSingleSourceText(
    sources,
    CREDENTIAL_SOURCE_TYPE,
    'credential-registry',
  );
  return {
    portfolio: parsePortfolioRegistry(portfolioText),
    credentials: parseCredentialRegistry(credentialText),
  };
}
