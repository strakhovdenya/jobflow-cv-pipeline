// The candidate-constant block of ADR-046 item 10 (ISSUE-713 INV-8): the only candidate profile
// values an experimental stage receives from `CANDIDATE_PROFILE_CONFIG` — language levels,
// location and work authorisation. Contact data never enters it. Pure.

import {
  CANDIDATE_PROFILE_CONFIG,
  CandidateProfileConfig,
} from '../../document-export/candidate-profile.config';

export interface CandidateLanguageLevel {
  language: string;
  level: string;
}

export interface CandidateConstants {
  language_levels: CandidateLanguageLevel[];
  location: string;
  work_authorisation: string;
}

export const buildCandidateConstants = (
  config: CandidateProfileConfig = CANDIDATE_PROFILE_CONFIG,
): CandidateConstants => ({
  language_levels: config.languages.map((entry) => ({
    language: entry.language,
    level: entry.level,
  })),
  location: config.candidate.location,
  work_authorisation: config.candidate.work_authorization,
});

// The exact text an experimental stage receives and its identity hashes.
export const renderCandidateConstantsBlock = (
  constants: CandidateConstants = buildCandidateConstants(),
): string => JSON.stringify(constants, null, 2);
