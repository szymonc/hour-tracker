import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WeeklyEntry } from './entities/weekly-entry.entity';
import { CircleMembership } from '../circles/entities/circle-membership.entity';
import { CreateEntryDto } from './dto/create-entry.dto';
import { EntryFiltersDto } from './dto/entry-filters.dto';
import { DateUtils } from '../common/utils/date.utils';

export enum WeeklyStatus {
  MISSING = 'missing',
  ZERO_REASON = 'zero_reason',
  UNDER_TARGET = 'under_target',
  MET = 'met',
}

export interface WeeklySummary {
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  entryCount: number;
  status: WeeklyStatus;
  byCircle: Array<{ circleId: string; circleName: string; hours: number }>;
}

@Injectable()
export class EntriesService {
  private readonly TARGET_HOURS = 2;

  constructor(
    @InjectRepository(WeeklyEntry)
    private readonly entriesRepository: Repository<WeeklyEntry>,
    @InjectRepository(CircleMembership)
    private readonly membershipsRepository: Repository<CircleMembership>,
    private readonly dateUtils: DateUtils,
  ) {}

  async createEntry(userId: string, dto: CreateEntryDto): Promise<WeeklyEntry> {
    // Validate circle membership
    const membership = await this.membershipsRepository.findOne({
      where: { userId, circleId: dto.circleId, isActive: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this circle');
    }

    // Validate zero hours requires reason
    if (dto.hours === 0 && !dto.zeroHoursReason) {
      throw new BadRequestException('A reason is required when logging 0 hours');
    }

    // Compute week start date server-side
    const weekStartDate = this.dateUtils.getWeekStartDate(dto.date);

    const entry = this.entriesRepository.create({
      userId,
      circleId: dto.circleId,
      weekStartDate,
      hours: dto.hours,
      description: dto.description,
      zeroHoursReason: dto.hours === 0 ? dto.zeroHoursReason : null,
    });

    return this.entriesRepository.save(entry);
  }

  async getEntriesForUser(
    userId: string,
    filters: EntryFiltersDto,
  ): Promise<{ entries: WeeklyEntry[]; total: number }> {
    const queryBuilder = this.entriesRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.circle', 'circle')
      .where('entry.userId = :userId', { userId });

    if (filters.from) {
      queryBuilder.andWhere('entry.weekStartDate >= :from', { from: filters.from });
    }

    if (filters.to) {
      queryBuilder.andWhere('entry.weekStartDate <= :to', { to: filters.to });
    }

    if (filters.circleId) {
      queryBuilder.andWhere('entry.circleId = :circleId', { circleId: filters.circleId });
    }

    if (filters.weekStart) {
      queryBuilder.andWhere('entry.weekStartDate = :weekStart', { weekStart: filters.weekStart });
    }

    queryBuilder.orderBy('entry.createdAt', 'DESC');

    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const [entries, total] = await queryBuilder.skip(skip).take(pageSize).getManyAndCount();

    return { entries, total };
  }

  async getWeeklySummary(userId: string, weeks: number = 4): Promise<WeeklySummary[]> {
    const weekStarts = this.dateUtils.getLastNWeekStarts(weeks);
    const summaries: WeeklySummary[] = [];

    for (const weekStartDate of weekStarts) {
      const entries = await this.entriesRepository.find({
        where: { userId, weekStartDate },
        relations: ['circle'],
      });

      const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
      const status = this.computeWeeklyStatus(entries, totalHours);
      const weekEndDate = this.dateUtils.getWeekEndDate(weekStartDate);

      const byCircle = entries.reduce(
        (acc, entry) => {
          const existing = acc.find((c) => c.circleId === entry.circleId);
          if (existing) {
            existing.hours += Number(entry.hours);
          } else {
            acc.push({
              circleId: entry.circleId,
              circleName: entry.circle.name,
              hours: Number(entry.hours),
            });
          }
          return acc;
        },
        [] as Array<{ circleId: string; circleName: string; hours: number }>,
      );

      summaries.push({
        weekStartDate,
        weekEndDate,
        totalHours,
        entryCount: entries.length,
        status,
        byCircle,
      });
    }

    return summaries;
  }

  async getMonthlySummary(userId: string, month?: string) {
    const targetMonth = month || this.dateUtils.getCurrentMonth();
    const { start, end, weeksInMonth } = this.dateUtils.getMonthWeekRange(targetMonth);

    const entries = await this.entriesRepository.find({
      where: {
        userId,
        weekStartDate: Between(start, end),
      },
      relations: ['circle'],
    });

    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
    const expectedHours = weeksInMonth * this.TARGET_HOURS;

    // Group by week
    const byWeek = new Map<string, WeeklyEntry[]>();
    entries.forEach((entry) => {
      const week = entry.weekStartDate;
      if (!byWeek.has(week)) {
        byWeek.set(week, []);
      }
      byWeek.get(week)!.push(entry);
    });

    // Compute weekly breakdown
    const weeklyBreakdown = Array.from(byWeek.entries()).map(([weekStart, weekEntries]) => {
      const hours = weekEntries.reduce((sum, e) => sum + Number(e.hours), 0);
      return {
        weekStartDate: weekStart,
        hours,
        status: this.computeWeeklyStatus(weekEntries, hours),
      };
    });

    // Group by circle
    const byCircle = entries.reduce(
      (acc, entry) => {
        const existing = acc.find((c) => c.circleId === entry.circleId);
        if (existing) {
          existing.hours += Number(entry.hours);
        } else {
          acc.push({
            circleId: entry.circleId,
            circleName: entry.circle.name,
            hours: Number(entry.hours),
          });
        }
        return acc;
      },
      [] as Array<{ circleId: string; circleName: string; hours: number }>,
    );

    return {
      month: targetMonth,
      totalHours,
      weeklyTarget: this.TARGET_HOURS,
      weeksInMonth,
      expectedHours,
      status: totalHours >= expectedHours ? WeeklyStatus.MET : WeeklyStatus.UNDER_TARGET,
      byCircle,
      weeklyBreakdown,
    };
  }

  async getWeeklyStatusForUser(userId: string, weekStartDate: string): Promise<WeeklyStatus> {
    const entries = await this.entriesRepository.find({
      where: { userId, weekStartDate },
    });

    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
    return this.computeWeeklyStatus(entries, totalHours);
  }

  private computeWeeklyStatus(entries: WeeklyEntry[], totalHours: number): WeeklyStatus {
    if (entries.length === 0) {
      return WeeklyStatus.MISSING;
    }

    const hasZeroReason = entries.some((e) => Number(e.hours) === 0 && e.zeroHoursReason);

    if (totalHours === 0) {
      return hasZeroReason ? WeeklyStatus.ZERO_REASON : WeeklyStatus.MISSING;
    }

    if (totalHours < this.TARGET_HOURS) {
      return WeeklyStatus.UNDER_TARGET;
    }

    return WeeklyStatus.MET;
  }

  async getEntryById(id: string, userId?: string): Promise<WeeklyEntry> {
    const entry = await this.entriesRepository.findOne({
      where: { id },
      relations: ['circle', 'user'],
    });

    if (!entry) {
      throw new NotFoundException('Entry not found');
    }

    if (userId && entry.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return entry;
  }
}
