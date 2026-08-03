import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerateCvContentDto {
  @ApiPropertyOptional({
    description:
      'Optional user feedback to steer a regeneration of an existing CV draft (ignored on the first generation, since no previous draft exists yet)',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
