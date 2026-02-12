import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ReminderRun, ReminderRunStatus } from './entities/reminder-run.entity';
import { ReminderTarget, WeeklyStatusEnum } from './entities/reminder-target.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { WeeklyEntry } from '../entries/entities/weekly-entry.entity';
import { DateUtils } from '../common/utils/date.utils';

export interface ReminderTargetSummary {
  userId: string;
  userName: string;
  userEmail: string;
  phoneNumber: string | null;
  telegramChatId: string | null;
  lastReminderSentAt: Date | null;
  status: WeeklyStatusEnum;
  totalHours: number;
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectRepository(ReminderRun)
    private readonly reminderRunRepository: Repository<ReminderRun>,
    @InjectRepository(ReminderTarget)
    private readonly reminderTargetRepository: Repository<ReminderTarget>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(WeeklyEntry)
    private readonly entriesRepository: Repository<WeeklyEntry>,
    private readonly dateUtils: DateUtils,
  ) {}

  async computeReminderTargets(weekStartDate?: string): Promise<{
    run: ReminderRun;
    targets: ReminderTargetSummary[];
  }> {
    const targetWeek = weekStartDate || this.dateUtils.getPreviousWeekStart();

    this.logger.log(`Computing reminder targets for week: ${targetWeek}`);

    // Get all active regular users
    const activeUsers = await this.usersRepository.find({
      where: { isActive: true, role: UserRole.USER },
    });

    // Get entries for target week (exclude voided)
    const entries = await this.entriesRepository.find({
      where: { weekStartDate: targetWeek, voidedAt: IsNull() },
    });

    // Compute status for each user
    const userWeeklyData = new Map<string, { totalHours: number; hasZeroReason: boolean }>();
    entries.forEach((entry) => {
      const current = userWeeklyData.get(entry.userId) || { totalHours: 0, hasZeroReason: false };
      current.totalHours += Number(entry.hours);
      if (Number(entry.hours) === 0 && entry.zeroHoursReason) {
        current.hasZeroReason = true;
      }
      userWeeklyData.set(entry.userId, current);
    });

    // Create reminder run
    const run = this.reminderRunRepository.create({
      weekStartDate: targetWeek,
      status: ReminderRunStatus.PENDING,
    });
    await this.reminderRunRepository.save(run);

    const targets: ReminderTargetSummary[] = [];
    const reminderTargets: ReminderTarget[] = [];

    for (const user of activeUsers) {
      const data = userWeeklyData.get(user.id);
      let status: WeeklyStatusEnum;

      if (!data) {
        status = WeeklyStatusEnum.MISSING;
      } else if (data.totalHours === 0) {
        status = data.hasZeroReason ? WeeklyStatusEnum.ZERO_REASON : WeeklyStatusEnum.MISSING;
      } else if (data.totalHours < 2) {
        status = WeeklyStatusEnum.UNDER_TARGET;
      } else {
        status = WeeklyStatusEnum.MET;
      }

      // Only include missing and under_target users as reminder targets
      if (status === WeeklyStatusEnum.MISSING || status === WeeklyStatusEnum.UNDER_TARGET) {
        const target: ReminderTargetSummary = {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          phoneNumber: user.phoneNumber,
          telegramChatId: user.telegramChatId ?? null,
          lastReminderSentAt: user.lastReminderSentAt ?? null,
          status,
          totalHours: data?.totalHours || 0,
        };
        targets.push(target);

        reminderTargets.push(
          this.reminderTargetRepository.create({
            reminderRunId: run.id,
            userId: user.id,
            weeklyStatus: status,
            totalHours: data?.totalHours || 0,
          }),
        );
      }
    }

    // Save targets
    if (reminderTargets.length > 0) {
      await this.reminderTargetRepository.save(reminderTargets);
    }

    // Update run
    run.totalTargets = targets.length;
    run.status = ReminderRunStatus.COMPLETED;
    await this.reminderRunRepository.save(run);

    this.logger.log(`Created ${targets.length} reminder targets for week ${targetWeek}`);

    return { run, targets };
  }

  async getReminderTargets(weekStartDate?: string): Promise<{
    weekStartDate: string;
    generatedAt: Date | null;
    targets: ReminderTargetSummary[];
    summary: { missing: number; underTarget: number; total: number };
  }> {
    const targetWeek = weekStartDate || this.dateUtils.getPreviousWeekStart();

    // Find existing run for this week
    const existingRun = await this.reminderRunRepository.findOne({
      where: { weekStartDate: targetWeek },
      order: { runAt: 'DESC' },
    });

    if (!existingRun) {
      // Compute on demand
      const { run, targets } = await this.computeReminderTargets(targetWeek);

      return {
        weekStartDate: targetWeek,
        generatedAt: run.runAt,
        targets,
        summary: {
          missing: targets.filter((t) => t.status === WeeklyStatusEnum.MISSING).length,
          underTarget: targets.filter((t) => t.status === WeeklyStatusEnum.UNDER_TARGET).length,
          total: targets.length,
        },
      };
    }

    // Load existing targets
    const savedTargets = await this.reminderTargetRepository.find({
      where: { reminderRunId: existingRun.id },
      relations: ['user'],
    });

    const targets: ReminderTargetSummary[] = savedTargets.map((t) => ({
      userId: t.userId,
      userName: t.user?.name || '',
      userEmail: t.user?.email || '',
      phoneNumber: t.user?.phoneNumber || null,
      telegramChatId: t.user?.telegramChatId ?? null,
      lastReminderSentAt: t.user?.lastReminderSentAt ?? null,
      status: t.weeklyStatus,
      totalHours: Number(t.totalHours),
    }));

    return {
      weekStartDate: targetWeek,
      generatedAt: existingRun.runAt,
      targets,
      summary: {
        missing: targets.filter((t) => t.status === WeeklyStatusEnum.MISSING).length,
        underTarget: targets.filter((t) => t.status === WeeklyStatusEnum.UNDER_TARGET).length,
        total: targets.length,
      },
    };
  }
}
