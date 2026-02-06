import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Circle } from './entities/circle.entity';
import { CircleMembership } from './entities/circle-membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Circle, CircleMembership])],
  exports: [TypeOrmModule],
})
export class CirclesModule {}
