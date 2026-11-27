import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AnalysisStrategy,
  ContextLayout,
  ContextSourceSet,
  WorkspaceStatus,
} from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

// A source fork (ADR-046 item 8, ISSUE-716): a new workspace of the same vacancy with its own
// strategy and context profile. Nothing runs after it until the owner starts a step.
export class ForkWorkspaceDto {
  @ApiProperty({
    description: 'Analysis strategy of the fork',
    enum: AnalysisStrategy,
  })
  @IsEnum(AnalysisStrategy)
  analysisStrategy!: AnalysisStrategy;

  @ApiPropertyOptional({
    description:
      'Request layout of the experimental X2 / B stage (default single); a legacy analysis does not read it',
    enum: ContextLayout,
    default: ContextLayout.single,
  })
  @IsOptional()
  @IsEnum(ContextLayout)
  contextLayout?: ContextLayout;

  @ApiPropertyOptional({
    description:
      'Knowledge-source set of the experimental X2 / B stage (default full); a legacy analysis does not read it',
    enum: ContextSourceSet,
    default: ContextSourceSet.full,
  })
  @IsOptional()
  @IsEnum(ContextSourceSet)
  contextSourceSet?: ContextSourceSet;

  @ApiPropertyOptional({
    description:
      'Strategy c only: carry over the source’s frozen 01a requirements, so the fork’s X1 is reused instead of run again (factor runs)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  carryOverRequirements?: boolean;

  @ApiPropertyOptional({
    description:
      'Client key of this request (UUID). A repeated request with the same source and key returns the fork the first one created; the same key with other options is a 409',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  requestKey?: string;
}

export class ForkWorkspaceResultDto {
  @ApiProperty({ description: 'Id of the fork workspace' })
  id!: string;

  @ApiProperty({
    description:
      'false when a repeated request key returned the fork an earlier request created',
  })
  isNew!: boolean;

  @ApiProperty({ enum: WorkspaceStatus, description: 'Status of the fork' })
  status!: WorkspaceStatus;

  @ApiProperty({ description: 'Workspace slug of the fork' })
  workspaceSlug!: string;

  @ApiProperty({ description: 'Id of the workspace the fork was made from' })
  forkedFromWorkspaceId!: string;

  @ApiProperty({ description: 'Comparison group of the fork and its source' })
  comparisonGroupId!: string;

  @ApiProperty({ enum: AnalysisStrategy })
  analysisStrategy!: AnalysisStrategy;

  @ApiProperty({ enum: ContextLayout })
  contextLayout!: ContextLayout;

  @ApiProperty({ enum: ContextSourceSet })
  contextSourceSet!: ContextSourceSet;

  @ApiProperty({
    description: 'true when the fork holds the source’s carried-over 01a',
  })
  carryOverRequirements!: boolean;

  @ApiPropertyOptional({
    description: 'The request key of the fork request, if one was sent',
    type: String,
    nullable: true,
  })
  requestKey!: string | null;

  @ApiProperty({ description: 'sha256 of the fork’s 00_vacancy_source.txt' })
  vacancyTextHash!: string;

  @ApiProperty()
  createdAt!: Date;
}
