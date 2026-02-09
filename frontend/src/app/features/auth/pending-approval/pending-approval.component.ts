import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AuthActions } from '../../../store/auth/auth.actions';
import { selectUser } from '../../../store/auth/auth.selectors';

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    TranslateModule,
  ],
  template: `
    <div class="pending-container">
      <mat-card class="pending-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="pending-icon">hourglass_empty</mat-icon>
          <mat-card-title>{{ 'auth.pendingApproval.title' | translate }}</mat-card-title>
          <mat-card-subtitle>{{ 'auth.pendingApproval.subtitle' | translate }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <p class="welcome-message">
            {{ 'auth.pendingApproval.welcome' | translate }}, <strong>{{ (user$ | async)?.name }}</strong>!
          </p>
          <p class="info-message">
            {{ 'auth.pendingApproval.message' | translate }}
          </p>
          <p class="contact-message">
            {{ 'auth.pendingApproval.contact' | translate }}
          </p>
        </mat-card-content>

        <mat-card-actions>
          <button mat-stroked-button (click)="logout()">
            <mat-icon>logout</mat-icon>
            {{ 'nav.logout' | translate }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .pending-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: linear-gradient(135deg, #e8f5e9 0%, #f3e5f5 100%);
    }

    .pending-card {
      max-width: 500px;
      width: 100%;
      padding: 24px;
      text-align: center;
    }

    mat-card-header {
      justify-content: center;
      margin-bottom: 24px;
    }

    .pending-icon {
      background-color: #ff9800;
      color: white;
      padding: 8px;
      border-radius: 50%;
      font-size: 32px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .welcome-message {
      font-size: 18px;
      margin-bottom: 16px;
    }

    .info-message {
      color: rgba(0, 0, 0, 0.7);
      margin-bottom: 16px;
      line-height: 1.6;
    }

    .contact-message {
      color: rgba(0, 0, 0, 0.5);
      font-size: 14px;
    }

    mat-card-actions {
      display: flex;
      justify-content: center;
      padding-top: 16px;

      button mat-icon {
        margin-right: 8px;
      }
    }
  `],
})
export class PendingApprovalComponent {
  private store = inject(Store);

  user$ = this.store.select(selectUser);

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
