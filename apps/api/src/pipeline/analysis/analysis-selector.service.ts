import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalysisStrategy } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Prompt1Service, RunAnalysisResult } from '../prompt1/prompt1.service';
import { stagesOf } from './analysis-stages';
import {
  ExperimentalAnalysisResult,
  ExperimentalAnalysisService,
} from './experimental-analysis.service';

export type AnalysisRunResult = RunAnalysisResult | ExperimentalAnalysisResult;

type AnalysisRunner = (workspaceId: string) => Promise<AnalysisRunResult>;

// The one place that reads a workspace's analysis strategy (ADR-046 item 15, ISSUE-713 INV-4):
// legacy workspaces keep the unchanged Prompt 1 path, `b` and `c` share the experimental stage
// runner, which receives its stage plan from here and never reads the strategy itself. The queue
// worker, the controller and the review gates never branch on the strategy.
@Injectable()
export class AnalysisSelectorService {
  private readonly runners: Readonly<Record<AnalysisStrategy, AnalysisRunner>>;

  constructor(
    private readonly prisma: PrismaService,
    legacy: Prompt1Service,
    experimental: ExperimentalAnalysisService,
  ) {
    this.runners = {
      [AnalysisStrategy.legacy]: (workspaceId) =>
        legacy.runAnalysis(workspaceId),
      [AnalysisStrategy.b]: (workspaceId) =>
        experimental.runAnalysis(workspaceId, stagesOf('b')),
      [AnalysisStrategy.c]: (workspaceId) =>
        experimental.runAnalysis(workspaceId, stagesOf('c')),
    };
  }

  async runAnalysis(workspaceId: string): Promise<AnalysisRunResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
      select: { analysisStrategy: true },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }
    return this.runners[workspace.analysisStrategy](workspaceId);
  }
}
