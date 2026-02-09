import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { selectUser } from '../../../store/auth/auth.selectors';
import { AuthActions } from '../../../store/auth/auth.actions';

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    TranslateModule,
  ],
  template: `
    <div class="pending-approval-container">
      <mat-card>
        <mat-card-content>
          <mat-icon class="status-icon" color="warn">hourglass_empty</mat-icon>
          <h2>{{ 'auth.pendingApproval.title' | translate }}</h2>
          <p class="subtitle">{{ 'auth.pendingApproval.subtitle' | translate }}</p>

          @if (user$ | async; as user) {
            <p class="welcome">{{ 'auth.pendingApproval.welcome' | translate }}, {{ user.name }}!</p>
          }

          <p class="message">{{ 'auth.pendingApproval.message' | translate }}</p>
          <p class="contact">{{ 'auth.pendingApproval.contact' | translate }}</p>

          <button mat-stroked-button color="primary" (click)="logout()">
            {{ 'nav.logout' | translate }}
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .pending-approval-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 24px;
    }

    mat-card {
      max-width: 480px;
      text-align: center;
    }

    .status-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    h2 { margin-bottom: 8px; }

    .subtitle {
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 24px;
    }

    .welcome { font-weight: 500; }

    .message {
      margin: 16px 0;
      line-height: 1.5;
    }

    .contact {
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
      margin-bottom: 24px;
    }
  `],
})
export class PendingApprovalComponent {
  private store = inject(Store);
  user$ = this.store.select(selectUser);

  logout() {
    this.store.dispatch(AuthActions.logout());
  }
}
