import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CircleMembership } from './circle-membership.entity';
import { WeeklyEntry } from '../../entries/entities/weekly-entry.entity';

@Entity('circles')
export class Circle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => CircleMembership, (membership) => membership.circle)
  memberships: CircleMembership[];

  @OneToMany(() => WeeklyEntry, (entry) => entry.circle)
  entries: WeeklyEntry[];
}
