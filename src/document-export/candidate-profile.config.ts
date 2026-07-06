// Static candidate identity/profile data — never produced by Prompt 2.
// Prompt2Output only describes the targeted CV content (headline, experience,
// selected projects, etc.); it has no concept of the applicant's own name,
// contact details, education, languages, links or volunteering history.
// Company/JobVacancy DB records describe the employer and the vacancy, not
// the candidate, so they are not a valid source for these fields either.
import {
  CvCandidate,
  CvEducationItem,
  CvLanguage,
  CvLink,
  CvVolunteering,
} from '../pipeline/schemas/cv-content.schema';

export interface CandidateProfileConfig {
  candidate: CvCandidate;
  education: CvEducationItem[];
  languages: CvLanguage[];
  links: CvLink[];
  volunteering: CvVolunteering[];
}

export const CANDIDATE_PROFILE_CONFIG: CandidateProfileConfig = {
  candidate: {
    name: 'Denys Strakhov',
    contact: {
      phone: '+49 160 962 77 376',
      email: 'strakhov.denya@gmail.com',
      linkedin: 'https://linkedin.com/in/denis-strakhov-9b5820a7',
      github: 'https://github.com/strakhovdenya',
    },
    location: 'Cologne, Germany',
    work_authorization: 'Eligible to work in Germany',
  },
  education: [
    {
      institution: 'Placeholder University',
      degree: 'Placeholder Degree',
      dates: 'Placeholder dates',
    },
  ],
  languages: [
    { language: 'English', level: 'Professional working proficiency' },
    { language: 'Russian', level: 'Native' },
    { language: 'Ukrainian', level: 'Native' },
    {
      language: 'German',
      level: 'A2/B1',
      notes: 'Learning — see language risk notes',
    },
  ],
  links: [],
  volunteering: [],
};
