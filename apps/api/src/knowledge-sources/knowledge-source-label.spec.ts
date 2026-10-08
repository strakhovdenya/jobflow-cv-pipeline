import { buildKnowledgeSourceLabel } from './knowledge-source-label';

describe('buildKnowledgeSourceLabel', () => {
  it('source label uses basename of nested path', () => {
    const label = buildKnowledgeSourceLabel(
      'tech_stack',
      '/home/os-user/knowledge/nested/tech_stack.md',
    );

    expect(label).toBe('[Source: tech_stack | tech_stack.md]');
  });

  it('keeps a bare file name unchanged', () => {
    const label = buildKnowledgeSourceLabel('cv', 'file.md');

    expect(label).toBe('[Source: cv | file.md]');
  });
});
