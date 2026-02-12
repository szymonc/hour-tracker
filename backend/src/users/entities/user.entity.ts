import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { CircleMembership } from '../../circles/entities/circle-membership.entity';
import { WeeklyEntry } from '../../entries/entities/weekly-entry.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  @Index()
  role: UserRole;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({ nullable: true, unique: true, length: 255 })
  @Index()
  googleId: string;

  @Column({ nullable: true, length: 255 })
  @Exclude()
  passwordHash: string;

  @Column({ nullable: true, length: 20 })
  phoneNumber: string;

  @Column({ default: false })
  phoneVerified: boolean;

  @Column({ nullable: true, length: 64 })
  @Index()
  telegramChatId: string;

  @Column({ default: true })
  isActive: boolean;

  /**
   * Whether the user has been approved by an admin.
   * New users start as unapproved and cannot access the app until approved.
   */
  @Column({ default: false })
  @Index()
  isApproved: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastReminderSentAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => CircleMembership, (membership) => membership.user)
  memberships: CircleMembership[];

  @OneToMany(() => WeeklyEntry, (entry) => entry.user)
  entries: WeeklyEntry[];

  // Computed property for checking if profile is complete
  get isProfileComplete(): boolean {
    return !!this.phoneNumber;
  }
}
