import { NotFoundException } from '@nestjs/common';
import { AnalysisStrategy } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Prompt1Service } from '../prompt1/prompt1.service';
import { AnalysisSelectorService } from './analysis-selector.service';
import { ExperimentalAnalysisService } from './experimental-analysis.service';

describe('AnalysisSelectorService', () => {
  let findUnique: jest.Mock;
  let legacy: { runAnalysis: jest.Mock };
  let experimental: { runAnalysis: jest.Mock };
  let selector: AnalysisSelectorService;

  beforeEach(() => {
    findUnique = jest.fn();
    legacy = { runAnalysis: jest.fn().mockResolvedValue({ success: true }) };
    experimental = {
      runAnalysis: jest.fn().mockResolvedValue({ success: true, stages: [] }),
    };
    selector = new AnalysisSelectorService(
      { applicationWorkspace: { findUnique } } as unknown as PrismaService,
      legacy as unknown as Prompt1Service,
      experimental as unknown as ExperimentalAnalysisService,
    );
  });

  it('routes a legacy workspace to the legacy Prompt 1 path', async () => {
    findUnique.mockResolvedValue({ analysisStrategy: AnalysisStrategy.legacy });

    const result = await selector.runAnalysis('ws-legacy');

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'ws-legacy' },
      select: { analysisStrategy: true },
    });
    expect(legacy.runAnalysis).toHaveBeenCalledWith('ws-legacy');
    expect(experimental.runAnalysis).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('routes b and c to the experimental runner', async () => {
    for (const strategy of [AnalysisStrategy.b, AnalysisStrategy.c]) {
      findUnique.mockResolvedValueOnce({ analysisStrategy: strategy });
      await selector.runAnalysis(`ws-${strategy}`);
    }

    expect(experimental.runAnalysis.mock.calls).toEqual([['ws-b'], ['ws-c']]);
    expect(legacy.runAnalysis).not.toHaveBeenCalled();
  });

  it('runs nothing for an unknown workspace', async () => {
    findUnique.mockResolvedValue(null);

    await expect(selector.runAnalysis('ws-missing')).rejects.toThrow(
      NotFoundException,
    );
    expect(legacy.runAnalysis).not.toHaveBeenCalled();
    expect(experimental.runAnalysis).not.toHaveBeenCalled();
  });
});
