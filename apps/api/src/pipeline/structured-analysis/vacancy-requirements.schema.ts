// Contract `01a` of the experimental structured analysis (ADR-046 items 4, 7, 15): the vacancy's
// requirements and facts, each backed by a verbatim vacancy quote. Pure: parsed JSON in, a typed
// contract or a list of readable errors out.

export const VACANCY_REQUIREMENTS_ARTIFACT = '01a_vacancy_requirements.json';
export const VACANCY_REQUIREMENTS_CONTRACT_MAJOR = 1;

export const REQUIREMENT_KINDS = [
  'must_have',
  'nice_to_have',
  'wishlist',
] as const;

export const VACANCY_FACT_TYPES = [
  'english_main_working_language',
  'commercial_experience_required',
  'optional_or_transferable',
  'early_stage_role',
  'lowers_evidence_bar',
  'senior_product_ownership_ask',
  'agency_listing',
  'equivalent_experience_accepted',
] as const;

export const SENIORITY_LEVELS = [
  'junior',
  'mid',
  'senior',
  'lead',
  'unspecified',
] as const;

export const LANGUAGE_NAMES = ['german', 'english', 'other'] as const;
export const LANGUAGE_LEVELS = [
  'basic',
  'b1',
  'b2',
  'c1',
  'c2',
  'fluent',
  'unspecified',
] as const;
export const LANGUAGE_NEEDS = [
  'mandatory',
  'preferred',
  'nice_to_have',
] as const;
export const LANGUAGE_USAGES = ['internal', 'external', 'unclear'] as const;

export type RequirementKind = (typeof REQUIREMENT_KINDS)[number];
export type VacancyFactType = (typeof VACANCY_FACT_TYPES)[number];
export type SeniorityLevel = (typeof SENIORITY_LEVELS)[number];
export type LanguageName = (typeof LANGUAGE_NAMES)[number];
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];
export type LanguageNeed = (typeof LANGUAGE_NEEDS)[number];
export type LanguageUsage = (typeof LANGUAGE_USAGES)[number];

export interface VacancyRequirement {
  id: string;
  kind: RequirementKind;
  text: string;
  quote: string;
}

// `requirement_ids` empty means the fact applies to the whole vacancy.
export interface VacancyFact {
  id: string;
  type: VacancyFactType;
  quote: string;
  requirement_ids: string[];
}

export interface LanguageRequirement {
  id: string;
  language: LanguageName;
  level: LanguageLevel;
  need: LanguageNeed;
  usage: LanguageUsage;
  quote: string;
}

export interface VacancySeniority {
  level: SeniorityLevel;
  // null only when the level is `unspecified`
  quote: string | null;
}

export interface VacancyRequirements {
  contract_version: string;
  seniority: VacancySeniority;
  requirements: VacancyRequirement[];
  facts: VacancyFact[];
  languages: LanguageRequirement[];
  hidden_role_logic: string[];
}

export type ContractValidation<T> =
  { success: true; data: T } | { success: false; errors: string[] };

const CONTRACT_VERSION = /^(\d+)\.(\d+)$/;
const ITEM_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isString = (value: unknown): value is string =>
  typeof value === 'string';

export const isNonEmptyString = (value: unknown): value is string =>
  isString(value) && value.trim() !== '';

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

export const isOneOf = <T extends string>(
  values: readonly T[],
  value: unknown,
): value is T =>
  isString(value) && (values as readonly string[]).includes(value);

export const isItemId = (value: unknown): value is string =>
  isString(value) && ITEM_ID.test(value);

export const contractMajorOf = (version: unknown): number | null => {
  if (!isString(version)) return null;
  const match = CONTRACT_VERSION.exec(version);
  return match ? Number(match[1]) : null;
};

// Shared by the three contracts: an unknown major version is never read as the current one.
export const checkContractVersion = (
  version: unknown,
  expectedMajor: number,
): string | null => {
  const major = contractMajorOf(version);
  if (major === null) {
    return 'contract_version must be "<major>.<minor>"';
  }
  if (major !== expectedMajor) {
    return `unknown contract major version ${major} (expected ${expectedMajor})`;
  }
  return null;
};

export const normalizeWhitespace = (text: string): string =>
  text.replace(/\s+/gu, ' ').trim();

export const isVacancyQuote = (quote: string, vacancyText: string): boolean => {
  const normalizedQuote = normalizeWhitespace(quote);
  if (normalizedQuote === '') return false;
  return normalizeWhitespace(vacancyText).includes(normalizedQuote);
};

const checkQuote = (
  quote: unknown,
  owner: string,
  vacancyText: string,
  errors: string[],
): void => {
  if (!isString(quote)) {
    errors.push(`${owner}: quote must be a string`);
    return;
  }
  if (!isVacancyQuote(quote, vacancyText)) {
    errors.push(`${owner}: quote is not a substring of the vacancy text`);
  }
};

