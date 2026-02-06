import { DateUtils } from './date.utils';

describe('DateUtils', () => {
  let dateUtils: DateUtils;

  beforeEach(() => {
    dateUtils = new DateUtils();
  });

  describe('getWeekStartDate', () => {
    it('should return Monday for a Wednesday date', () => {
      const result = dateUtils.getWeekStartDate('2024-01-17'); // Wednesday
      expect(result).toBe('2024-01-15'); // Monday
    });

    it('should return same date for a Monday', () => {
      const result = dateUtils.getWeekStartDate('2024-01-15'); // Monday
      expect(result).toBe('2024-01-15');
    });

    it('should return previous Monday for a Sunday', () => {
      const result = dateUtils.getWeekStartDate('2024-01-21'); // Sunday
      expect(result).toBe('2024-01-15'); // Previous Monday
    });

    it('should handle month boundaries', () => {
      const result = dateUtils.getWeekStartDate('2024-02-01'); // Thursday
      expect(result).toBe('2024-01-29'); // Monday of that week
    });

    it('should handle year boundaries', () => {
      const result = dateUtils.getWeekStartDate('2024-01-03'); // Wednesday
      expect(result).toBe('2024-01-01'); // Monday
    });
  });

  describe('getWeekEndDate', () => {
    it('should return Sunday for a given Monday', () => {
      const result = dateUtils.getWeekEndDate('2024-01-15');
      expect(result).toBe('2024-01-21');
    });

    it('should handle month boundaries', () => {
      const result = dateUtils.getWeekEndDate('2024-01-29');
      expect(result).toBe('2024-02-04');
    });
  });

  describe('getLastNWeekStarts', () => {
    it('should return correct number of week starts', () => {
      const result = dateUtils.getLastNWeekStarts(4);
      expect(result).toHaveLength(4);
    });

    it('should return dates in descending order (most recent first)', () => {
      const result = dateUtils.getLastNWeekStarts(3);
      const date1 = new Date(result[0]);
      const date2 = new Date(result[1]);
      const date3 = new Date(result[2]);
      expect(date1 > date2).toBe(true);
      expect(date2 > date3).toBe(true);
    });

    it('should return only Mondays', () => {
      const result = dateUtils.getLastNWeekStarts(5);
      result.forEach((dateStr) => {
        const date = new Date(dateStr);
        expect(date.getDay()).toBe(1); // Monday
      });
    });
  });

  describe('getPreviousWeekStart', () => {
    it('should return a Monday', () => {
      const result = dateUtils.getPreviousWeekStart();
      const date = new Date(result);
      expect(date.getDay()).toBe(1);
    });
  });

  describe('getCurrentMonth', () => {
    it('should return month in YYYY-MM format', () => {
      const result = dateUtils.getCurrentMonth();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('isValidMonday', () => {
    it('should return true for a Monday', () => {
      expect(dateUtils.isValidMonday('2024-01-15')).toBe(true);
    });

    it('should return false for non-Monday dates', () => {
      expect(dateUtils.isValidMonday('2024-01-16')).toBe(false); // Tuesday
      expect(dateUtils.isValidMonday('2024-01-17')).toBe(false); // Wednesday
      expect(dateUtils.isValidMonday('2024-01-21')).toBe(false); // Sunday
    });

    it('should return false for invalid date strings', () => {
      expect(dateUtils.isValidMonday('invalid')).toBe(false);
      expect(dateUtils.isValidMonday('')).toBe(false);
    });
  });

  describe('formatWeekRange', () => {
    it('should format week range within same month', () => {
      const result = dateUtils.formatWeekRange('2024-01-15');
      expect(result).toBe('Jan 15 - 21, 2024');
    });

    it('should format week range across months', () => {
      const result = dateUtils.formatWeekRange('2024-01-29');
      expect(result).toBe('Jan 29 - Feb 4, 2024');
    });
  });

  describe('getMonthWeekRange', () => {
    it('should return start and end week dates for a month', () => {
      const result = dateUtils.getMonthWeekRange('2024-01');
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
      expect(result.weeksInMonth).toBeGreaterThan(0);
    });

    it('should return weeks that are all Mondays', () => {
      const result = dateUtils.getMonthWeekRange('2024-01');
      const startDate = new Date(result.start);
      const endDate = new Date(result.end);
      expect(startDate.getDay()).toBe(1);
      expect(endDate.getDay()).toBe(1);
    });
  });
});
