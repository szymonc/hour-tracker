import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ReminderRun } from './reminder-run.entity';
import { User } from '../../users/entities/user.entity';

export enum WeeklyStatusEnum {
  MISSING = 'missing',
  ZERO_REASON = 'zero_reason',
  UNDER_TARGET = 'under_target',
  MET = 'met',
}

@Entity('reminder_targets')
export class ReminderTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  reminderRunId: string;

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: WeeklyStatusEnum,
  })
  @Index()
  weeklyStatus: WeeklyStatusEnum;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  totalHours: number;

  @Column({ type: 'timestamptz', nullable: true })
  notifiedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notificationError: string | null;

  @ManyToOne(() => ReminderRun, (run) => run.targets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reminderRunId' })
  reminderRun: ReminderRun;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
