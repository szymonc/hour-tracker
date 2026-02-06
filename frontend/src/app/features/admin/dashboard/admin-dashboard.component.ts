import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AdminActions } from '../../../store/admin/admin.actions';
import { selectDashboard, selectDashboardLoading } from '../../../store/admin/admin.reducer';

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
  ],
  template: `
    <div class="admin-dashboard page-container">
      <h1>Admin Dashboard</h1>

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
              <mat-card-title>Previous Week Status</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="status-grid">
                <div class="status-item status-met">
                  <span class="count">{{ dashboard.statusCounts.met }}</span>
                  <span class="label">Met Target</span>
                </div>
                <div class="status-item status-under">
                  <span class="count">{{ dashboard.statusCounts.underTarget }}</span>
                  <span class="label">Under Target</span>
                </div>
                <div class="status-item status-missing">
                  <span class="count">{{ dashboard.statusCounts.missing }}</span>
                  <span class="label">Missing</span>
                </div>
                <div class="status-item status-zero">
                  <span class="count">{{ dashboard.statusCounts.zeroReason }}</span>
                  <span class="label">0h with Reason</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Missing Users -->
          <mat-card class="missing-card" data-testid="missing-1-week">
            <mat-card-header>
              <mat-card-title>Missing Previous Week</mat-card-title>
              <mat-card-subtitle>{{ dashboard.missingPreviousWeek.count }} users</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @for (user of dashboard.missingPreviousWeek.users.slice(0, 5); track user.id) {
                <div class="user-row">
                  <span>{{ user.name }}</span>
                  <span class="status-badge" [class]="'status-' + user.status">
                    {{ user.status === 'missing' ? 'Missing' : user.totalHours + 'h' }}
                  </span>
                </div>
              }
              @if (dashboard.missingPreviousWeek.count > 5) {
                <p class="more-link">
                  <a routerLink="/admin/users">View all {{ dashboard.missingPreviousWeek.count }} users</a>
                </p>
              }
            </mat-card-content>
          </mat-card>

          <!-- 2-Week Missing -->
          <mat-card class="missing-card" data-testid="missing-2-weeks">
            <mat-card-header>
              <mat-card-title>Missing 2+ Weeks</mat-card-title>
              <mat-card-subtitle>{{ dashboard.missingTwoWeeks.count }} users</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @for (user of dashboard.missingTwoWeeks.users.slice(0, 5); track user.id) {
                <div class="user-row priority">
                  <span>{{ user.name }}</span>
                  <span class="badge">{{ user.consecutiveMissingWeeks }} weeks</span>
                </div>
              }
              @empty {
                <p class="empty-message">No users missing 2+ weeks</p>
              }
            </mat-card-content>
          </mat-card>

          <!-- Recent Entries -->
          <mat-card class="recent-card">
            <mat-card-header>
              <mat-card-title>Recent Entries</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (entry of dashboard.recentEntries.slice(0, 5); track entry.id) {
                <div class="entry-row">
                  <span class="user-name">{{ entry.userName }}</span>
                  <span class="circle-name">{{ entry.circleName }}</span>
                  <span class="hours">{{ entry.hours }}h</span>
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>
        } @else {
          <p class="no-data">No dashboard data available.</p>
        }

        <!-- Quick Actions (always visible when not loading) -->
        <div class="actions-bar">
          <button mat-stroked-button routerLink="/admin/users">
            <mat-icon>people</mat-icon> Manage Users
          </button>
          <button mat-stroked-button routerLink="/admin/circles">
            <mat-icon>group_work</mat-icon> Manage Circles
          </button>
          <button mat-stroked-button routerLink="/admin/reports">
            <mat-icon>download</mat-icon> Export Reports
          </button>
          <button mat-stroked-button routerLink="/admin/reminders">
            <mat-icon>notifications</mat-icon> Reminder Targets
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

  ngOnInit(): void {
    this.store.dispatch(AdminActions.loadDashboard());
  }
}
