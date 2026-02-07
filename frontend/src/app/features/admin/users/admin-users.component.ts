import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AdminActions } from '../../../store/admin/admin.actions';
import { selectUsers, selectUsersLoading, selectUsersPagination } from '../../../store/admin/admin.reducer';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    TranslateModule,
  ],
  template: `
    <div class="admin-users page-container">
      <h1>{{ 'admin.users.title' | translate }}</h1>

      <mat-card>
        <mat-card-content>
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>{{ 'admin.users.search' | translate }}</mat-label>
            <input matInput (input)="onSearch($event)" [placeholder]="'admin.users.search' | translate" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          @if (isLoading$ | async) {
            <div class="loading-container">
              <mat-spinner></mat-spinner>
            </div>
          } @else {
            <table mat-table [dataSource]="(users$ | async) ?? []">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.name' | translate }}</th>
                <td mat-cell *matCellDef="let user">{{ user.name }}</td>
              </ng-container>

              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.email' | translate }}</th>
                <td mat-cell *matCellDef="let user">{{ user.email }}</td>
              </ng-container>

              <ng-container matColumnDef="circles">
                <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.circles' | translate }}</th>
                <td mat-cell *matCellDef="let user">{{ user.circles?.join(', ') || '-' }}</td>
              </ng-container>

              <ng-container matColumnDef="phoneNumber">
                <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.phone' | translate }}</th>
                <td mat-cell *matCellDef="let user">{{ user.phoneNumber || '-' }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <mat-paginator
              [length]="(pagination$ | async)?.totalItems"
              [pageSize]="20"
              [pageSizeOptions]="[10, 20, 50]"
            ></mat-paginator>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .admin-users { max-width: 1200px; margin: 0 auto; }
    .search-field { width: 300px; margin-bottom: 16px; }
    table { width: 100%; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
  `],
})
export class AdminUsersComponent implements OnInit {
  private store = inject(Store);

  users$ = this.store.select(selectUsers);
  isLoading$ = this.store.select(selectUsersLoading);
  pagination$ = this.store.select(selectUsersPagination);

  displayedColumns = ['name', 'email', 'circles', 'phoneNumber'];

  ngOnInit(): void {
    this.store.dispatch(AdminActions.loadUsers({}));
  }

  onSearch(event: Event): void {
    const search = (event.target as HTMLInputElement).value;
    this.store.dispatch(AdminActions.loadUsers({ search }));
  }
}
