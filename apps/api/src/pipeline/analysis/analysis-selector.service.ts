import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalysisStrategy } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Prompt1Service, RunAnalysisResult } from '../prompt1/prompt1.service';
import {
  ExperimentalAnalysisResult,
  ExperimentalAnalysisService,
} from './experimental-analysis.service';

export type AnalysisRunResult = RunAnalysisResult | ExperimentalAnalysisResult;

interface AnalysisRunner {
  runAnalysis(workspaceId: string): Promise<AnalysisRunResult>;
}

// The one place that reads a workspace's analysis strategy (ADR-046 item 15, ISSUE-713 INV-4):
// legacy workspaces keep the unchanged Prompt 1 path, `b` and `c` share the experimental stage
// runner. The queue worker, the controller and the review gates never branch on the strategy.
@Injectable()
export class AnalysisSelectorService {
  private readonly runners: Readonly<Record<AnalysisStrategy, AnalysisRunner>>;

  constructor(
    private readonly prisma: PrismaService,
    legacy: Prompt1Service,
    experimental: ExperimentalAnalysisService,
  ) {
    this.runners = {
      [AnalysisStrategy.legacy]: legacy,
      [AnalysisStrategy.b]: experimental,
      [AnalysisStrategy.c]: experimental,
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
    return this.runners[workspace.analysisStrategy].runAnalysis(workspaceId);
  }
}
