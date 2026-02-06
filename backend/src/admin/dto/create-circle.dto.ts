import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateCircleDto {
  @ApiProperty({
    description: 'Circle name',
    example: 'General',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Optional circle description',
    example: 'General circle for school-wide decisions',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
