import { CandidateProfileGuardService } from './candidate-profile-guard.service';
import { CandidateProfileConfig } from './candidate-profile.config';

function makeProfile(
  overrides: Partial<CandidateProfileConfig> = {},
): CandidateProfileConfig {
  return {
    candidate: {
      name: 'Denys Strakhov',
      contact: {
        phone: '+49 160 962 77 376',
        email: 'strakhov.denya@gmail.com',
        linkedin: 'https://linkedin.com/in/denys-strakhov',
        github: 'https://github.com/strakhovdenya',
      },
      location: 'Cologne, Germany',
      work_authorization: 'Eligible to work in Germany',
    },
    education: [
      {
        institution: 'National Technical University',
        degree: 'Specialist Degree — Process Engineer',
        dates: '',
        notes: 'Department of Integral Technology and Applied Chemistry',
      },
    ],
    languages: [
      { language: 'English', level: 'B1/B1+, professional working use' },
      { language: 'German', level: 'A2/B1', notes: 'Actively improving' },
    ],
    links: [],
    volunteering: [],
    ...overrides,
  };
}

describe('CandidateProfileGuardService', () => {
  let service: CandidateProfileGuardService;

  beforeEach(() => {
    service = new CandidateProfileGuardService();
  });

  it('passes for a profile with no placeholder markers', () => {
    const result = service.check(makeProfile());

    expect(result).toEqual({ passed: true, issues: [] });
  });

  it('flags a "Placeholder" marker in an education field', () => {
    const profile = makeProfile({
      education: [
        {
          institution: 'Placeholder University',
          degree: 'Placeholder Degree',
          dates: '',
        },
      ],
    });

    const result = service.check(profile);

    expect(result.passed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain('Placeholder University');
  });

  it('flags a "TODO" marker in a language note', () => {
    const profile = makeProfile({
      languages: [{ language: 'French', level: 'TODO: confirm level' }],
    });

    const result = service.check(profile);

    expect(result.passed).toBe(false);
    expect(result.issues[0]).toContain('TODO: confirm level');
  });

  it('flags a leaked internal "see ... notes" reference', () => {
    const profile = makeProfile({
      languages: [
        {
          language: 'German',
          level: 'Learning — see language risk notes',
        },
      ],
    });

    const result = service.check(profile);

    expect(result.passed).toBe(false);
    expect(result.issues[0]).toContain('see language risk notes');
  });

  it('does not flag legitimate real-world data resembling but not matching a marker', () => {
    const profile = makeProfile({
      volunteering: [
        {
          description: 'Helped organize a local charity event',
          organization: 'XYZ Community Center',
          role: 'Volunteer coordinator',
          dates: '2024',
        },
      ],
    });

    const result = service.check(profile);

    expect(result).toEqual({ passed: true, issues: [] });
  });

  it('reports every distinct field with a placeholder marker, not just the first', () => {
    const profile = makeProfile({
      education: [
        {
          institution: 'Placeholder University',
          degree: 'Real Degree',
          dates: '',
        },
      ],
      languages: [{ language: 'French', level: 'TODO: confirm level' }],
    });

    const result = service.check(profile);

    expect(result.passed).toBe(false);
    expect(result.issues.length).toBe(2);
  });
});
