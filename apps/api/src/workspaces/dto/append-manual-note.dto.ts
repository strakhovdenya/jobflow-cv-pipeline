import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class AppendManualNoteDto {
  @ApiProperty({
    description:
      'Free-text note text; stored as a new, separately-timestamped ManualNote row for the workspace',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'note must not be empty or whitespace only' })
  note!: string;
}
