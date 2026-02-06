import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';
import { WeeklyEntry } from './entities/weekly-entry.entity';
import { CircleMembership } from '../circles/entities/circle-membership.entity';
import { DateUtils } from '../common/utils/date.utils';

@Module({
  imports: [TypeOrmModule.forFeature([WeeklyEntry, CircleMembership])],
  controllers: [EntriesController],
  providers: [EntriesService, DateUtils],
  exports: [EntriesService],
})
export class EntriesModule {}
