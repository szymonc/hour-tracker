import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

import { AdminActions } from '../../../store/admin/admin.actions';
import { selectReminderTargets, selectRemindersLoading, selectSelectedWeek } from '../../../store/admin/admin.reducer';

@Component({
  selector: 'app-admin-reminders',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
  ],
  template: `
    <div class="admin-reminders page-container">
      <h1>{{ 'admin.reminders.title' | translate }}</h1>

      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ 'admin.reminders.weekOf' | translate }}: {{ selectedWeek$ | async }}</mat-card-title>
          <mat-card-subtitle>{{ 'admin.reminders.usersToRemind' | translate }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (isLoading$ | async) {
            <div class="loading-container"><mat-spinner></mat-spinner></div>
          } @else {
            <table mat-table [dataSource]="(targets$ | async) ?? []">
              <ng-container matColumnDef="userName">
                <th mat-header-cell *matHeaderCellDef>{{ 'admin.reminders.name' | translate }}</th>
                <td mat-cell *matCellDef="let t">{{ t.userName }}</td>
              </ng-container>

              <ng-container matColumnDef="userEmail">
                <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.email' | translate }}</th>
                <td mat-cell *matCellDef="let t">{{ t.userEmail }}</td>
              </ng-container>

              <ng-container matColumnDef="phoneNumber">
                <th mat-header-cell *matHeaderCellDef>{{ 'admin.reminders.phone' | translate }}</th>
                <td mat-cell *matCellDef="let t">{{ t.phoneNumber || 'N/A' }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>{{ 'admin.reminders.status' | translate }}</th>
                <td mat-cell *matCellDef="let t">
                  <span class="status-badge" [class]="'status-' + t.status">
                    {{ t.status === 'missing' ? ('admin.dashboard.missing' | translate) : t.totalHours + 'h' }}
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            @if ((targets$ | async)?.length === 0) {
              <div class="empty-state">
                <mat-icon>check_circle</mat-icon>
                <h3>{{ 'admin.reminders.noReminders' | translate }}</h3>
              </div>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .admin-reminders { max-width: 1000px; margin: 0 auto; }
    table { width: 100%; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
  `],
})
export class AdminRemindersComponent implements OnInit {
  private store = inject(Store);

  targets$ = this.store.select(selectReminderTargets);
  isLoading$ = this.store.select(selectRemindersLoading);
  selectedWeek$ = this.store.select(selectSelectedWeek);

  displayedColumns = ['userName', 'userEmail', 'phoneNumber', 'status'];

  ngOnInit(): void {
    this.store.dispatch(AdminActions.loadReminderTargets({}));
  }
}
