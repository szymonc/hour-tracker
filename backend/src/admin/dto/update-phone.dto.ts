import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, IsNotEmpty } from 'class-validator';

export class UpdatePhoneDto {
  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+34612345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +34612345678)',
  })
  phoneNumber: string;
}
