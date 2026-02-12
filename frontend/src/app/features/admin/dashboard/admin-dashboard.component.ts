import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { AdminActions } from '../../../store/admin/admin.actions';
import {
  selectDashboard,
  selectDashboardLoading,
  selectPendingUsers,
  selectPendingUsersLoading,
  selectPendingActionLoading,
  selectTelegramSending,
} from '../../../store/admin/admin.reducer';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <div class="admin-dashboard page-container">
      <h1>{{ 'admin.dashboard.title' | translate }}</h1>

      <!-- Pending Approvals Section - Always at top -->
      @if (pendingUsers$ | async; as pendingUsers) {
        @if (pendingUsers.length > 0) {
          <mat-card class="pending-approvals-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="pending-icon">person_add</mat-icon>
              <mat-card-title>{{ 'admin.dashboard.pendingApprovals' | translate }}</mat-card-title>
              <mat-card-subtitle>{{ pendingUsers.length }} {{ 'admin.dashboard.pendingApprovalsSubtitle' | translate }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @for (user of pendingUsers; track user.id) {
                <div class="pending-user-row">
                  <div class="user-info">
                    <a class="user-name user-link" [routerLink]="['/admin/users', user.id]">{{ user.name }}</a>
                    <span class="user-email">{{ user.email }}</span>
                    <span class="user-date">{{ 'admin.dashboard.registeredAt' | translate }}: {{ user.createdAt | date:'short' }}</span>
                  </div>
                  <div class="user-actions">
                    <button mat-raised-button color="primary" (click)="approveUser(user.id)" [disabled]="pendingActionLoading$ | async">
                      <mat-icon>check</mat-icon>
                      {{ 'admin.dashboard.approve' | translate }}
                    </button>
                    <button mat-stroked-button color="warn" (click)="declineUser(user.id)" [disabled]="pendingActionLoading$ | async">
                      <mat-icon>close</mat-icon>
                      {{ 'admin.dashboard.decline' | translate }}
                    </button>
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }
      }

      @if (isLoading$ | async) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
        </div>
      } @else {
        @if (dashboard$ | async; as dashboard) {
        <div class="dashboard-grid">
          <!-- Status Counts -->
          <mat-card class="status-card">
            <mat-card-header>
              <mat-card-title>{{ 'admin.dashboard.previousWeek' | translate }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="status-grid">
                <div class="status-item status-met">
                  <span class="count">{{ dashboard.statusCounts.met }}</span>
                  <span class="label">{{ 'admin.dashboard.metTarget' | translate }}</span>
                </div>
                <div class="status-item status-under">
                  <span class="count">{{ dashboard.statusCounts.underTarget }}</span>
                  <span class="label">{{ 'admin.dashboard.underTarget' | translate }}</span>
                </div>
                <div class="status-item status-missing">
                  <span class="count">{{ dashboard.statusCounts.missing }}</span>
                  <span class="label">{{ 'admin.dashboard.missing' | translate }}</span>
                </div>
                <div class="status-item status-zero">
                  <span class="count">{{ dashboard.statusCounts.zeroReason }}</span>
                  <span class="label">{{ 'admin.dashboard.zeroWithReason' | translate }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Missing Users -->
          <mat-card class="missing-card" data-testid="missing-1-week">
            <mat-card-header>
              <mat-card-title>{{ 'admin.dashboard.missingUsers' | translate }}</mat-card-title>
              <mat-card-subtitle>{{ dashboard.missingPreviousWeek.count }} {{ 'nav.users' | translate | lowercase }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @for (user of dashboard.missingPreviousWeek.users.slice(0, 5); track user.id) {
                <div class="user-row">
                  <a class="user-link" [routerLink]="['/admin/users', user.id]">{{ user.name }}</a>
                  <div class="user-row-actions">
                    <span class="status-badge" [class]="'status-' + user.status">
                      {{ user.status === 'missing' ? ('admin.dashboard.missing' | translate) : user.totalHours + 'h' }}
                    </span>
                    @if (user.telegramChatId) {
                      @if (user.lastReminderSentAt) {
                        <span class="last-reminder-time" [matTooltip]="(user.lastReminderSentAt | date:'medium') || ''">
                          {{ user.lastReminderSentAt | date:'short' }}
                        </span>
                      }
                      <button
                        mat-icon-button
                        color="primary"
                        (click)="sendTelegramReminder(user.id); $event.stopPropagation()"
                        [disabled]="(telegramSending$ | async) === user.id"
                        [matTooltip]="'admin.dashboard.sendTelegramReminder' | translate">
                        <mat-icon>send</mat-icon>
                      </button>
                    }
                  </div>
                </div>
              }
              @if (dashboard.missingPreviousWeek.count > 5) {
                <p class="more-link">
                  <a routerLink="/admin/users">{{ 'admin.dashboard.viewAll' | translate }} ({{ dashboard.missingPreviousWeek.count }})</a>
                </p>
              }
            </mat-card-content>
          </mat-card>

          <!-- 2-Week Missing -->
          <mat-card class="missing-card" data-testid="missing-2-weeks">
            <mat-card-header>
              <mat-card-title>{{ 'admin.dashboard.consecutiveWeeks' | translate }}</mat-card-title>
              <mat-card-subtitle>{{ dashboard.missingTwoWeeks.count }} {{ 'nav.users' | translate | lowercase }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @for (user of dashboard.missingTwoWeeks.users.slice(0, 5); track user.id) {
                <div class="user-row priority">
                  <a class="user-link" [routerLink]="['/admin/users', user.id]">{{ user.name }}</a>
                  <span class="badge">{{ user.consecutiveMissingWeeks }} {{ 'dashboard.week' | translate }}s</span>
                </div>
              }
              @empty {
                <p class="empty-message">{{ 'admin.dashboard.noData' | translate }}</p>
              }
            </mat-card-content>
          </mat-card>

          <!-- Recent Entries -->
          <mat-card class="recent-card">
            <mat-card-header>
              <mat-card-title>{{ 'admin.dashboard.recentEntries' | translate }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (entry of dashboard.recentEntries.slice(0, 5); track entry.id) {
                <div class="entry-row">
                  <a class="user-name user-link" [routerLink]="['/admin/users', entry.userId]">{{ entry.userName }}</a>
                  <span class="circle-name">{{ entry.circleName }}</span>
                  <span class="hours">{{ entry.hours }}h</span>
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>
        } @else {
          <p class="no-data">{{ 'admin.dashboard.noData' | translate }}</p>
        }

        <!-- Quick Actions (always visible when not loading) -->
        <div class="actions-bar">
          <button mat-stroked-button routerLink="/admin/users">
            <mat-icon>people</mat-icon> {{ 'nav.users' | translate }}
          </button>
          <button mat-stroked-button routerLink="/admin/circles">
            <mat-icon>group_work</mat-icon> {{ 'nav.circles' | translate }}
          </button>
          <button mat-stroked-button routerLink="/admin/reports">
            <mat-icon>download</mat-icon> {{ 'nav.reports' | translate }}
          </button>
          <button mat-stroked-button routerLink="/admin/reminders">
            <mat-icon>notifications</mat-icon> {{ 'nav.reminders' | translate }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-dashboard {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 24px;
    }

    .pending-approvals-card {
      margin-bottom: 24px;
      border-left: 4px solid #ff9800;
      background-color: #fff8e1;
    }

    .pending-approvals-card mat-card-header {
      margin-bottom: 16px;
    }

    .pending-icon {
      background-color: #ff9800;
      color: white;
      padding: 8px;
      border-radius: 50%;
      font-size: 24px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pending-user-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);

      &:last-child {
        border-bottom: none;
      }
    }

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .user-name {
        font-weight: 500;
        font-size: 16px;
      }

      .user-email {
        color: rgba(0, 0, 0, 0.6);
        font-size: 14px;
      }

      .user-date {
        color: rgba(0, 0, 0, 0.5);
        font-size: 12px;
      }
    }

    .user-actions {
      display: flex;
      gap: 8px;

      button mat-icon {
        margin-right: 4px;
      }
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .status-card {
      grid-column: span 2;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-top: 16px;
    }

    .status-item {
      text-align: center;
      padding: 16px;
      border-radius: 8px;

      .count {
        display: block;
        font-size: 32px;
        font-weight: 500;
      }

      .label {
        font-size: 14px;
        color: rgba(0, 0, 0, 0.6);
      }

      &.status-met {
        background-color: #e8f5e9;
        .count { color: #2e7d32; }
      }

      &.status-under {
        background-color: #fff3e0;
        .count { color: #e65100; }
      }

      &.status-missing {
        background-color: #ffebee;
        .count { color: #c62828; }
      }

      &.status-zero {
        background-color: #f3e5f5;
        .count { color: #7b1fa2; }
      }
    }

    .user-row-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .last-reminder-time {
      font-size: 11px;
      color: rgba(0, 0, 0, 0.5);
      white-space: nowrap;
    }

    .user-row, .entry-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);

      &:last-child {
        border-bottom: none;
      }

      &.priority {
        background-color: #ffebee;
        margin: 0 -16px;
        padding: 8px 16px;
      }
    }

    .badge {
      background-color: #c62828;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }

    .user-link {
      color: #1976d2;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    .entry-row {
      .user-name {
        flex: 1;
        font-weight: 500;
      }
      .circle-name {
        flex: 1;
        color: rgba(0, 0, 0, 0.6);
      }
      .hours {
        font-weight: 500;
      }
    }

    .more-link, .empty-message {
      text-align: center;
      margin-top: 16px;
      color: rgba(0, 0, 0, 0.6);
    }

    .actions-bar {
      display: flex;
      gap: 16px;
      margin-top: 24px;
      flex-wrap: wrap;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .no-data {
      text-align: center;
      padding: 48px 24px;
      color: rgba(0, 0, 0, 0.6);
    }

    @media (max-width: 768px) {
      .status-card {
        grid-column: span 1;
      }
      .status-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `],
})
export class AdminDashboardComponent implements OnInit {
  private store = inject(Store);

  dashboard$ = this.store.select(selectDashboard);
  isLoading$ = this.store.select(selectDashboardLoading);
  pendingUsers$ = this.store.select(selectPendingUsers);
  pendingUsersLoading$ = this.store.select(selectPendingUsersLoading);
  pendingActionLoading$ = this.store.select(selectPendingActionLoading);
  telegramSending$ = this.store.select(selectTelegramSending);

  ngOnInit(): void {
    this.store.dispatch(AdminActions.loadDashboard());
    this.store.dispatch(AdminActions.loadPendingUsers());
  }

  approveUser(userId: string): void {
    this.store.dispatch(AdminActions.approveUser({ userId }));
  }

  declineUser(userId: string): void {
    if (confirm('Are you sure you want to decline this user? This will delete their account.')) {
      this.store.dispatch(AdminActions.declineUser({ userId }));
    }
  }

  sendTelegramReminder(userId: string): void {
    this.store.dispatch(AdminActions.sendTelegramReminder({ userId }));
  }
}
