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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
    MatDatepickerModule,
    MatNativeDateModule,
    TranslateModule,
  ],
  template: `
    <div class="admin-circle-detail page-container">
      <a routerLink="/admin/circles" class="back-link">
        <mat-icon>arrow_back</mat-icon> {{ 'admin.circleDetail.backToCircles' | translate }}
      </a>

      @if (circle(); as c) {
        <h1>{{ c.name }}</h1>
        @if (c.description) {
          <p class="circle-description">{{ c.description }}</p>
        }

        <!-- Add member section -->
        <mat-card class="add-member-card">
          <mat-card-header>
            <mat-card-title>{{ 'admin.circleDetail.addMember' | translate }}</mat-card-title>
            <mat-card-subtitle>{{ availableUsersCount() }} {{ 'admin.circleDetail.usersAvailable' | translate }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="add-member">
              <mat-form-field appearance="outline" class="add-member-field">
                <mat-label>{{ 'admin.circleDetail.searchUsers' | translate }}</mat-label>
                <input
                  matInput
                  [formControl]="addMemberControl"
                  [matAutocomplete]="auto"
                  [placeholder]="'admin.circleDetail.searchPlaceholder' | translate"
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
                    <mat-option disabled>{{ 'admin.users.noUsers' | translate }}</mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Current members section -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ 'admin.circleDetail.currentMembers' | translate }} ({{ memberCount() }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>

            @if (membersLoading()) {
              <div class="loading-container"><mat-spinner diameter="32"></mat-spinner></div>
            } @else {
              <table mat-table [dataSource]="members()">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.name' | translate }}</th>
                  <td mat-cell *matCellDef="let m">{{ m.userName }}</td>
                </ng-container>
                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.users.email' | translate }}</th>
                  <td mat-cell *matCellDef="let m">{{ m.userEmail }}</td>
                </ng-container>
                <ng-container matColumnDef="trackingStartDate">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.circleDetail.trackingStart' | translate }}</th>
                  <td mat-cell *matCellDef="let m">
                    <div class="tracking-date-cell">
                      @if (editingMemberId() === m.userId) {
                        <mat-form-field appearance="outline" class="tracking-date-field">
                          <input
                            matInput
                            [matDatepicker]="picker"
                            [value]="getTrackingDate(m)"
                            (dateChange)="onTrackingDateChange($event, m)"
                          />
                          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                          <mat-datepicker #picker></mat-datepicker>
                        </mat-form-field>
                        <button mat-icon-button (click)="cancelEditTrackingDate()">
                          <mat-icon>close</mat-icon>
                        </button>
                      } @else {
                        <span>{{ formatDate(m.trackingStartDate) }}</span>
                        <button
                          mat-icon-button
                          (click)="startEditTrackingDate(m)"
                          [matTooltip]="'admin.circleDetail.editTrackingStart' | translate"
                        >
                          <mat-icon>edit</mat-icon>
                        </button>
                      }
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.actions' | translate }}</th>
                  <td mat-cell *matCellDef="let m">
                    <div class="action-buttons">
                      <button
                        mat-icon-button
                        color="primary"
                        (click)="onBackfillHours(m)"
                        [attr.aria-label]="'Backfill hours for ' + m.userName"
                        [matTooltip]="'admin.circleDetail.backfillHours' | translate"
                      >
                        <mat-icon>history</mat-icon>
                      </button>
                      <button
                        mat-icon-button
                        color="warn"
                        (click)="onRemoveMember(m)"
                        [disabled]="actionLoading()"
                        [attr.aria-label]="'Remove ' + m.userName"
                        [matTooltip]="'admin.circleDetail.removeMember' | translate"
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
                    {{ 'admin.circleDetail.noMembers' | translate }}
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
    .admin-circle-detail { max-width: 1000px; margin: 0 auto; }
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
    .mat-column-trackingStartDate { width: 220px; }
    .action-buttons { display: flex; justify-content: flex-end; gap: 4px; }
    .tracking-date-cell {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .tracking-date-field {
      width: 140px;
      font-size: 12px;
    }
    .tracking-date-field ::ng-deep .mat-mdc-form-field-infix {
      padding-top: 8px;
      padding-bottom: 8px;
      min-height: 36px;
    }
  `],
})
export class AdminCircleDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AdminCircleDetailService);
  private translate = inject(TranslateService);
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
  editingMemberId = signal<string | null>(null);

  addMemberControl = new FormControl<string | AvailableUser>('', { nonNullable: false });
  displayedColumns = ['name', 'email', 'trackingStartDate', 'actions'];

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

  formatDate(dateStr: string): string {
    const lang = this.translate.currentLang || 'en';
    return new Date(dateStr).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getTrackingDate(member: CircleMember): Date {
    return new Date(member.trackingStartDate);
  }

  startEditTrackingDate(member: CircleMember): void {
    this.editingMemberId.set(member.userId);
  }

  cancelEditTrackingDate(): void {
    this.editingMemberId.set(null);
  }

  onTrackingDateChange(event: any, member: CircleMember): void {
    const newDate = event.value as Date;
    if (!newDate) return;

    const dateStr = newDate.toISOString().split('T')[0];
    this.actionLoading.set(true);
    this.error.set(null);

    this.service
      .updateMembership(this.circleId, member.userId, { trackingStartDate: dateStr })
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error.set(err.error?.message || 'Failed to update tracking start date');
          return of(null);
        }),
      )
      .subscribe((res) => {
        this.actionLoading.set(false);
        this.editingMemberId.set(null);
        if (res !== null) {
          // Update the member in the list
          this.members.update((list) =>
            list.map((m) =>
              m.userId === member.userId
                ? { ...m, trackingStartDate: newDate.toISOString() }
                : m,
            ),
          );
        }
      });
  }
}
