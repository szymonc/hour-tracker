import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMembershipDto {
  @ApiPropertyOptional({
    description: 'The date from which to start tracking hours for this membership',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  trackingStartDate?: string;
}
