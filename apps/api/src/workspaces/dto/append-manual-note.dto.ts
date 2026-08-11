import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class AppendManualNoteDto {
  @ApiProperty({
    description:
      'Free-text note to append (timestamped) to the workspace manual note log',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'note must not be empty or whitespace only' })
  note!: string;
}
