import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Admin Reminders')
@Controller('admin/reminders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('weekly')
  @ApiOperation({ summary: 'Get reminder targets for a week' })
  @ApiQuery({
    name: 'weekStart',
    required: false,
    type: String,
    example: '2024-01-15',
    description: 'Week start date (Monday). Defaults to previous week.',
  })
  @ApiResponse({ status: 200, description: 'Reminder targets retrieved' })
  async getReminderTargets(@Query('weekStart') weekStart?: string) {
    return this.remindersService.getReminderTargets(weekStart);
  }
}
