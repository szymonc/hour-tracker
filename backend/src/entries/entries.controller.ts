import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { EntryFiltersDto } from './dto/entry-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('User Entries')
@Controller('me/entries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new hours entry' })
  @ApiResponse({ status: 201, description: 'Entry created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Not a member of the circle' })
  async createEntry(
    @CurrentUser() user: User,
    @Body() createEntryDto: CreateEntryDto,
  ) {
    const entry = await this.entriesService.createEntry(user.id, createEntryDto);
    return {
      id: entry.id,
      userId: entry.userId,
      circleId: entry.circleId,
      weekStartDate: entry.weekStartDate,
      hours: Number(entry.hours),
      description: entry.description,
      zeroHoursReason: entry.zeroHoursReason,
      createdAt: entry.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user entries with filters' })
  @ApiResponse({ status: 200, description: 'Returns paginated entries' })
  async getEntries(
    @CurrentUser() user: User,
    @Query() filters: EntryFiltersDto,
  ) {
    const { entries, total } = await this.entriesService.getEntriesForUser(
      user.id,
      filters,
    );

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        circleId: entry.circleId,
        circleName: entry.circle?.name,
        weekStartDate: entry.weekStartDate,
        hours: Number(entry.hours),
        description: entry.description,
        zeroHoursReason: entry.zeroHoursReason,
        createdAt: entry.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get weekly summary for last N weeks' })
  @ApiQuery({ name: 'weeks', required: false, type: Number, example: 4 })
  @ApiResponse({ status: 200, description: 'Returns weekly summaries' })
  async getWeeklySummary(
    @CurrentUser() user: User,
    @Query('weeks') weeks?: number,
  ) {
    const summaries = await this.entriesService.getWeeklySummary(
      user.id,
      Math.min(weeks || 4, 52),
    );

    const periodTotalHours = summaries.reduce((sum, s) => sum + s.totalHours, 0);

    return {
      weeks: summaries,
      target: 2,
      periodTotalHours,
    };
  }

  @Get('monthly-summary')
  @ApiOperation({ summary: 'Get monthly summary' })
  @ApiQuery({ name: 'month', required: false, type: String, example: '2024-01' })
  @ApiResponse({ status: 200, description: 'Returns monthly summary' })
  async getMonthlySummary(
    @CurrentUser() user: User,
    @Query('month') month?: string,
  ) {
    return this.entriesService.getMonthlySummary(user.id, month);
  }
}
