import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyEntry } from '../entries/entities/weekly-entry.entity';
import { Readable } from 'stream';

export interface ReportFilters {
  from: string;
  to: string;
  circleId?: string;
  userId?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(WeeklyEntry)
    private readonly entriesRepository: Repository<WeeklyEntry>,
  ) {}

  async generateCsvStream(filters: ReportFilters): Promise<Readable> {
    const queryBuilder = this.entriesRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('entry.circle', 'circle')
      .where('entry.weekStartDate >= :from', { from: filters.from })
      .andWhere('entry.weekStartDate <= :to', { to: filters.to });

    if (filters.circleId) {
      queryBuilder.andWhere('entry.circleId = :circleId', { circleId: filters.circleId });
    }

    if (filters.userId) {
      queryBuilder.andWhere('entry.userId = :userId', { userId: filters.userId });
    }

    queryBuilder.orderBy('entry.weekStartDate', 'ASC').addOrderBy('user.name', 'ASC');

    const entries = await queryBuilder.getMany();

    // Create CSV stream
    const stream = new Readable({
      read() {},
    });

    // Write header
    const headers = [
      'User ID',
      'User Name',
      'User Email',
      'Circle',
      'Week Start',
      'Hours',
      'Description',
      'Zero Hours Reason',
      'Created At',
    ];
    stream.push(headers.join(',') + '\n');

    // Write data rows
    for (const entry of entries) {
      const row = [
        entry.userId,
        this.escapeCsvValue(entry.user?.name || ''),
        entry.user?.email || '',
        this.escapeCsvValue(entry.circle?.name || ''),
        entry.weekStartDate,
        entry.hours.toString(),
        this.escapeCsvValue(entry.description),
        this.escapeCsvValue(entry.zeroHoursReason || ''),
        entry.createdAt.toISOString(),
      ];
      stream.push(row.join(',') + '\n');
    }

    // End stream
    stream.push(null);

    return stream;
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  async getReportData(filters: ReportFilters): Promise<any[]> {
    const queryBuilder = this.entriesRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('entry.circle', 'circle')
      .where('entry.weekStartDate >= :from', { from: filters.from })
      .andWhere('entry.weekStartDate <= :to', { to: filters.to });

    if (filters.circleId) {
      queryBuilder.andWhere('entry.circleId = :circleId', { circleId: filters.circleId });
    }

    if (filters.userId) {
      queryBuilder.andWhere('entry.userId = :userId', { userId: filters.userId });
    }

    const entries = await queryBuilder
      .orderBy('entry.weekStartDate', 'ASC')
      .addOrderBy('user.name', 'ASC')
      .getMany();

    return entries.map((entry) => ({
      userId: entry.userId,
      userName: entry.user?.name,
      userEmail: entry.user?.email,
      circleName: entry.circle?.name,
      weekStartDate: entry.weekStartDate,
      hours: Number(entry.hours),
      description: entry.description,
      zeroHoursReason: entry.zeroHoursReason,
      createdAt: entry.createdAt,
    }));
  }
}
