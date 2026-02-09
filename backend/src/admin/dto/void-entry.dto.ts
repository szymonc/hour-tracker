import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class VoidEntryDto {
  @ApiProperty({
    description: 'Reason for voiding this entry',
    example: 'Duplicate entry — correcting hours',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  reason: string;
}