// Walks a list of id-carrying items: reports a malformed item or a duplicate id, records the
// id, then hands the item to its own checker.
export const checkIdentifiedItems = (
  raw: unknown,
  listName: string,
  itemName: string,
  ids: Set<string>,
  errors: string[],
  checkItem: (item: Record<string, unknown>, owner: string) => void,
): void => {
  if (!Array.isArray(raw)) {
    errors.push(`${listName} must be an array`);
    return;
  }
  for (const [index, item] of raw.entries()) {
    if (!isRecord(item) || !isItemId(item.id)) {
      errors.push(`${listName}[${index}]: object with a valid id expected`);
      continue;
    }
    const owner = `${itemName} ${item.id}`;
    if (ids.has(item.id)) errors.push(`${owner}: duplicate id`);
    ids.add(item.id);
    checkItem(item, owner);
  }
};

const checkRequirements = (
  raw: unknown,
  vacancyText: string,
  ids: Set<string>,
  errors: string[],
): void =>
  checkIdentifiedItems(
    raw,
    'requirements',
    'requirement',
    ids,
    errors,
    (item, owner) => {
      if (!isOneOf(REQUIREMENT_KINDS, item.kind)) {
        errors.push(`${owner}: unknown kind ${String(item.kind)}`);
      }
      if (!isNonEmptyString(item.text)) {
        errors.push(`${owner}: text must be a non-empty string`);
      }
      checkQuote(item.quote, owner, vacancyText, errors);
    },
  );

const checkFacts = (
  raw: unknown,
  vacancyText: string,
  ids: Set<string>,
  requirementIds: ReadonlySet<string>,
  errors: string[],
): void =>
  checkIdentifiedItems(raw, 'facts', 'fact', ids, errors, (item, owner) => {
    if (!isOneOf(VACANCY_FACT_TYPES, item.type)) {
      errors.push(`${owner}: unknown type ${String(item.type)}`);
    }
    checkQuote(item.quote, owner, vacancyText, errors);
    if (!isStringArray(item.requirement_ids)) {
      errors.push(`${owner}: requirement_ids must be a string array`);
      return;
    }
    for (const id of item.requirement_ids) {
      if (!requirementIds.has(id)) {
        errors.push(`${owner}: unknown requirement id ${id}`);
      }
    }
  });

const LANGUAGE_ENUMS = [
  ['language', LANGUAGE_NAMES],
  ['level', LANGUAGE_LEVELS],
  ['need', LANGUAGE_NEEDS],
  ['usage', LANGUAGE_USAGES],
] as const;

const checkLanguages = (
  raw: unknown,
  vacancyText: string,
  ids: Set<string>,
  errors: string[],
): void =>
  checkIdentifiedItems(
    raw,
    'languages',
    'language requirement',
    ids,
    errors,
    (item, owner) => {
      for (const [field, values] of LANGUAGE_ENUMS) {
        if (!isOneOf<string>(values, item[field])) {
          errors.push(`${owner}: unknown ${field} ${String(item[field])}`);
        }
      }
      checkQuote(item.quote, owner, vacancyText, errors);
    },
  );

const checkSeniority = (
  raw: unknown,
  vacancyText: string,
  errors: string[],
): void => {
  if (!isRecord(raw) || !isOneOf(SENIORITY_LEVELS, raw.level)) {
    errors.push('seniority must be an object with a known level');
    return;
  }
  if (raw.level === 'unspecified' && raw.quote === null) return;
  checkQuote(raw.quote, 'seniority', vacancyText, errors);
};

export const validateVacancyRequirements = (
  raw: unknown,
  vacancyText: string,
): ContractValidation<VacancyRequirements> => {
  if (!isRecord(raw)) {
    return { success: false, errors: ['01a must be a JSON object'] };
  }
  const versionError = checkContractVersion(
    raw.contract_version,
    VACANCY_REQUIREMENTS_CONTRACT_MAJOR,
  );
  if (versionError) return { success: false, errors: [versionError] };

  const errors: string[] = [];
  const ids = new Set<string>();
  checkSeniority(raw.seniority, vacancyText, errors);
  checkRequirements(raw.requirements, vacancyText, ids, errors);
  const requirementIds = new Set(ids);
  checkFacts(raw.facts, vacancyText, ids, requirementIds, errors);
  checkLanguages(raw.languages, vacancyText, ids, errors);
  if (!isStringArray(raw.hidden_role_logic)) {
    errors.push('hidden_role_logic must be a string array');
  }
  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: raw as unknown as VacancyRequirements };
};

// A fact applies to a requirement when it names it, or when it names none (vacancy-wide).
export const factApplies = (
  requirements: VacancyRequirements,
  type: VacancyFactType,
  requirementId: string | null,
): boolean =>
  requirements.facts.some(
    (fact) =>
      fact.type === type &&
      (fact.requirement_ids.length === 0 ||
        (requirementId !== null &&
          fact.requirement_ids.includes(requirementId))),
  );

export const hasVacancyFact = (
  requirements: VacancyRequirements,
  type: VacancyFactType,
): boolean => requirements.facts.some((fact) => fact.type === type);
