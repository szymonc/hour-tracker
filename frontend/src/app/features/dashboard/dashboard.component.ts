import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { selectUser } from '../../store/auth/auth.selectors';
import { SummariesActions } from '../../store/summaries/summaries.actions';
import { CirclesActions } from '../../store/circles/circles.actions';
import {
  selectWeeklySummaries,
  selectIsLoading,
  selectPeriodTotalHours,
  selectError,
} from '../../store/summaries/summaries.reducer';
import { environment } from '../../../environments/environment';

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
    TranslateModule,
  ],
  template: `
    <div class="dashboard-container page-container">
      <header class="dashboard-header">
        <h1>{{ 'dashboard.welcome' | translate }}, {{ ((user$ | async)?.name?.split(' ') ?? [])[0] ?? 'User' }}!</h1>
        <button mat-raised-button color="primary" routerLink="/app/log-hours">
          <mat-icon>add</mat-icon>
          {{ 'nav.logHours' | translate }}
        </button>
      </header>

      @if (user$ | async; as user) {
        @if (user.telegramChatId) {
          <div class="telegram-connected">
            <mat-icon>check_circle</mat-icon>
            <span>{{ 'profile.telegramConnected' | translate }}</span>
          </div>
        } @else if (telegramBotUsername) {
          <mat-card class="telegram-banner">
            <mat-card-content>
              <div class="telegram-banner-content">
                <mat-icon class="telegram-banner-icon">notifications_active</mat-icon>
                <div class="telegram-banner-text">
                  <strong>{{ 'dashboard.telegramBanner.title' | translate }}</strong>
                  <span>{{ 'dashboard.telegramBanner.message' | translate }}</span>
                </div>
                <a [href]="getTelegramDeepLink(user.id)" mat-raised-button color="accent" target="_blank">
                  <mat-icon>send</mat-icon>
                  {{ 'profile.connectTelegram' | translate }}
                </a>
              </div>
            </mat-card-content>
          </mat-card>
        }
      }

      @if (error$ | async; as errorMessage) {
        <div class="error-container">
          <p class="error-message">{{ errorMessage }}</p>
          <button mat-raised-button color="primary" (click)="retry()">
            <mat-icon>refresh</mat-icon>
            {{ 'common.retry' | translate }}
          </button>
        </div>
      } @else {
        <div class="dashboard-grid">
          <!-- Period Total Card -->
          <mat-card class="summary-card">
            <mat-card-header>
              <mat-card-title>{{ 'dashboard.last4Weeks' | translate }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (isLoading$ | async) {
                <div class="card-loading"><mat-spinner diameter="32"></mat-spinner></div>
              } @else {
                <div class="big-number">{{ periodTotal$ | async }}h</div>
                <p class="target-info">{{ 'dashboard.target' | translate }}: 8h (2h/{{ 'dashboard.week' | translate }})</p>
              }
            </mat-card-content>
          </mat-card>

          <!-- Weekly Breakdown -->
          <mat-card class="weeks-card">
            <mat-card-header>
              <mat-card-title>{{ 'dashboard.weeklyBreakdown' | translate }}</mat-card-title>
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
                      {{ getStatusTranslation(week.status) | translate }}
                    </span>
                  </div>
                } @empty {
                  <p class="empty-message">{{ 'dashboard.noEntries' | translate }}</p>
                }
              }
            </mat-card-content>
          </mat-card>

          <!-- Quick Actions (always visible) -->
          <mat-card class="actions-card">
            <mat-card-header>
              <mat-card-title>{{ 'dashboard.quickActions' | translate }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <button mat-stroked-button routerLink="/app/log-hours" class="action-button">
                <mat-icon>add_circle</mat-icon>
                {{ 'dashboard.logNewHours' | translate }}
              </button>
              <button mat-stroked-button routerLink="/app/history" class="action-button">
                <mat-icon>history</mat-icon>
                {{ 'dashboard.viewHistory' | translate }}
              </button>
              <button mat-stroked-button routerLink="/app/profile" class="action-button">
                <mat-icon>person</mat-icon>
                {{ 'dashboard.editProfile' | translate }}
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

    .telegram-connected {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
      color: #2e7d32;
      font-size: 14px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .telegram-banner {
      margin-bottom: 24px;
      border-left: 4px solid #0088cc;
      background-color: #e3f2fd;
    }

    .telegram-banner-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .telegram-banner-icon {
      color: #0088cc;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .telegram-banner-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;

      span {
        color: rgba(0, 0, 0, 0.6);
        font-size: 14px;
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

      .telegram-banner-content {
        flex-direction: column;
        text-align: center;
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private store = inject(Store);
  private translate = inject(TranslateService);

  user$ = this.store.select(selectUser);
  summaries$ = this.store.select(selectWeeklySummaries);
  isLoading$ = this.store.select(selectIsLoading);
  periodTotal$ = this.store.select(selectPeriodTotalHours);
  error$ = this.store.select(selectError);
  telegramBotUsername = environment.telegramBotUsername;

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
    const lang = this.translate.currentLang || 'en';
    return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' });
  }

  getTelegramDeepLink(userId: string): string {
    return `https://t.me/${this.telegramBotUsername}?start=${userId}`;
  }

  getStatusTranslation(status: string): string {
    switch (status) {
      case 'met':
        return 'dashboard.status.met';
      case 'under_target':
        return 'dashboard.status.under';
      case 'zero_reason':
        return 'dashboard.status.zeroReason';
      case 'missing':
        return 'dashboard.status.missing';
      default:
        return status;
    }
  }
}
