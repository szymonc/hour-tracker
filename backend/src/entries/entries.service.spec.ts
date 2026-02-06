import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { EntriesService, WeeklyStatus } from './entries.service';
import { WeeklyEntry } from './entities/weekly-entry.entity';
import { CircleMembership } from '../circles/entities/circle-membership.entity';
import { DateUtils } from '../common/utils/date.utils';

describe('EntriesService', () => {
  let service: EntriesService;
  let entriesRepository: any;
  let membershipsRepository: any;
  let dateUtils: any;

  const mockCircle = { id: 'circle-1', name: 'Infrastructure' };

  const mockEntry: Partial<WeeklyEntry> = {
    id: 'entry-1',
    userId: 'user-1',
    circleId: 'circle-1',
    weekStartDate: '2024-01-15',
    hours: 1.5,
    description: 'Test work',
    zeroHoursReason: null,
    circle: mockCircle as any,
  };

  const mockMembership: Partial<CircleMembership> = {
    id: 'membership-1',
    userId: 'user-1',
    circleId: 'circle-1',
    isActive: true,
  };

  beforeEach(async () => {
    const mockEntriesRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    };

    const mockMembershipsRepository = {
      findOne: jest.fn(),
    };

    const mockDateUtils = {
      getWeekStartDate: jest.fn((date) => '2024-01-15'),
      getWeekEndDate: jest.fn((date) => '2024-01-21'),
      getLastNWeekStarts: jest.fn((n) => ['2024-01-15', '2024-01-08', '2024-01-01'].slice(0, n)),
      getCurrentMonth: jest.fn(() => '2024-01'),
      getMonthWeekRange: jest.fn(() => ({
        start: '2024-01-01',
        end: '2024-01-29',
        weeksInMonth: 5,
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntriesService,
        {
          provide: getRepositoryToken(WeeklyEntry),
          useValue: mockEntriesRepository,
        },
        {
          provide: getRepositoryToken(CircleMembership),
          useValue: mockMembershipsRepository,
        },
        {
          provide: DateUtils,
          useValue: mockDateUtils,
        },
      ],
    }).compile();

    service = module.get<EntriesService>(EntriesService);
    entriesRepository = module.get(getRepositoryToken(WeeklyEntry));
    membershipsRepository = module.get(getRepositoryToken(CircleMembership));
    dateUtils = module.get(DateUtils);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEntry', () => {
    const createDto = {
      date: '2024-01-17',
      circleId: 'circle-1',
      hours: 1.5,
      description: 'Test work',
    };

    it('should create an entry successfully', async () => {
      membershipsRepository.findOne.mockResolvedValue(mockMembership);
      entriesRepository.create.mockReturnValue(mockEntry);
      entriesRepository.save.mockResolvedValue(mockEntry);

      const result = await service.createEntry('user-1', createDto);

      expect(result).toEqual(mockEntry);
      expect(dateUtils.getWeekStartDate).toHaveBeenCalledWith(createDto.date);
      expect(entriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          circleId: createDto.circleId,
          weekStartDate: '2024-01-15',
          hours: createDto.hours,
          description: createDto.description,
        }),
      );
    });

    it('should throw ForbiddenException if user is not a member of the circle', async () => {
      membershipsRepository.findOne.mockResolvedValue(null);

      await expect(service.createEntry('user-1', createDto)).rejects.toThrow(ForbiddenException);
      await expect(service.createEntry('user-1', createDto)).rejects.toThrow(
        'You are not a member of this circle',
      );
    });

    it('should throw BadRequestException if hours is 0 without reason', async () => {
      membershipsRepository.findOne.mockResolvedValue(mockMembership);

      const zeroHoursDto = { ...createDto, hours: 0 };
      await expect(service.createEntry('user-1', zeroHoursDto)).rejects.toThrow(BadRequestException);
      await expect(service.createEntry('user-1', zeroHoursDto)).rejects.toThrow(
        'A reason is required when logging 0 hours',
      );
    });

    it('should allow 0 hours with a valid reason', async () => {
      membershipsRepository.findOne.mockResolvedValue(mockMembership);
      const entryWithReason = {
        ...mockEntry,
        hours: 0,
        zeroHoursReason: 'On vacation',
      };
      entriesRepository.create.mockReturnValue(entryWithReason);
      entriesRepository.save.mockResolvedValue(entryWithReason);

      const zeroHoursDto = {
        ...createDto,
        hours: 0,
        zeroHoursReason: 'On vacation',
      };

      const result = await service.createEntry('user-1', zeroHoursDto);

      expect(result.hours).toBe(0);
      expect(result.zeroHoursReason).toBe('On vacation');
    });

    it('should set zeroHoursReason to null if hours > 0', async () => {
      membershipsRepository.findOne.mockResolvedValue(mockMembership);
      entriesRepository.create.mockReturnValue(mockEntry);
      entriesRepository.save.mockResolvedValue(mockEntry);

      const dtoWithUnneededReason = {
        ...createDto,
        hours: 1.5,
        zeroHoursReason: 'Some reason',
      };

      await service.createEntry('user-1', dtoWithUnneededReason);

      expect(entriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          zeroHoursReason: null,
        }),
      );
    });
  });

  describe('getEntriesForUser', () => {
    it('should return paginated entries', async () => {
      const mockEntries = [mockEntry, { ...mockEntry, id: 'entry-2' }];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockEntries, 2]),
      };
      entriesRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getEntriesForUser('user-1', { page: 1, pageSize: 20 });

      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should apply filters', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      entriesRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getEntriesForUser('user-1', {
        from: '2024-01-01',
        to: '2024-01-31',
        circleId: 'circle-1',
        weekStart: '2024-01-15',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
    });

    it('should limit pageSize to 100', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      entriesRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getEntriesForUser('user-1', { pageSize: 500 });

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
    });
  });

  describe('getWeeklySummary', () => {
    it('should return weekly summaries for specified weeks', async () => {
      entriesRepository.find.mockResolvedValue([mockEntry]);

      const result = await service.getWeeklySummary('user-1', 3);

      expect(result).toHaveLength(3);
      expect(dateUtils.getLastNWeekStarts).toHaveBeenCalledWith(3);
    });

    it('should compute correct status for each week', async () => {
      // Week with entries meeting target
      entriesRepository.find.mockResolvedValueOnce([
        { ...mockEntry, hours: 2.5 },
      ]);
      // Week with no entries
      entriesRepository.find.mockResolvedValueOnce([]);

      const result = await service.getWeeklySummary('user-1', 2);

      expect(result[0].status).toBe(WeeklyStatus.MET);
      expect(result[1].status).toBe(WeeklyStatus.MISSING);
    });

    it('should group hours by circle', async () => {
      const circle2 = { id: 'circle-2', name: 'General' };
      entriesRepository.find.mockResolvedValue([
        { ...mockEntry, hours: 1 },
        { ...mockEntry, id: 'entry-2', circleId: 'circle-2', hours: 1.5, circle: circle2 },
      ]);

      const result = await service.getWeeklySummary('user-1', 1);

      expect(result[0].byCircle).toHaveLength(2);
      expect(result[0].totalHours).toBe(2.5);
    });
  });

  describe('getWeeklyStatusForUser', () => {
    it('should return MISSING for no entries', async () => {
      entriesRepository.find.mockResolvedValue([]);

      const result = await service.getWeeklyStatusForUser('user-1', '2024-01-15');

      expect(result).toBe(WeeklyStatus.MISSING);
    });

    it('should return ZERO_REASON for 0 hours with reason', async () => {
      entriesRepository.find.mockResolvedValue([
        { ...mockEntry, hours: 0, zeroHoursReason: 'On vacation' },
      ]);

      const result = await service.getWeeklyStatusForUser('user-1', '2024-01-15');

      expect(result).toBe(WeeklyStatus.ZERO_REASON);
    });

    it('should return MISSING for 0 hours without reason', async () => {
      entriesRepository.find.mockResolvedValue([
        { ...mockEntry, hours: 0, zeroHoursReason: null },
      ]);

      const result = await service.getWeeklyStatusForUser('user-1', '2024-01-15');

      expect(result).toBe(WeeklyStatus.MISSING);
    });

    it('should return UNDER_TARGET for 0 < hours < 2', async () => {
      entriesRepository.find.mockResolvedValue([
        { ...mockEntry, hours: 1.5 },
      ]);

      const result = await service.getWeeklyStatusForUser('user-1', '2024-01-15');

      expect(result).toBe(WeeklyStatus.UNDER_TARGET);
    });

    it('should return MET for hours >= 2', async () => {
      entriesRepository.find.mockResolvedValue([
        { ...mockEntry, hours: 1 },
        { ...mockEntry, id: 'entry-2', hours: 1 },
      ]);

      const result = await service.getWeeklyStatusForUser('user-1', '2024-01-15');

      expect(result).toBe(WeeklyStatus.MET);
    });

    it('should return MET for hours exactly 2', async () => {
      entriesRepository.find.mockResolvedValue([
        { ...mockEntry, hours: 2 },
      ]);

      const result = await service.getWeeklyStatusForUser('user-1', '2024-01-15');

      expect(result).toBe(WeeklyStatus.MET);
    });
  });

  describe('getEntryById', () => {
    it('should return entry if found', async () => {
      entriesRepository.findOne.mockResolvedValue(mockEntry);

      const result = await service.getEntryById('entry-1');

      expect(result).toEqual(mockEntry);
    });

    it('should throw NotFoundException if entry not found', async () => {
      entriesRepository.findOne.mockResolvedValue(null);

      await expect(service.getEntryById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if userId does not match', async () => {
      entriesRepository.findOne.mockResolvedValue(mockEntry);

      await expect(service.getEntryById('entry-1', 'different-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow access if userId matches', async () => {
      entriesRepository.findOne.mockResolvedValue(mockEntry);

      const result = await service.getEntryById('entry-1', 'user-1');

      expect(result).toEqual(mockEntry);
    });
  });

  describe('getMonthlySummary', () => {
    it('should return monthly summary with correct structure', async () => {
      entriesRepository.find.mockResolvedValue([
        { ...mockEntry, hours: 2 },
      ]);

      const result = await service.getMonthlySummary('user-1', '2024-01');

      expect(result.month).toBe('2024-01');
      expect(result.weeklyTarget).toBe(2);
      expect(result.weeksInMonth).toBe(5);
      expect(result.expectedHours).toBe(10);
      expect(result.byCircle).toBeDefined();
      expect(result.weeklyBreakdown).toBeDefined();
    });

    it('should use current month if none specified', async () => {
      entriesRepository.find.mockResolvedValue([]);

      await service.getMonthlySummary('user-1');

      expect(dateUtils.getCurrentMonth).toHaveBeenCalled();
    });

    it('should compute MET status if total >= expected', async () => {
      entriesRepository.find.mockResolvedValue([
        { ...mockEntry, hours: 10 },
      ]);

      const result = await service.getMonthlySummary('user-1', '2024-01');

      expect(result.status).toBe(WeeklyStatus.MET);
    });

    it('should compute UNDER_TARGET status if total < expected', async () => {
      entriesRepository.find.mockResolvedValue([
        { ...mockEntry, hours: 5 },
      ]);

      const result = await service.getMonthlySummary('user-1', '2024-01');

      expect(result.status).toBe(WeeklyStatus.UNDER_TARGET);
    });
  });
});
