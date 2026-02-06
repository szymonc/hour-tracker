import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { EntriesActions } from '../../store/entries/entries.actions';
import { selectAllEntries, entriesFeature } from '../../store/entries/entries.reducer';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  template: `
    <div class="history-container page-container">
      <h1>Entry History</h1>

      <mat-card>
        @if (isLoading$ | async) {
          <div class="loading-container">
            <mat-spinner></mat-spinner>
          </div>
        } @else {
          <table mat-table [dataSource]="(entries$ | async) ?? []" class="entries-table">
            <ng-container matColumnDef="weekStartDate">
              <th mat-header-cell *matHeaderCellDef>Week</th>
              <td mat-cell *matCellDef="let entry">{{ formatDate(entry.weekStartDate) }}</td>
            </ng-container>

            <ng-container matColumnDef="circleName">
              <th mat-header-cell *matHeaderCellDef>Circle</th>
              <td mat-cell *matCellDef="let entry">{{ entry.circleName }}</td>
            </ng-container>

            <ng-container matColumnDef="hours">
              <th mat-header-cell *matHeaderCellDef>Hours</th>
              <td mat-cell *matCellDef="let entry">{{ entry.hours }}h</td>
            </ng-container>

            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let entry" class="description-cell">
                {{ entry.description | slice:0:50 }}{{ entry.description.length > 50 ? '...' : '' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          @if ((entries$ | async)?.length === 0) {
            <div class="empty-state">
              <mat-icon>history</mat-icon>
              <h3>No entries yet</h3>
              <p>Start logging hours to see your history here</p>
            </div>
          }

          <mat-paginator
            [length]="(pagination$ | async)?.totalItems"
            [pageSize]="(pagination$ | async)?.pageSize"
            [pageIndex]="(pagination$ | async)?.page! - 1"
            [pageSizeOptions]="[10, 20, 50]"
            (page)="onPageChange($event)"
          ></mat-paginator>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .history-container {
      max-width: 1000px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 24px;
    }

    .entries-table {
      width: 100%;
    }

    .description-cell {
      max-width: 300px;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
  `],
})
export class HistoryComponent implements OnInit {
  private store = inject(Store);

  entries$ = this.store.select(selectAllEntries);
  isLoading$ = this.store.select(entriesFeature.selectIsLoading);
  pagination$ = this.store.select(entriesFeature.selectPagination);

  displayedColumns = ['weekStartDate', 'circleName', 'hours', 'description'];

  ngOnInit(): void {
    this.store.dispatch(EntriesActions.loadEntries({}));
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  onPageChange(event: PageEvent): void {
    this.store.dispatch(EntriesActions.loadEntries({ page: event.pageIndex + 1 }));
  }
}
