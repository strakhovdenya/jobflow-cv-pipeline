import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AI_STEPS, AiStepJobData, AiStepJobSummary } from './ai-step.types';
import { QueueName } from './queue.constants';
import { JobStatusResult, QueueService } from './queue.service';

const OPEN_JOB_STATES: ReadonlySet<string> = new Set([
  'waiting',
  'active',
  'delayed',
  'prioritized',
  'waiting-children',
]);

// One job id per workspace + step: BullMQ never holds two jobs with the same id, so two parallel
// requests for the same step cannot both be queued (a read-then-add check could not guarantee it).
// A separator other than ':' is required — BullMQ rejects it in custom job ids.
const buildJobId = (step: AiStepJobData['step'], workspaceId: string) =>
  `${step}-${workspaceId}`;

@Injectable()
export class AiStepsService {
  constructor(
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  async enqueue(
    step: AiStepJobData['step'],
    workspaceId: string,
    notes?: string,
  ): Promise<{ jobId: string }> {
    await this.assertWorkspaceExists(workspaceId);

    const jobId = buildJobId(step, workspaceId);
    const previous = await this.queueService.getStatus(
      QueueName.AI_STEP,
      jobId,
    );
    if (previous) {
      if (OPEN_JOB_STATES.has(previous.state)) {
        throw new ConflictException(
          `Step "${step}" is already running for workspace "${workspaceId}"`,
        );
      }
      // A finished job keeps its id until it expires; drop it so the id can be used again.
      await this.queueService.cancel(QueueName.AI_STEP, jobId);
    }

    const data: AiStepJobData = { step, workspaceId, notes };
    return this.queueService.enqueue(QueueName.AI_STEP, step, data, { jobId });
  }

  async getJob(
    workspaceId: string,
    jobId: string,
  ): Promise<JobStatusResult<AiStepJobData>> {
    const status = await this.queueService.getStatus<AiStepJobData>(
      QueueName.AI_STEP,
      jobId,
    );
    if (!status || status.data.workspaceId !== workspaceId) {
      throw new NotFoundException(
        `Job "${jobId}" not found for workspace "${workspaceId}"`,
      );
    }
    return status;
  }

  async findActiveJob(workspaceId: string): Promise<AiStepJobSummary | null> {
    const statuses = await Promise.all(
      AI_STEPS.map((step) =>
        this.queueService.getStatus<AiStepJobData>(
          QueueName.AI_STEP,
          buildJobId(step, workspaceId),
        ),
      ),
    );
    const open = statuses.find(
      (status) => status !== null && OPEN_JOB_STATES.has(status.state),
    );
    if (!open) {
      return null;
    }
    return { jobId: open.jobId, step: open.data.step, state: open.state };
  }

  private async assertWorkspaceExists(workspaceId: string): Promise<void> {
    const count = await this.prisma.applicationWorkspace.count({
      where: { id: workspaceId },
    });
    if (count === 0) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }
  }
}
