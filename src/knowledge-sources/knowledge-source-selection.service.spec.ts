import { BadRequestException } from '@nestjs/common';
import { KnowledgeSource } from '@prisma/client';
import { KnowledgeSourceSelectionService } from './knowledge-source-selection.service';

function makeSource(
  id: string,
  sourceType: string,
  isActive = true,
): KnowledgeSource {
  return {
    id,
    sourceType,
    filePath: `/knowledge-sources/${sourceType}.md`,
    contentHash: `hash-${id}`,
    isActive,
    versionLabel: `v1-${id}`,
    importedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const ALL_SOURCES: KnowledgeSource[] = [
  makeSource('ks-master-cv', 'master_cv'),
  makeSource('ks-profile', 'profile_summary'),
  makeSource('ks-tech', 'tech_stack'),
  makeSource('ks-inventory', 'project_inventory'),
  makeSource('ks-cases', 'career_cases'),
  makeSource('ks-rules', 'cv_rules'),
  makeSource('ks-certs', 'certifications'),
  makeSource('ks-layout', 'layout'),
];

describe('KnowledgeSourceSelectionService', () => {
  let service: KnowledgeSourceSelectionService;

  beforeEach(() => {
    service = new KnowledgeSourceSelectionService();
  });

  it('selectForStep(prompt_1) returns only prompt_1 required and optional types', () => {
    const result = service.selectForStep('prompt_1', ALL_SOURCES);
    const types = result.map((s) => s.sourceType);
    expect(types).toContain('profile_summary');
    expect(types).toContain('tech_stack');
    expect(types).toContain('project_inventory');
    expect(types).toContain('career_cases');
    expect(types).toContain('cv_rules');
    expect(types).toContain('certifications'); // optional, present
  });

  it('selectForStep(prompt_2) includes master_cv which is absent from prompt_1 result', () => {
    const prompt1Result = service.selectForStep('prompt_1', ALL_SOURCES);
    const prompt2Result = service.selectForStep('prompt_2', ALL_SOURCES);

    expect(
      prompt2Result.find((s) => s.sourceType === 'master_cv'),
    ).toBeDefined();
    expect(
      prompt1Result.find((s) => s.sourceType === 'master_cv'),
    ).toBeUndefined();
  });

  it('selectForStep(prompt_1) does NOT include master_cv (prompt_2-only required)', () => {
    const result = service.selectForStep('prompt_1', ALL_SOURCES);
    expect(result.find((s) => s.sourceType === 'master_cv')).toBeUndefined();
  });

  it('throws BadRequestException for unknown step', () => {
    expect(() => service.selectForStep('prompt_99', ALL_SOURCES)).toThrow(
      BadRequestException,
    );
  });

  it('excludes isActive:false source even if sourceType matches required group (defense in depth)', () => {
    const inactiveProfile = makeSource(
      'ks-inactive-profile',
      'profile_summary',
      false,
    );
    const sourcesWithInactive = [...ALL_SOURCES, inactiveProfile];

    const result = service.selectForStep('prompt_1', sourcesWithInactive);

    expect(result.find((s) => s.id === 'ks-inactive-profile')).toBeUndefined();
    expect(result.find((s) => s.id === 'ks-profile')).toBeDefined();
  });

  it('includes optional sourceType (certifications) when present in allSources', () => {
    const result = service.selectForStep('prompt_2', ALL_SOURCES);
    expect(result.find((s) => s.sourceType === 'certifications')).toBeDefined();
  });
});
