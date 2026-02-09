import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class UpdateMembershipDto {
  @ApiPropertyOptional({
    description: 'Tracking start date (ISO 8601)',
    example: '2025-01-06',
  })
  @IsOptional()
  @IsDateString()
  trackingStartDate?: string | null;
}
