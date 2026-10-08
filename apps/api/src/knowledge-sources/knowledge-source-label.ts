import * as path from 'path';

export const buildKnowledgeSourceLabel = (
  sourceType: string,
  filePath: string,
): string => `[Source: ${sourceType} | ${path.basename(filePath)}]`;
