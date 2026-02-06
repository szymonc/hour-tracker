import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import {
  debounceTime,
  switchMap,
  catchError,
  startWith,
  takeUntil,
} from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  AdminCircleDetailService,
  CircleDetail,
  CircleMember,
  AvailableUser,
} from './admin-circle-detail.service';

@Component({
  selector: 'app-admin-circle-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatTooltipModule,
  ],
  template: `
    <div class="admin-circle-detail page-container">
      <a routerLink="/admin/circles" class="back-link">
        <mat-icon>arrow_back</mat-icon> Back to Circles
      </a>

      @if (circle(); as c) {
        <h1>{{ c.name }}</h1>
        @if (c.description) {
          <p class="circle-description">{{ c.description }}</p>
        }

        <!-- Add member section -->
        <mat-card class="add-member-card">
          <mat-card-header>
            <mat-card-title>Add Member</mat-card-title>
            <mat-card-subtitle>{{ availableUsersCount() }} users available to add</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="add-member">
              <mat-form-field appearance="outline" class="add-member-field">
                <mat-label>Search users</mat-label>
                <input
                  matInput
                  [formControl]="addMemberControl"
                  [matAutocomplete]="auto"
                  placeholder="Search by name or email..."
                />
                <mat-icon matSuffix>person_add</mat-icon>
                <mat-autocomplete
                  #auto="matAutocomplete"
                  [displayWith]="displayUserLabel"
                  (optionSelected)="onAddMemberSelected($event)"
                >
                  @for (u of availableUsers(); track u.id) {
                    <mat-option [value]="u">{{ u.name }} ({{ u.email }})</mat-option>
                  }
                  @empty {
                    <mat-option disabled>No users found</mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Current members section -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Current Members ({{ memberCount() }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>

            @if (membersLoading()) {
              <div class="loading-container"><mat-spinner diameter="32"></mat-spinner></div>
            } @else {
              <table mat-table [dataSource]="members()">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let m">{{ m.userName }}</td>
                </ng-container>
                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef>Email</th>
                  <td mat-cell *matCellDef="let m">{{ m.userEmail }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let m">
                    <div class="action-buttons">
                      <button
                        mat-icon-button
                        color="primary"
                        (click)="onBackfillHours(m)"
                        [attr.aria-label]="'Backfill hours for ' + m.userName"
                        matTooltip="Backfill hours"
                      >
                        <mat-icon>history</mat-icon>
                      </button>
                      <button
                        mat-icon-button
                        color="warn"
                        (click)="onRemoveMember(m)"
                        [disabled]="actionLoading()"
                        [attr.aria-label]="'Remove ' + m.userName"
                        matTooltip="Remove member"
                      >
                        <mat-icon>person_remove</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                <tr class="mat-row" *matNoDataRow>
                  <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                    No members yet. Add one above.
                  </td>
                </tr>
              </table>
            }

            @if (error()) {
              <p class="error-message">{{ error() }}</p>
            }
          </mat-card-content>
        </mat-card>
      } @else if (circleLoading()) {
        <div class="loading-container"><mat-spinner></mat-spinner></div>
      } @else if (circleError()) {
        <p class="error-message">{{ circleError() }}</p>
      }
    </div>
  `,
  styles: [`
    .admin-circle-detail { max-width: 900px; margin: 0 auto; }
    .add-member-card { margin-bottom: 24px; }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 16px;
      color: inherit;
      text-decoration: none;
    }
    .back-link:hover { text-decoration: underline; }
    .circle-description { color: var(--mat-body-medium-color, #666); margin-top: 0; margin-bottom: 24px; }
    .add-member { margin-bottom: 20px; }
    .add-member-field { width: 100%; max-width: 400px; }
    table { width: 100%; }
    .loading-container { display: flex; justify-content: center; padding: 32px; }
    .error-message { color: var(--mat-form-field-error-text-color, #b71c1c); margin-top: 12px; }
    .mat-column-actions { width: 120px; }
    .action-buttons { display: flex; justify-content: flex-end; gap: 4px; }
  `],
})
export class AdminCircleDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AdminCircleDetailService);
  private destroy$ = new Subject<void>();

  circle = signal<CircleDetail | null>(null);
  circleLoading = signal(true);
  circleError = signal<string | null>(null);
  members = signal<CircleMember[]>([]);
  memberCount = computed(() => this.members().length);
  membersLoading = signal(false);
  availableUsers = signal<AvailableUser[]>([]);
  availableUsersCount = computed(() => this.availableUsers().length);
  actionLoading = signal(false);
  error = signal<string | null>(null);

  addMemberControl = new FormControl<string | AvailableUser>('', { nonNullable: false });
  displayedColumns = ['name', 'email', 'actions'];

  private circleId = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.router.navigate(['/admin/circles']);
        return;
      }
      this.circleId = id;
      this.loadCircle();
      this.loadMembers();
      this.setupAddMemberSearch();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCircle(): void {
    this.circleLoading.set(true);
    this.circleError.set(null);
    this.service
      .getCircle(this.circleId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.circleError.set(err.error?.message || 'Failed to load circle');
          return of(null);
        }),
      )
      .subscribe((data) => {
        this.circleLoading.set(false);
        this.circle.set(data ?? null);
      });
  }

  private loadMembers(): void {
    this.membersLoading.set(true);
    this.error.set(null);
    this.service
      .getMembers(this.circleId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error.set(err.error?.message || 'Failed to load members');
          return of([]);
        }),
      )
      .subscribe((list) => {
        this.membersLoading.set(false);
        this.members.set(list);
      });
  }

  private setupAddMemberSearch(): void {
    this.addMemberControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        switchMap((value) => {
          const search = typeof value === 'string' ? value : value?.name ?? '';
          return this.service.getAvailableUsers(this.circleId, search || undefined);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((users) => this.availableUsers.set(users));
  }

  displayUserLabel = (value: AvailableUser | string | null): string => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return value?.name ? `${value.name} (${value.email})` : '';
  };

  onAddMemberSelected(event: MatAutocompleteSelectedEvent): void {
    const user = event.option.value as AvailableUser;
    if (!user?.id) return;
    this.actionLoading.set(true);
    this.error.set(null);
    this.addMemberControl.setValue('');
    this.service
      .addMember(this.circleId, user.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error.set(err.error?.message || 'Failed to add member');
          return of(null);
        }),
      )
      .subscribe((res) => {
        this.actionLoading.set(false);
        if (res !== null) this.loadMembers();
      });
  }

  onBackfillHours(member: CircleMember): void {
    const circle = this.circle();
    this.router.navigate(['/admin/backfill'], {
      queryParams: {
        userId: member.userId,
        userName: member.userName,
        userEmail: member.userEmail,
        circleId: this.circleId,
        circleName: circle?.name,
      },
    });
  }

  onRemoveMember(member: CircleMember): void {
    if (!confirm(`Remove ${member.userName} from this circle?`)) return;
    this.actionLoading.set(true);
    this.error.set(null);
    this.service
      .removeMember(this.circleId, member.userId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error.set(err.error?.message || 'Failed to remove member');
          return of(null);
        }),
      )
      .subscribe((res) => {
        this.actionLoading.set(false);
        if (res !== null) {
          this.members.update((list) =>
            list.filter((m) => m.userId !== member.userId),
          );
          // So the removed user appears in the add-member dropdown without reload
          const added: AvailableUser = {
            id: member.userId,
            name: member.userName,
            email: member.userEmail,
          };
          this.availableUsers.update((list) =>
            list.some((u) => u.id === added.id) ? list : [added, ...list],
          );
        }
      });
  }
}
