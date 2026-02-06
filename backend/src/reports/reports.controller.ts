import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Admin Reports')
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('csv')
  @ApiOperation({ summary: 'Download CSV report' })
  @ApiQuery({ name: 'from', required: true, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'to', required: true, type: String, example: '2024-01-31' })
  @ApiQuery({ name: 'circleId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async downloadCsv(
    @Res() response: Response,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('circleId') circleId?: string,
    @Query('userId') userId?: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('from and to dates are required');
    }

    const filename = `hours-report-${from}-${to}.csv`;

    response.setHeader('Content-Type', 'text/csv');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const stream = await this.reportsService.generateCsvStream({
      from,
      to,
      circleId,
      userId,
    });

    stream.pipe(response);
  }
}
