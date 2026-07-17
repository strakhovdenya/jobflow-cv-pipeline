import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SaveRejectionTextDto {
  @ApiProperty({
    description:
      'Full rejection text (e.g. a recruiter rejection email or detailed feedback)',
  })
  @IsString()
  @IsNotEmpty()
  text!: string;
}
