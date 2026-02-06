import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsString,
  MaxLength,
  MinLength,
  IsDateString,
  ValidateIf,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEntryDto {
  @ApiProperty({
    description: 'Any date within the target week. Server computes weekStartDate.',
    example: '2024-01-17',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: 'The circle to log hours against',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  circleId: string;

  @ApiProperty({
    description: 'Number of hours worked (0-99.99)',
    example: 1.5,
    minimum: 0,
    maximum: 99.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99.99)
  @Transform(({ value }) => parseFloat(value))
  hours: number;

  @ApiProperty({
    description: 'Description of work done',
    example: 'Fixed networking issues in the library',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Required when hours is 0. Reason for zero contribution.',
    example: 'On vacation this week',
    minLength: 1,
    maxLength: 500,
  })
  @ValidateIf((o) => o.hours === 0)
  @IsString()
  @MinLength(1, { message: 'A reason is required when logging 0 hours' })
  @MaxLength(500)
  @IsOptional()
  zeroHoursReason?: string;
}
