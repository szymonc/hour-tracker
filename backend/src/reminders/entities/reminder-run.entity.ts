import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ReminderTarget } from './reminder-target.entity';

export enum ReminderRunStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('reminder_runs')
export class ReminderRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  @Index()
  weekStartDate: string;

  @CreateDateColumn({ type: 'timestamptz' })
  runAt: Date;

  @Column({ default: 0 })
  totalTargets: number;

  @Column({
    type: 'enum',
    enum: ReminderRunStatus,
    default: ReminderRunStatus.PENDING,
  })
  @Index()
  status: ReminderRunStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @OneToMany(() => ReminderTarget, (target) => target.reminderRun)
  targets: ReminderTarget[];
}
