import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { RemindersScheduler } from './reminders.scheduler';
import { ReminderRun } from './entities/reminder-run.entity';
import { ReminderTarget } from './entities/reminder-target.entity';
import { User } from '../users/entities/user.entity';
import { WeeklyEntry } from '../entries/entities/weekly-entry.entity';
import { DateUtils } from '../common/utils/date.utils';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReminderRun, ReminderTarget, User, WeeklyEntry]),
  ],
  controllers: [RemindersController],
  providers: [RemindersService, RemindersScheduler, DateUtils],
})
export class RemindersModule {}
