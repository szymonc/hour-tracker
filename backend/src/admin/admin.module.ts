import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Circle } from '../circles/entities/circle.entity';
import { CircleMembership } from '../circles/entities/circle-membership.entity';
import { WeeklyEntry } from '../entries/entities/weekly-entry.entity';
import { EntriesModule } from '../entries/entries.module';
import { DateUtils } from '../common/utils/date.utils';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Circle, CircleMembership, WeeklyEntry]),
    EntriesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, DateUtils],
  exports: [AdminService],
})
export class AdminModule {}
