import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Circle } from '../../circles/entities/circle.entity';

@Entity('weekly_entries')
@Check(`"hours" >= 0`)
@Check(`"hours" > 0 OR "zeroHoursReason" IS NOT NULL`)
export class WeeklyEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  @Index()
  circleId: string;

  @Column({ type: 'date' })
  @Index()
  weekStartDate: string; // Always Monday in Europe/Madrid

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  hours: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  zeroHoursReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  @Index()
  voidedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  voidedBy: string | null;

  @Column({ type: 'text', nullable: true })
  voidReason: string | null;

  @ManyToOne(() => User, (user) => user.entries, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Circle, (circle) => circle.entries, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'circleId' })
  circle: Circle;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'voidedBy' })
  voidedByUser: User | null;
}

// Compound indexes are defined in migrations
