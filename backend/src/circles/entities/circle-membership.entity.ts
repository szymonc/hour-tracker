import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Circle } from './circle.entity';

@Entity('circle_memberships')
@Unique(['userId', 'circleId'])
export class CircleMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  @Index()
  circleId: string;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  leftAt: Date | null;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Circle, (circle) => circle.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'circleId' })
  circle: Circle;
}
