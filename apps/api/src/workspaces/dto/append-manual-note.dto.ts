import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export const MANUAL_NOTE_MAX_LENGTH = 2000;

export class AppendManualNoteDto {
  @ApiProperty({
    description:
      'Free-text note text; stored as a new, separately-timestamped ManualNote row for the workspace',
    maxLength: MANUAL_NOTE_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MANUAL_NOTE_MAX_LENGTH)
  @Matches(/\S/, { message: 'note must not be empty or whitespace only' })
  note!: string;
}
