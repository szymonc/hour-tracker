import { Component, OnInit, inject, input, output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';

import { AdminActions } from '../../../store/admin/admin.actions';
import {
  selectCircles,
  selectCirclesLoading,
  selectCirclesActionLoading,
  selectError,
} from '../../../store/admin/admin.reducer';

/** Table that receives circles via input so it updates when async pipe emits. */
@Component({
  selector: 'app-circles-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <table mat-table [dataSource]="dataSource">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let c">{{ c.name }}</td>
      </ng-container>
      <ng-container matColumnDef="isActive">
        <th mat-header-cell *matHeaderCellDef>Active</th>
        <td mat-cell *matCellDef="let c">{{ c.isActive !== false ? 'Yes' : 'No' }}</td>
      </ng-container>
      <ng-container matColumnDef="memberCount">
        <th mat-header-cell *matHeaderCellDef>Members</th>
        <td mat-cell *matCellDef="let c">{{ c.memberCount }}</td>
      </ng-container>
      <ng-container matColumnDef="totalHoursThisMonth">
        <th mat-header-cell *matHeaderCellDef>Hours (Month)</th>
        <td mat-cell *matCellDef="let c">{{ c.totalHoursThisMonth }}h</td>
      </ng-container>
      <ng-container matColumnDef="avgHoursPerMember">
        <th mat-header-cell *matHeaderCellDef>Avg/Member</th>
        <td mat-cell *matCellDef="let c">{{ c.avgHoursPerMember }}h</td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let c">
          <a
            mat-icon-button
            [routerLink]="['/admin/circles', c.id]"
            color="primary"
            [attr.aria-label]="'Manage members of ' + c.name"
          >
            <mat-icon>group</mat-icon>
          </a>
          <button
            mat-icon-button
            color="warn"
            (click)="removeCircle.emit(c)"
            [disabled]="actionLoading()"
            [attr.aria-label]="'Remove ' + c.name"
          >
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      <tr class="mat-row" *matNoDataRow>
        <td class="mat-cell" [attr.colspan]="displayedColumns.length">No circles yet. Add one above.</td>
      </tr>
    </table>
  `,
  styles: [`table { width: 100%; } .mat-column-actions { width: 80px; text-align: right; }`],
})
export class CirclesTableComponent implements OnChanges {
  circles = input<any[]>([]);
  actionLoading = input<boolean>(false);
  removeCircle = output<{ id: string; name: string }>();

  displayedColumns = ['name', 'isActive', 'memberCount', 'totalHoursThisMonth', 'avgHoursPerMember', 'actions'];
  dataSource = new MatTableDataSource<any>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['circles']) {
      this.dataSource.data = this.circles() ?? [];
    }
  }
}

@Component({
  selector: 'app-admin-circles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    CirclesTableComponent,
  ],
  template: `
    <div class="admin-circles page-container">
      <h1>Circles</h1>

      <!-- Add circle form -->
      <mat-card class="add-card">
        <mat-card-header>
          <mat-card-title>Add circle</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form class="add-form" (ngSubmit)="onAddCircle()">
            <mat-form-field appearance="outline" class="field-name">
              <mat-label>Name</mat-label>
              <input
                matInput
                [(ngModel)]="newName"
                name="newName"
                required
                maxlength="255"
                placeholder="Circle name"
                [disabled]="(actionLoading$ | async) ?? false"
              />
            </mat-form-field>
            <mat-form-field appearance="outline" class="field-desc">
              <mat-label>Description (optional)</mat-label>
              <input
                matInput
                [(ngModel)]="newDescription"
                name="newDescription"
                placeholder="Short description"
                [disabled]="(actionLoading$ | async) ?? false"
              />
            </mat-form-field>
            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="!newName.trim() || (actionLoading$ | async) ?? false"
            >
              @if (actionLoading$ | async) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>add</mat-icon> Add circle
              }
            </button>
          </form>
          @if (error$ | async; as err) {
            <p class="error-message">{{ err }}</p>
          }
        </mat-card-content>
      </mat-card>

      <!-- Circles table: data from async pipe so table updates when store emits -->
      <mat-card class="table-card">
        @if (isLoading$ | async) {
          <div class="loading-container"><mat-spinner></mat-spinner></div>
        }
        <app-circles-table
          [circles]="(circles$ | async) ?? []"
          [actionLoading]="(actionLoading$ | async) ?? false"
          (removeCircle)="onRemoveCircle($event)"
        />
      </mat-card>
    </div>
  `,
  styles: [`
    .admin-circles { max-width: 1000px; margin: 0 auto; }
    .add-card { margin-bottom: 24px; }
    .add-form {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 16px;
    }
    .add-form mat-form-field { flex: 1; min-width: 160px; }
    .field-name { max-width: 240px; }
    .field-desc { flex: 2; min-width: 200px; }
    .add-form button { margin-top: 8px; }
    .add-form button mat-spinner { display: inline-block; vertical-align: middle; margin-right: 8px; }
    .error-message { color: var(--mat-form-field-error-text-color, #b71c1c); margin-top: 8px; }
    .table-card { position: relative; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
  `],
})
export class AdminCirclesComponent implements OnInit {
  private store = inject(Store);

  circles$ = this.store.select(selectCircles);
  isLoading$ = this.store.select(selectCirclesLoading);
  actionLoading$ = this.store.select(selectCirclesActionLoading);
  error$ = this.store.select(selectError);

  newName = '';
  newDescription = '';

  ngOnInit(): void {
    this.store.dispatch(AdminActions.loadCircles());
  }

  onAddCircle(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.store.dispatch(AdminActions.createCircle({ name, description: this.newDescription.trim() || undefined }));
    this.newName = '';
    this.newDescription = '';
  }

  onRemoveCircle(c: { id: string; name: string }): void {
    if (!confirm(`Remove circle "${c.name}"? It will be deactivated and no longer appear in lists.`)) return;
    this.store.dispatch(AdminActions.deleteCircle({ id: c.id }));
  }
}
