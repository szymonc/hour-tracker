import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { CreateCircleDto } from './dto/create-circle.dto';
import { AddCircleMemberDto } from './dto/add-circle-member.dto';
import { AdminCreateEntryDto } from './dto/admin-create-entry.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { VoidEntryDto } from './dto/void-entry.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Users list retrieved' })
  async getUsers(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { users, total } = await this.adminService.getUsers(
      search,
      page || 1,
      Math.min(pageSize || 20, 100),
    );

    return {
      users,
      pagination: {
        page: page || 1,
        pageSize: pageSize || 20,
        totalItems: total,
        totalPages: Math.ceil(total / (pageSize || 20)),
      },
    };
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user phone number' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async updateUserPhone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePhoneDto,
  ) {
    const user = await this.adminService.updateUserPhone(id, dto.phoneNumber);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      updatedAt: user.updatedAt,
    };
  }

  @Get('circles')
  @ApiOperation({ summary: 'List all circles with metrics' })
  @ApiResponse({ status: 200, description: 'Circles list retrieved' })
  async getCircles() {
    const circles = await this.adminService.getCircles();
    return { circles };
  }

  @Post('circles')
  @ApiOperation({ summary: 'Create a new circle' })
  @ApiResponse({ status: 201, description: 'Circle created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createCircle(@Body() dto: CreateCircleDto) {
    const circle = await this.adminService.createCircle(dto);
    return {
      id: circle.id,
      name: circle.name,
      description: circle.description,
      isActive: circle.isActive,
      createdAt: circle.createdAt,
    };
  }

  @Delete('circles/:id')
  @ApiOperation({ summary: 'Remove a circle (soft delete)' })
  @ApiResponse({ status: 200, description: 'Circle removed' })
  @ApiResponse({ status: 404, description: 'Circle not found' })
  async deleteCircle(@Param('id', ParseUUIDPipe) id: string) {
    await this.adminService.deleteCircle(id);
    return { success: true };
  }

  @Get('circles/:id')
  @ApiOperation({ summary: 'Get a single circle by ID' })
  @ApiResponse({ status: 200, description: 'Circle retrieved' })
  @ApiResponse({ status: 404, description: 'Circle not found' })
  async getCircle(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getCircle(id);
  }

  @Get('circles/:id/members')
  @ApiOperation({ summary: 'List circle members' })
  @ApiResponse({ status: 200, description: 'Members list retrieved' })
  @ApiResponse({ status: 404, description: 'Circle not found' })
  async getCircleMembers(@Param('id', ParseUUIDPipe) id: string) {
    const members = await this.adminService.getCircleMembers(id);
    return { members };
  }

  @Post('circles/:id/members')
  @ApiOperation({ summary: 'Add a member to the circle' })
  @ApiResponse({ status: 201, description: 'Member added' })
  @ApiResponse({ status: 404, description: 'Circle or user not found' })
  @ApiResponse({ status: 409, description: 'User already a member' })
  async addCircleMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCircleMemberDto,
  ) {
    await this.adminService.addCircleMember(id, dto.userId);
    return { success: true };
  }

  @Delete('circles/:id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the circle' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async removeCircleMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.adminService.removeCircleMember(id, userId);
    return { success: true };
  }

  @Patch('circles/:id/members/:userId')
  @ApiOperation({ summary: 'Update membership settings (e.g., tracking start date)' })
  @ApiResponse({ status: 200, description: 'Membership updated' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async updateMembership(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    const membership = await this.adminService.updateMembership(id, userId, dto);
    return {
      id: membership.id,
      userId: membership.userId,
      circleId: membership.circleId,
      joinedAt: membership.joinedAt,
      trackingStartDate: membership.trackingStartDate,
    };
  }

  @Get('circles/:id/available-users')
  @ApiOperation({ summary: 'List users that can be added to the circle' })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Available users list' })
  @ApiResponse({ status: 404, description: 'Circle not found' })
  async getCircleAvailableUsers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('search') search?: string,
  ) {
    const users = await this.adminService.getCircleAvailableUsers(id, search);
    return { users };
  }

  @Post('entries')
  @ApiOperation({ summary: 'Create an entry for any user (backfill hours)' })
  @ApiResponse({ status: 201, description: 'Entry created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'User or circle not found' })
  async createEntryForUser(@Body() dto: AdminCreateEntryDto) {
    const entry = await this.adminService.createEntryForUser(dto);
    return {
      id: entry.id,
      userId: entry.userId,
      userName: entry.user?.name,
      circleId: entry.circleId,
      circleName: entry.circle?.name,
      weekStartDate: entry.weekStartDate,
      hours: Number(entry.hours),
      description: entry.description,
      zeroHoursReason: entry.zeroHoursReason,
      createdAt: entry.createdAt,
    };
  }

  @Post('entries/:id/void')
  @ApiOperation({ summary: 'Void an entry (soft delete with audit trail)' })
  @ApiResponse({ status: 200, description: 'Entry voided' })
  @ApiResponse({ status: 400, description: 'Entry already voided' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async voidEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidEntryDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    await this.adminService.voidEntry(id, adminUserId, dto.reason);
    return { success: true };
  }

  @Get('users/:id/circles')
  @ApiOperation({ summary: 'Get circles a user is a member of' })
  @ApiResponse({ status: 200, description: 'User circles retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserCircles(@Param('id', ParseUUIDPipe) id: string) {
    const circles = await this.adminService.getUserCircles(id);
    return { circles };
  }

  @Get('pending-users')
  @ApiOperation({ summary: 'Get users pending approval' })
  @ApiResponse({ status: 200, description: 'Pending users retrieved' })
  async getPendingUsers() {
    const users = await this.adminService.getPendingUsers();
    return { users };
  }

  @Get('users/:id/detail')
  @ApiOperation({ summary: 'Get a single user profile with circles' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUser(id);
  }

  @Get('users/:id/entries')
  @ApiOperation({ summary: 'Get paginated entries for a user (including voided)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'circleId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User entries retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserEntries(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('circleId') circleId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { entries, total } = await this.adminService.getUserEntries(id, {
      from,
      to,
      circleId,
      page: page || 1,
      pageSize: Math.min(pageSize || 20, 100),
    });

    return {
      entries,
      pagination: {
        page: page || 1,
        pageSize: pageSize || 20,
        totalItems: total,
        totalPages: Math.ceil(total / (pageSize || 20)),
      },
    };
  }

  @Post('users/:id/approve')
  @ApiOperation({ summary: 'Approve a pending user' })
  @ApiResponse({ status: 200, description: 'User approved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async approveUser(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.adminService.approveUser(id);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isApproved: user.isApproved,
    };
  }

  @Post('users/:id/decline')
  @ApiOperation({ summary: 'Decline/delete a pending user' })
  @ApiResponse({ status: 200, description: 'User declined' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async declineUser(@Param('id', ParseUUIDPipe) id: string) {
    await this.adminService.declineUser(id);
    return { success: true };
  }

  @Post('users/:id/send-telegram-reminder')
  @ApiOperation({ summary: 'Send Telegram reminder to user' })
  @ApiResponse({ status: 200, description: 'Reminder sent' })
  @ApiResponse({ status: 400, description: 'User has not connected Telegram' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async sendTelegramReminder(@Param('id', ParseUUIDPipe) id: string) {
    const { sentAt } = await this.adminService.sendTelegramReminder(id);
    return { success: true, sentAt };
  }

  @Get('telegram-bot')
  @ApiOperation({ summary: 'Get Telegram bot username for deep links' })
  @ApiResponse({ status: 200, description: 'Bot username returned' })
  async getTelegramBot() {
    return { botUsername: this.adminService.getTelegramBotUsername() };
  }
}
