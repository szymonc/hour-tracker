import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { selectUser } from '../../store/auth/auth.selectors';
import { SummariesActions } from '../../store/summaries/summaries.actions';
import { CirclesActions } from '../../store/circles/circles.actions';
import {
  selectWeeklySummaries,
  selectIsLoading,
  selectPeriodTotalHours,
  selectError,
} from '../../store/summaries/summaries.reducer';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dashboard-container page-container">
      <header class="dashboard-header">
        <h1>Welcome back, {{ ((user$ | async)?.name?.split(' ') ?? [])[0] ?? 'User' }}!</h1>
        <button mat-raised-button color="primary" routerLink="/app/log-hours">
          <mat-icon>add</mat-icon>
          Log Hours
        </button>
      </header>

      @if (error$ | async; as errorMessage) {
        <div class="error-container">
          <p class="error-message">{{ errorMessage }}</p>
          <button mat-raised-button color="primary" (click)="retry()">
            <mat-icon>refresh</mat-icon>
            Retry
          </button>
        </div>
      } @else {
        <div class="dashboard-grid">
          <!-- Period Total Card -->
          <mat-card class="summary-card">
            <mat-card-header>
              <mat-card-title>Last 4 Weeks</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (isLoading$ | async) {
                <div class="card-loading"><mat-spinner diameter="32"></mat-spinner></div>
              } @else {
                <div class="big-number">{{ periodTotal$ | async }}h</div>
                <p class="target-info">Target: 8h (2h/week)</p>
              }
            </mat-card-content>
          </mat-card>

          <!-- Weekly Breakdown -->
          <mat-card class="weeks-card">
            <mat-card-header>
              <mat-card-title>Weekly Breakdown</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (isLoading$ | async) {
                <div class="card-loading"><mat-spinner diameter="24"></mat-spinner></div>
              } @else {
                @for (week of summaries$ | async; track week.weekStartDate) {
                  <div class="week-row">
                    <span class="week-date">{{ formatWeek(week.weekStartDate) }}</span>
                    <span class="week-hours">{{ week.totalHours }}h</span>
                    <span class="status-badge" [class]="'status-' + week.status">
                      {{ formatStatus(week.status) }}
                    </span>
                  </div>
                } @empty {
                  <p class="empty-message">No entries logged yet</p>
                }
              }
            </mat-card-content>
          </mat-card>

          <!-- Quick Actions (always visible) -->
          <mat-card class="actions-card">
            <mat-card-header>
              <mat-card-title>Quick Actions</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <button mat-stroked-button routerLink="/app/log-hours" class="action-button">
                <mat-icon>add_circle</mat-icon>
                Log Hours
              </button>
              <button mat-stroked-button routerLink="/app/history" class="action-button">
                <mat-icon>history</mat-icon>
                View History
              </button>
              <button mat-stroked-button routerLink="/app/profile" class="action-button">
                <mat-icon>person</mat-icon>
                Edit Profile
              </button>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 400;
      }
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .summary-card {
      .big-number {
        font-size: 48px;
        font-weight: 500;
        color: var(--color-forest);
        margin: 16px 0;
      }

      .target-info {
        color: rgba(0, 0, 0, 0.6);
        margin: 0;
      }
    }

    .weeks-card {
      .week-row {
        display: flex;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);

        &:last-child {
          border-bottom: none;
        }
      }

      .week-date {
        flex: 1;
        font-weight: 500;
      }

      .week-hours {
        margin-right: 16px;
        font-weight: 500;
      }
    }

    .actions-card {
      .action-button {
        display: flex;
        align-items: center;
        width: 100%;
        justify-content: flex-start;
        margin-bottom: 8px;

        mat-icon {
          margin-right: 8px;
        }

        &:last-child {
          margin-bottom: 0;
        }
      }
    }

    .empty-message {
      text-align: center;
      color: rgba(0, 0, 0, 0.54);
      padding: 24px;
    }

    .card-loading {
      display: flex;
      justify-content: center;
      padding: 24px;
    }

    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      text-align: center;

      .error-message {
        color: rgba(0, 0, 0, 0.7);
        margin: 0;
      }

      button mat-icon {
        margin-right: 8px;
        vertical-align: middle;
      }
    }

    @media (max-width: 600px) {
      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;

        h1 {
          font-size: 24px;
        }
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private store = inject(Store);

  user$ = this.store.select(selectUser);
  summaries$ = this.store.select(selectWeeklySummaries);
  isLoading$ = this.store.select(selectIsLoading);
  periodTotal$ = this.store.select(selectPeriodTotalHours);
  error$ = this.store.select(selectError);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.store.dispatch(SummariesActions.loadWeeklySummary({ weeks: 4 }));
    this.store.dispatch(CirclesActions.loadUserCircles());
  }

  retry(): void {
    this.store.dispatch(SummariesActions.loadWeeklySummary({ weeks: 4 }));
    this.store.dispatch(CirclesActions.loadUserCircles());
  }

  formatWeek(weekStart: string): string {
    const date = new Date(weekStart);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'met':
        return 'Met';
      case 'under_target':
        return 'Under';
      case 'zero_reason':
        return '0h Reason';
      case 'missing':
        return 'Missing';
      default:
        return status;
    }
  }
}
