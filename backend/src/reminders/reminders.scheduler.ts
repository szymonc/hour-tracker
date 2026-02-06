import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';

@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(private readonly remindersService: RemindersService) {}

  /**
   * Runs every Monday at 07:00 Europe/Madrid timezone.
   * Computes reminder targets for the previous week.
   *
   * Note: Cron timezone is set via TZ environment variable.
   * For production, ensure TZ=Europe/Madrid is set.
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

      // Log individual targets for debugging/MVP
      targets.forEach((target) => {
        this.logger.log(
          `Reminder target: ${target.userName} (${target.userEmail}) - ` +
          `Status: ${target.status}, Hours: ${target.totalHours}, ` +
          `Phone: ${target.phoneNumber || 'N/A'}`,
        );
      });

      // TODO: Implement Telegram notification sending here
      // For MVP, we just log and store the targets

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
