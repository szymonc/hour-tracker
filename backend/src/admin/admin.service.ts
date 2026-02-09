import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, In, IsNull } from 'typeorm';
import { CreateCircleDto } from './dto/create-circle.dto';
import { AdminCreateEntryDto } from './dto/admin-create-entry.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Circle } from '../circles/entities/circle.entity';
import { CircleMembership } from '../circles/entities/circle-membership.entity';
import { WeeklyEntry } from '../entries/entities/weekly-entry.entity';
import { WeeklyStatus, EntriesService } from '../entries/entries.service';
import { DateUtils } from '../common/utils/date.utils';
import { AuthService } from '../auth/auth.service';
import { TelegramService } from '../telegram/telegram.service';

export interface MissingUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  telegramChatId: string | null;
  totalHours: number;
  status: WeeklyStatus;
}

export interface CircleMetric {
  circleId: string;
  circleName: string;
  totalHours: number;
  activeMemberCount: number;
  avgHoursPerMember: number;
  contributingUsers: number;
}

export interface AdminDashboard {
  recentEntries: any[];
  missingPreviousWeek: {
    weekStartDate: string;
    users: MissingUser[];
    count: number;
  };
  missingTwoWeeks: {
    weekStartDates: string[];
    users: Array<MissingUser & { consecutiveMissingWeeks: number }>;
    count: number;
  };
  statusCounts: {
    missing: number;
    zeroReason: number;
    underTarget: number;
    met: number;
  };
  circleMetrics: CircleMetric[];
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Circle)
    private readonly circlesRepository: Repository<Circle>,
    @InjectRepository(CircleMembership)
    private readonly membershipsRepository: Repository<CircleMembership>,
    @InjectRepository(WeeklyEntry)
    private readonly entriesRepository: Repository<WeeklyEntry>,
    private readonly dateUtils: DateUtils,
    private readonly entriesService: EntriesService,
    private readonly authService: AuthService,
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
  ) {}

  async getDashboard(): Promise<AdminDashboard> {
    const previousWeek = this.dateUtils.getPreviousWeekStart();
    const twoWeeksAgo = this.dateUtils.getLastNWeekStarts(3)[2]; // 2 weeks before current

    // Get recent entries (exclude voided)
    const recentEntries = await this.entriesRepository.find({
      where: { voidedAt: IsNull() },
      take: 10,
      order: { createdAt: 'DESC' },
      relations: ['user', 'circle'],
    });

    // Get all active regular users
    const activeUsers = await this.usersRepository.find({
      where: { isActive: true, role: UserRole.USER },
    });

    // Get entries for previous week (exclude voided)
    const previousWeekEntries = await this.entriesRepository.find({
      where: { weekStartDate: previousWeek, voidedAt: IsNull() },
    });

    // Calculate status for each user for previous week
    const userWeeklyData = new Map<string, { totalHours: number; hasZeroReason: boolean }>();
    previousWeekEntries.forEach((entry) => {
      const current = userWeeklyData.get(entry.userId) || { totalHours: 0, hasZeroReason: false };
      current.totalHours += Number(entry.hours);
      if (entry.hours === 0 && entry.zeroHoursReason) {
        current.hasZeroReason = true;
      }
      userWeeklyData.set(entry.userId, current);
    });

    // Classify users
    const statusCounts = { missing: 0, zeroReason: 0, underTarget: 0, met: 0 };
    const missingUsers: MissingUser[] = [];

    activeUsers.forEach((user) => {
      const data = userWeeklyData.get(user.id);

      if (!data) {
        statusCounts.missing++;
        missingUsers.push({
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          telegramChatId: user.telegramChatId,
          totalHours: 0,
          status: WeeklyStatus.MISSING,
        });
      } else if (data.totalHours === 0) {
        if (data.hasZeroReason) {
          statusCounts.zeroReason++;
        } else {
          statusCounts.missing++;
          missingUsers.push({
            id: user.id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            telegramChatId: user.telegramChatId,
            totalHours: 0,
            status: WeeklyStatus.MISSING,
          });
        }
      } else if (data.totalHours < 2) {
        statusCounts.underTarget++;
        missingUsers.push({
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          telegramChatId: user.telegramChatId,
          totalHours: data.totalHours,
          status: WeeklyStatus.UNDER_TARGET,
        });
      } else {
        statusCounts.met++;
      }
    });

    // Find users missing for 2 consecutive weeks (exclude voided)
    const twoWeeksEntries = await this.entriesRepository.find({
      where: { weekStartDate: In([previousWeek, twoWeeksAgo]), voidedAt: IsNull() },
    });

    const userTwoWeekData = new Map<string, Set<string>>();
    twoWeeksEntries.forEach((entry) => {
      if (!userTwoWeekData.has(entry.userId)) {
        userTwoWeekData.set(entry.userId, new Set());
      }
      if (Number(entry.hours) > 0 || entry.zeroHoursReason) {
        userTwoWeekData.get(entry.userId)!.add(entry.weekStartDate);
      }
    });

    const twoWeekMissingUsers = activeUsers
      .filter((user) => {
        const weeks = userTwoWeekData.get(user.id);
        return !weeks || weeks.size === 0;
      })
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        telegramChatId: user.telegramChatId,
        totalHours: 0,
        status: WeeklyStatus.MISSING,
        consecutiveMissingWeeks: 2,
      }));

    // Get circle metrics
    const circleMetrics = await this.getCircleMetrics(previousWeek);

    return {
      recentEntries: recentEntries.map((e) => ({
        id: e.id,
        userId: e.userId,
        userName: e.user?.name,
        circleId: e.circleId,
        circleName: e.circle?.name,
        weekStartDate: e.weekStartDate,
        hours: Number(e.hours),
        description: e.description,
        createdAt: e.createdAt,
      })),
      missingPreviousWeek: {
        weekStartDate: previousWeek,
        users: missingUsers,
        count: missingUsers.length,
      },
      missingTwoWeeks: {
        weekStartDates: [twoWeeksAgo, previousWeek],
        users: twoWeekMissingUsers,
        count: twoWeekMissingUsers.length,
      },
      statusCounts,
      circleMetrics,
    };
  }

  private async getCircleMetrics(weekStartDate: string): Promise<CircleMetric[]> {
    const circles = await this.circlesRepository.find({
      where: { isActive: true },
    });

    const metrics: CircleMetric[] = [];

    for (const circle of circles) {
      // Get active member count
      const activeMemberCount = await this.membershipsRepository.count({
        where: { circleId: circle.id, isActive: true },
      });

      // Get entries for this circle this week (exclude voided)
      const entries = await this.entriesRepository.find({
        where: { circleId: circle.id, weekStartDate, voidedAt: IsNull() },
      });

      const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
      const contributingUsers = new Set(entries.map((e) => e.userId)).size;

      metrics.push({
        circleId: circle.id,
        circleName: circle.name,
        totalHours,
        activeMemberCount,
        avgHoursPerMember: activeMemberCount > 0
          ? Math.round((totalHours / activeMemberCount) * 100) / 100
          : 0,
        contributingUsers,
      });
    }

    return metrics.sort((a, b) => b.totalHours - a.totalHours);
  }

  async getUsers(
    search?: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ users: any[]; total: number }> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.memberships', 'membership', 'membership.isActive = true')
      .leftJoinAndSelect('membership.circle', 'circle');

    if (search) {
      queryBuilder.where(
        'user.name ILIKE :search OR user.email ILIKE :search',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('user.name', 'ASC');

    const skip = (page - 1) * pageSize;
    const [users, total] = await queryBuilder.skip(skip).take(pageSize).getManyAndCount();

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        circles: user.memberships?.map((m) => m.circle?.name).filter(Boolean) || [],
        createdAt: user.createdAt,
      })),
      total,
    };
  }

  async updateUserPhone(userId: string, phoneNumber: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    user.phoneNumber = phoneNumber;
    return this.usersRepository.save(user);
  }

  async getCircles(): Promise<any[]> {
    const circles = await this.circlesRepository.find({
      order: { name: 'ASC' },
    });

    const result = [];

    for (const circle of circles) {
      const memberCount = await this.membershipsRepository.count({
        where: { circleId: circle.id, isActive: true },
      });

      // Get current month hours (exclude voided)
      const { start, end } = this.dateUtils.getMonthWeekRange(this.dateUtils.getCurrentMonth());
      const entries = await this.entriesRepository.find({
        where: {
          circleId: circle.id,
          voidedAt: IsNull(),
        },
      });

      const monthEntries = entries.filter(
        (e) => e.weekStartDate >= start && e.weekStartDate <= end,
      );
      const totalHoursThisMonth = monthEntries.reduce((sum, e) => sum + Number(e.hours), 0);

      result.push({
        id: circle.id,
        name: circle.name,
        description: circle.description,
        isActive: circle.isActive,
        memberCount,
        totalHoursThisMonth,
        avgHoursPerMember: memberCount > 0
          ? Math.round((totalHoursThisMonth / memberCount) * 100) / 100
          : 0,
        createdAt: circle.createdAt,
      });
    }

    return result;
  }

  async createCircle(dto: CreateCircleDto): Promise<Circle> {
    const existing = await this.circlesRepository.findOne({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException('A circle with this name already exists');
    }
    const circle = this.circlesRepository.create({
      name: dto.name.trim(),
      description: dto.description?.trim() ?? '',
      isActive: true,
    });
    return this.circlesRepository.save(circle);
  }

  async deleteCircle(id: string): Promise<void> {
    const circle = await this.circlesRepository.findOne({ where: { id } });
    if (!circle) {
      throw new NotFoundException('Circle not found');
    }
    circle.isActive = false;
    await this.circlesRepository.save(circle);
  }

  async getCircle(id: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    memberCount: number;
    createdAt: Date;
  }> {
    const circle = await this.circlesRepository.findOne({ where: { id } });
    if (!circle) {
      throw new NotFoundException('Circle not found');
    }
    const memberCount = await this.membershipsRepository.count({
      where: { circleId: circle.id, isActive: true },
    });
    return {
      id: circle.id,
      name: circle.name,
      description: circle.description,
      isActive: circle.isActive,
      memberCount,
      createdAt: circle.createdAt,
    };
  }

  async getCircleMembers(circleId: string): Promise<
    Array<{
      id: string;
      userId: string;
      userName: string;
      userEmail: string;
      joinedAt: string;
      trackingStartDate: string;
    }>
  > {
    const circle = await this.circlesRepository.findOne({ where: { id: circleId } });
    if (!circle) {
      throw new NotFoundException('Circle not found');
    }
    const memberships = await this.membershipsRepository.find({
      where: { circleId, isActive: true },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
    return memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.user.name,
      userEmail: m.user.email,
      joinedAt: m.joinedAt.toISOString(),
      trackingStartDate: (m.trackingStartDate ?? m.joinedAt).toISOString(),
    }));
  }

  async addCircleMember(circleId: string, userId: string): Promise<void> {
    const circle = await this.circlesRepository.findOne({ where: { id: circleId } });
    if (!circle) {
      throw new NotFoundException('Circle not found');
    }
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const existing = await this.membershipsRepository.findOne({
      where: { circleId, userId },
    });
    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('User is already a member of this circle');
      }
      existing.isActive = true;
      existing.leftAt = null;
      await this.membershipsRepository.save(existing);
      return;
    }
    const membership = this.membershipsRepository.create({
      circleId,
      userId,
      isActive: true,
    });
    await this.membershipsRepository.save(membership);
  }

  async removeCircleMember(circleId: string, userId: string): Promise<void> {
    const membership = await this.membershipsRepository.findOne({
      where: { circleId, userId },
      relations: ['circle'],
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    membership.isActive = false;
    membership.leftAt = new Date();
    await this.membershipsRepository.save(membership);
  }

  async getCircleAvailableUsers(
    circleId: string,
    search?: string,
  ): Promise<Array<{ id: string; name: string; email: string }>> {
    const circle = await this.circlesRepository.findOne({ where: { id: circleId } });
    if (!circle) {
      throw new NotFoundException('Circle not found');
    }
    const memberUserIds = await this.membershipsRepository
      .find({ where: { circleId, isActive: true }, select: ['userId'] })
      .then((rows) => rows.map((r) => r.userId));

    const qb = this.usersRepository
      .createQueryBuilder('user')
      .where('user.isActive = :active', { active: true });
    if (memberUserIds.length > 0) {
      qb.andWhere('user.id NOT IN (:...ids)', { ids: memberUserIds });
    }
    if (search && search.trim()) {
      qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search.trim()}%`,
      });
    }
    qb.orderBy('user.name', 'ASC').take(50);
    const users = await qb.getMany();
    return users.map((u) => ({ id: u.id, name: u.name, email: u.email }));
  }

  async createEntryForUser(dto: AdminCreateEntryDto): Promise<WeeklyEntry> {
    // Validate user exists
    const user = await this.usersRepository.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate circle exists
    const circle = await this.circlesRepository.findOne({ where: { id: dto.circleId } });
    if (!circle) {
      throw new NotFoundException('Circle not found');
    }

    // Check user is a member of the circle
    const membership = await this.membershipsRepository.findOne({
      where: { userId: dto.userId, circleId: dto.circleId, isActive: true },
    });
    if (!membership) {
      throw new BadRequestException('User is not a member of this circle');
    }

    // Validate zero hours reason
    if (dto.hours === 0 && !dto.zeroHoursReason) {
      throw new BadRequestException('A reason is required when logging 0 hours');
    }

    // Compute week start date
    const weekStartDate = this.dateUtils.getWeekStartDate(dto.date);

    // Create entry
    const entry = this.entriesRepository.create({
      userId: dto.userId,
      circleId: dto.circleId,
      weekStartDate,
      hours: dto.hours,
      description: dto.description,
      zeroHoursReason: dto.hours === 0 ? dto.zeroHoursReason : null,
    });

    const savedEntry = await this.entriesRepository.save(entry);

    // Reload with relations
    return this.entriesRepository.findOne({
      where: { id: savedEntry.id },
      relations: ['user', 'circle'],
    }) as Promise<WeeklyEntry>;
  }

  async getUserCircles(userId: string): Promise<Array<{ id: string; name: string }>> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const memberships = await this.membershipsRepository.find({
      where: { userId, isActive: true },
      relations: ['circle'],
    });

    return memberships
      .filter((m) => m.circle?.isActive)
      .map((m) => ({
        id: m.circle.id,
        name: m.circle.name,
      }));
  }

  async updateMembership(
    circleId: string,
    userId: string,
    dto: UpdateMembershipDto,
  ): Promise<CircleMembership> {
    const membership = await this.membershipsRepository.findOne({
      where: { circleId, userId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (dto.trackingStartDate !== undefined) {
      membership.trackingStartDate = dto.trackingStartDate
        ? new Date(dto.trackingStartDate)
        : null;
    }

    return this.membershipsRepository.save(membership);
  }

  async getPendingUsers(): Promise<
    Array<{
      id: string;
      email: string;
      name: string;
      createdAt: Date;
    }>
  > {
    const users = await this.usersRepository.find({
      where: { isApproved: false, isActive: true, role: UserRole.USER },
      order: { createdAt: 'DESC' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    }));
  }

  async approveUser(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isApproved = true;
    return this.usersRepository.save(user);
  }

  async declineUser(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hard delete the user since they were never approved
    await this.usersRepository.remove(user);
  }

  async sendTelegramReminder(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.telegramChatId) {
      throw new BadRequestException('User has not connected Telegram');
    }

    const token = await this.authService.createOneTimeToken(userId);
    const backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3000');
    const loginUrl = `${backendUrl}/api/v1/auth/one-time/${token}`;

    await this.telegramService.sendReminder(user.telegramChatId, user.name, loginUrl);
  }

  getTelegramBotUsername(): string | null {
    return this.telegramService.getBotUsername();
  }

  async getUser(userId: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const memberships = await this.membershipsRepository.find({
      where: { userId, isActive: true },
      relations: ['circle'],
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phoneNumber: user.phoneNumber,
      telegramChatId: user.telegramChatId,
      isActive: user.isActive,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
      circles: memberships
        .filter((m) => m.circle?.isActive)
        .map((m) => ({ id: m.circle.id, name: m.circle.name })),
    };
  }

  async getUserEntries(
    userId: string,
    filters: {
      from?: string;
      to?: string;
      circleId?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ entries: any[]; total: number }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const qb = this.entriesRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.circle', 'circle')
      .leftJoin('entry.voidedByUser', 'voidedByUser')
      .addSelect(['voidedByUser.name'])
      .where('entry.userId = :userId', { userId });

    if (filters.from) {
      qb.andWhere('entry.weekStartDate >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('entry.weekStartDate <= :to', { to: filters.to });
    }
    if (filters.circleId) {
      qb.andWhere('entry.circleId = :circleId', { circleId: filters.circleId });
    }

    qb.orderBy('entry.createdAt', 'DESC');

    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const [entries, total] = await qb.skip(skip).take(pageSize).getManyAndCount();

    return {
      entries: entries.map((e) => ({
        id: e.id,
        userId: e.userId,
        circleId: e.circleId,
        circleName: e.circle?.name,
        weekStartDate: e.weekStartDate,
        hours: Number(e.hours),
        description: e.description,
        zeroHoursReason: e.zeroHoursReason,
        createdAt: e.createdAt,
        voidedAt: e.voidedAt,
        voidedBy: e.voidedBy,
        voidedByName: e.voidedByUser?.name ?? null,
        voidReason: e.voidReason,
      })),
      total,
    };
  }

  async voidEntry(
    entryId: string,
    adminUserId: string,
    reason: string,
  ): Promise<void> {
    const entry = await this.entriesRepository.findOne({ where: { id: entryId } });
    if (!entry) {
      throw new NotFoundException('Entry not found');
    }
    if (entry.voidedAt) {
      throw new BadRequestException('Entry is already voided');
    }

    entry.voidedAt = new Date();
    entry.voidedBy = adminUserId;
    entry.voidReason = reason;
    await this.entriesRepository.save(entry);
  }
}
