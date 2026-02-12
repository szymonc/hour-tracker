import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { parseISO, addDays, subDays } from 'date-fns';
import { RemindersService, ReminderTargetSummary } from './reminders.service';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(
    private readonly remindersService: RemindersService,
    private readonly adminService: AdminService,
  ) {}

  /**
   * Runs every Monday at 07:00 Europe/Madrid timezone.
   * Computes reminder targets for the previous week and sends Telegram reminders.
   * Skips users who already received a reminder within 7 days of the week's end (Sunday).
   */
  @Cron('0 7 * * 1', {
    name: 'weekly-reminder-computation',
    timeZone: 'Europe/Madrid',
  })
  async handleWeeklyReminders() {
    this.logger.log('Starting weekly reminder computation job');

    try {
      const { run, targets } = await this.remindersService.computeReminderTargets();

      this.logger.log(
        `Weekly reminder job completed. Week: ${run.weekStartDate}, Targets: ${targets.length}`,
      );

      // End of the target week (Sunday) = weekStart + 6 days
      const weekEnd = addDays(parseISO(run.weekStartDate), 6);
      // Cutoff: 7 days before end of week
      const cutoff = subDays(weekEnd, 7);

      // Filter: only send to users with Telegram who haven't been reminded recently
      const toSend = targets.filter((target) => {
        if (!target.telegramChatId) {
          return false;
        }
        if (target.lastReminderSentAt && new Date(target.lastReminderSentAt) >= cutoff) {
          this.logger.log(
            `Skipping ${target.userName}: already reminded on ${target.lastReminderSentAt}`,
          );
          return false;
        }
        return true;
      });

      this.logger.log(
        `Sending Telegram reminders to ${toSend.length} of ${targets.length} targets`,
      );

      for (const target of toSend) {
        try {
          await this.adminService.sendTelegramReminder(target.userId);
          this.logger.log(`Sent Telegram reminder to ${target.userName}`);
        } catch (error) {
          this.logger.error(
            `Failed to send Telegram reminder to ${target.userName}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Weekly reminder job failed', error);
    }
  }

  /**
   * Manual trigger for testing purposes.
   * Can be invoked via a protected admin endpoint if needed.
   */
  async triggerManualRun(weekStartDate?: string) {
    this.logger.log(`Manual reminder computation triggered for week: ${weekStartDate || 'previous'}`);
    return this.remindersService.computeReminderTargets(weekStartDate);
  }
}
