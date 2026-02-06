import { Injectable } from '@nestjs/common';
import {
  startOfWeek,
  endOfWeek,
  format,
  parseISO,
  subWeeks,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

@Injectable()
export class DateUtils {
  private readonly timezone = 'Europe/Madrid';

  /**
   * Get the Monday of the week containing the given date in Europe/Madrid timezone.
   */
  getWeekStartDate(dateString: string): string {
    // Parse the input date
    const date = parseISO(dateString);

    // Convert to Madrid timezone
    const madridDate = toZonedTime(date, this.timezone);

    // Get Monday of that week (ISO week starts on Monday)
    const monday = startOfWeek(madridDate, { weekStartsOn: 1 });

    // Return as ISO date string (YYYY-MM-DD)
    return format(monday, 'yyyy-MM-dd');
  }

  /**
   * Get the Sunday of the week containing the given date.
   */
  getWeekEndDate(weekStartDate: string): string {
    const monday = parseISO(weekStartDate);
    const sunday = endOfWeek(monday, { weekStartsOn: 1 });
    return format(sunday, 'yyyy-MM-dd');
  }

  /**
   * Get the week start dates for the last N weeks (including current week).
   */
  getLastNWeekStarts(n: number): string[] {
    const now = toZonedTime(new Date(), this.timezone);
    const currentMonday = startOfWeek(now, { weekStartsOn: 1 });

    const weeks: string[] = [];
    for (let i = 0; i < n; i++) {
      const weekStart = subWeeks(currentMonday, i);
      weeks.push(format(weekStart, 'yyyy-MM-dd'));
    }

    return weeks;
  }

  /**
   * Get the previous week's Monday.
   */
  getPreviousWeekStart(): string {
    const now = toZonedTime(new Date(), this.timezone);
    const currentMonday = startOfWeek(now, { weekStartsOn: 1 });
    const previousMonday = subWeeks(currentMonday, 1);
    return format(previousMonday, 'yyyy-MM-dd');
  }

  /**
   * Get the current month in YYYY-MM format.
   */
  getCurrentMonth(): string {
    const now = toZonedTime(new Date(), this.timezone);
    return format(now, 'yyyy-MM');
  }

  /**
   * Get the previous month in YYYY-MM format.
   */
  getPreviousMonth(): string {
    const now = toZonedTime(new Date(), this.timezone);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return format(previousMonth, 'yyyy-MM');
  }

  /**
   * Get week range for a month.
   */
  getMonthWeekRange(month: string): {
    start: string;
    end: string;
    weeksInMonth: number;
  } {
    const monthDate = parseISO(`${month}-01`);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    // Get all week starts that fall within or overlap the month
    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 },
    );

    return {
      start: format(weeks[0], 'yyyy-MM-dd'),
      end: format(weeks[weeks.length - 1], 'yyyy-MM-dd'),
      weeksInMonth: weeks.length,
    };
  }

  /**
   * Check if a date is a valid Monday.
   */
  isValidMonday(dateString: string): boolean {
    try {
      const date = parseISO(dateString);
      return date.getDay() === 1; // 1 = Monday
    } catch {
      return false;
    }
  }

  /**
   * Format week range for display (e.g., "Jan 15 - 21, 2024").
   */
  formatWeekRange(weekStartDate: string): string {
    const monday = parseISO(weekStartDate);
    const sunday = endOfWeek(monday, { weekStartsOn: 1 });

    const startMonth = format(monday, 'MMM');
    const startDay = format(monday, 'd');
    const endDay = format(sunday, 'd');
    const year = format(monday, 'yyyy');

    const endMonth = format(sunday, 'MMM');

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }

    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }

  /**
   * Get current timestamp in Madrid timezone.
   */
  getMadridNow(): Date {
    return toZonedTime(new Date(), this.timezone);
  }

  /**
   * Check if current time in Madrid matches the cron schedule for reminders.
   * Reminders run at 07:00 Madrid time on Mondays.
   */
  isReminderTime(): boolean {
    const now = this.getMadridNow();
    return now.getDay() === 1 && now.getHours() === 7;
  }
}
