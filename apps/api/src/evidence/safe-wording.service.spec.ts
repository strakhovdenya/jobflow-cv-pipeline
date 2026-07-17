import { EvidenceItem } from '@prisma/client';
import { SafeWordingService } from './safe-wording.service';

const makeItem = (claimArea: string, category: string): EvidenceItem => ({
  id: `ei-${claimArea}`,
  claimArea,
  category,
  description: `Description for ${claimArea}`,
  notes: null,
  createdAt: new Date('2026-06-30T10:00:00Z'),
  updatedAt: new Date('2026-06-30T10:00:00Z'),
});

describe('SafeWordingService', () => {
  let service: SafeWordingService;

  beforeEach(() => {
    service = new SafeWordingService();
  });

  it('suggests commercial-preserving wording for allowed claims', () => {
    const item = makeItem('Node.js', 'allowed');

    const result = service.suggest(
      'Commercial Node.js production experience',
      item,
    );

    expect(result.category).toBe('allowed');
    expect(result.suggestedWording).toContain('commercial');
    expect(result.suggestedWording).toContain('Node.js');
  });

  it('suggests personal-project wording for risky claims', () => {
    const item = makeItem('NestJS', 'risky');

    const result = service.suggest(
      'Commercial NestJS production experience',
      item,
    );

    expect(result.category).toBe('risky');
    expect(result.suggestedWording).toContain('personal project');
    expect(result.suggestedWording).toContain('do not present');
  });

  it('suggests basic-exposure wording for unsupported claims', () => {
    const item = makeItem('Kubernetes', 'unsupported');

    const result = service.suggest('Kubernetes production experience', item);

    expect(result.category).toBe('unsupported');
    expect(result.suggestedWording).toContain('basic exposure');
  });

  it('suggests needs-evidence wording when no evidence item matches', () => {
    const result = service.suggest('Some unmatched claim', null);

    expect(result.category).toBe('needs_evidence');
    expect(result.suggestedWording).toContain('no matching evidence record');
  });

  it('distinguishes commercial, personal project and basic exposure suggestions', () => {
    const allowed = service.suggest('X', makeItem('X', 'allowed'));
    const risky = service.suggest('X', makeItem('X', 'risky'));
    const unsupported = service.suggest('X', makeItem('X', 'unsupported'));

    const wordings = [
      allowed.suggestedWording,
      risky.suggestedWording,
      unsupported.suggestedWording,
    ];

    expect(new Set(wordings).size).toBe(3);
  });
});
