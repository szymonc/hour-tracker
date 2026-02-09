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
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  AdminUserDetailService,
  UserDetail,
  UserEntry,
  UserEntriesResponse,
} from './admin-user-detail.service';

@Component({
  selector: 'app-admin-user-detail',
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
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <div class="admin-user-detail page-container">
      <a routerLink="/admin/users" class="back-link">
        <mat-icon>arrow_back</mat-icon> {{ 'admin.userDetail.backToUsers' | translate }}
      </a>

      @if (userLoading()) {
        <div class="loading-container"><mat-spinner></mat-spinner></div>
      } @else if (userError()) {
        <p class="error-message">{{ userError() }}</p>
      } @else if (user()) {
        <h1>{{ user()!.name }}</h1>

        <!-- Profile Card -->
        <mat-card class="profile-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="profile-icon">person</mat-icon>
            <mat-card-title>{{ 'admin.userDetail.profile' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="profile-grid">
              <div class="profile-field">
                <span class="label">{{ 'admin.users.email' | translate }}</span>
                <span>{{ user()!.email }}</span>
              </div>
              <div class="profile-field">
                <span class="label">{{ 'admin.users.phone' | translate }}</span>
                <span>{{ user()!.phoneNumber || '-' }}</span>
              </div>
              <div class="profile-field">
                <span class="label">{{ 'admin.userDetail.role' | translate }}</span>
                <span class="role-badge" [class]="'role-' + user()!.role">{{ user()!.role }}</span>
              </div>
              <div class="profile-field">
                <span class="label">{{ 'admin.userDetail.status' | translate }}</span>
                <span>
                  <span class="status-chip" [class.active]="user()!.isActive" [class.inactive]="!user()!.isActive">
                    {{ user()!.isActive ? ('admin.userDetail.active' | translate) : ('admin.userDetail.inactive' | translate) }}
                  </span>
                  <span class="status-chip" [class.approved]="user()!.isApproved" [class.not-approved]="!user()!.isApproved">
                    {{ user()!.isApproved ? ('admin.userDetail.approved' | translate) : ('admin.userDetail.notApproved' | translate) }}
                  </span>
                </span>
              </div>
              <div class="profile-field">
                <span class="label">{{ 'admin.userDetail.telegram' | translate }}</span>
                <span [class.connected]="user()!.telegramChatId" [class.not-connected]="!user()!.telegramChatId">
                  {{ user()!.telegramChatId ? ('admin.userDetail.telegramConnected' | translate) : ('admin.userDetail.telegramNotConnected' | translate) }}
                </span>
              </div>
              <div class="profile-field">
                <span class="label">{{ 'admin.userDetail.memberSince' | translate }}</span>
                <span>{{ formatDate(user()!.createdAt) }}</span>
              </div>
              <div class="profile-field full-width">
                <span class="label">{{ 'admin.userDetail.circles' | translate }}</span>
                @if (userCircles().length > 0) {
                  <div class="circle-chips">
                    @for (c of userCircles(); track c.id) {
                      <a [routerLink]="['/admin/circles', c.id]" class="circle-chip">{{ c.name }}</a>
                    }
                  </div>
                } @else {
                  <span class="muted">{{ 'admin.userDetail.noCircles' | translate }}</span>
                }
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Missing hours alert -->
        @if (hasMissingHours()) {
          <mat-card class="alert-card">
            <mat-card-content>
              <div class="alert-row">
                <mat-icon color="warn">warning</mat-icon>
                <span>{{ 'admin.userDetail.missingHoursAlert' | translate }}</span>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Add Entry Section -->
        <mat-card class="add-entry-card">
          <mat-card-header class="clickable" (click)="showAddEntry.set(!showAddEntry())">
            <mat-card-title>
              <mat-icon>{{ showAddEntry() ? 'expand_less' : 'add' }}</mat-icon>
              {{ showAddEntry() ? ('admin.userDetail.addEntryCollapse' | translate) : ('admin.userDetail.addEntry' | translate) }}
            </mat-card-title>
          </mat-card-header>
          @if (showAddEntry()) {
            <mat-card-content>
              <form [formGroup]="addEntryForm" (ngSubmit)="onSubmitEntry()">
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>{{ 'admin.userDetail.circle' | translate }}</mat-label>
                    <mat-select formControlName="circleId">
                      @for (c of userCircles(); track c.id) {
                        <mat-option [value]="c.id">{{ c.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>{{ 'admin.backfill.date' | translate }}</mat-label>
                    <input matInput [matDatepicker]="picker" formControlName="date" />
                    <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                    <mat-datepicker #picker></mat-datepicker>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>{{ 'admin.userDetail.hours' | translate }}</mat-label>
                    <input matInput type="number" formControlName="hours" min="0" max="99.99" step="0.25" />
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'admin.userDetail.description' | translate }}</mat-label>
                  <textarea matInput formControlName="description" rows="2"
                    [placeholder]="'admin.backfill.descriptionPlaceholder' | translate"></textarea>
                </mat-form-field>

                @if (addEntryForm.get('hours')?.value === 0) {
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ 'admin.backfill.zeroHoursReason' | translate }}</mat-label>
                    <textarea matInput formControlName="zeroHoursReason" rows="2"
                      [placeholder]="'admin.backfill.zeroHoursReasonPlaceholder' | translate"></textarea>
                  </mat-form-field>
                }

                <div class="form-actions">
                  <button mat-raised-button color="primary" type="submit"
                    [disabled]="addEntryForm.invalid || addEntryLoading()">
                    @if (addEntryLoading()) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <mat-icon>add</mat-icon>
                      {{ 'admin.backfill.createEntry' | translate }}
                    }
                  </button>
                </div>
              </form>
            </mat-card-content>
          }
        </mat-card>

        <!-- Entries Section -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ 'admin.userDetail.entries' | translate }} ({{ entriesTotalItems() }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <!-- Filters -->
            <div class="filter-row">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>{{ 'admin.userDetail.filterByCircle' | translate }}</mat-label>
                <mat-select (selectionChange)="onCircleFilterChange($event.value)" [value]="''">
                  <mat-option value="">{{ 'admin.userDetail.allCircles' | translate }}</mat-option>
                  @for (c of userCircles(); track c.id) {
                    <mat-option [value]="c.id">{{ c.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            @if (entriesLoading()) {
              <div class="loading-container"><mat-spinner diameter="32"></mat-spinner></div>
            } @else {
              <table mat-table [dataSource]="entries()">
                <ng-container matColumnDef="weekStartDate">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.userDetail.week' | translate }}</th>
                  <td mat-cell *matCellDef="let e" [class.voided]="e.voidedAt">{{ e.weekStartDate }}</td>
                </ng-container>
                <ng-container matColumnDef="circleName">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.userDetail.circle' | translate }}</th>
                  <td mat-cell *matCellDef="let e" [class.voided]="e.voidedAt">{{ e.circleName }}</td>
                </ng-container>
                <ng-container matColumnDef="hours">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.userDetail.hours' | translate }}</th>
                  <td mat-cell *matCellDef="let e" [class.voided]="e.voidedAt">{{ e.hours }}h</td>
                </ng-container>
                <ng-container matColumnDef="description">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.userDetail.description' | translate }}</th>
                  <td mat-cell *matCellDef="let e" [class.voided]="e.voidedAt" class="desc-cell">{{ e.description }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.userDetail.entryStatus' | translate }}</th>
                  <td mat-cell *matCellDef="let e">
                    @if (e.voidedAt) {
                      <span class="void-badge"
                        [matTooltip]="getVoidTooltip(e)">
                        {{ 'admin.userDetail.voidedEntry' | translate }}
                      </span>
                    } @else {
                      <span class="active-badge">{{ 'admin.userDetail.activeEntry' | translate }}</span>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>{{ 'admin.userDetail.actions' | translate }}</th>
                  <td mat-cell *matCellDef="let e">
                    @if (!e.voidedAt) {
                      <button mat-icon-button color="warn" (click)="onVoidEntry(e)"
                        [disabled]="voidLoading()"
                        [matTooltip]="'admin.userDetail.voidButton' | translate">
                        <mat-icon>block</mat-icon>
                      </button>
                    }
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="entryColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: entryColumns;"></tr>
                <tr class="mat-row" *matNoDataRow>
                  <td class="mat-cell" [attr.colspan]="entryColumns.length">
                    {{ 'admin.userDetail.noEntries' | translate }}
                  </td>
                </tr>
              </table>

              <mat-paginator
                [length]="entriesTotalItems()"
                [pageSize]="20"
                [pageSizeOptions]="[10, 20, 50]"
                (page)="onPageChange($event)"
              ></mat-paginator>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .admin-user-detail { max-width: 1100px; margin: 0 auto; }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 16px;
      color: inherit;
      text-decoration: none;
    }
    .back-link:hover { text-decoration: underline; }
    h1 { margin-bottom: 24px; }
    mat-card { margin-bottom: 24px; }
    .profile-card .profile-icon {
      background-color: #3f51b5;
      color: white;
      padding: 8px;
      border-radius: 50%;
      font-size: 24px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 16px;
    }
    .profile-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .profile-field.full-width { grid-column: span 2; }
    .profile-field .label {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      text-transform: uppercase;
    }
    .role-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .role-admin { background-color: #e8eaf6; color: #283593; }
    .role-user { background-color: #e8f5e9; color: #2e7d32; }
    .status-chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      margin-right: 8px;
    }
    .status-chip.active { background-color: #e8f5e9; color: #2e7d32; }
    .status-chip.inactive { background-color: #ffebee; color: #c62828; }
    .status-chip.approved { background-color: #e8f5e9; color: #2e7d32; }
    .status-chip.not-approved { background-color: #fff3e0; color: #e65100; }
    .connected { color: #2e7d32; }
    .not-connected { color: rgba(0, 0, 0, 0.4); }
    .circle-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .circle-chip {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      background-color: #e8eaf6;
      color: #3f51b5;
      text-decoration: none;
      font-size: 13px;
    }
    .circle-chip:hover { background-color: #c5cae9; }
    .muted { color: rgba(0, 0, 0, 0.4); }

    .alert-card { border-left: 4px solid #ff9800; background-color: #fff8e1; }
    .alert-row { display: flex; align-items: center; gap: 8px; }

    .add-entry-card mat-card-header { cursor: pointer; }
    .clickable { cursor: pointer; }
    .form-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .form-row mat-form-field { flex: 1; min-width: 180px; }
    .full-width { width: 100%; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
    .form-actions button { display: flex; align-items: center; gap: 8px; }

    .filter-row { display: flex; gap: 16px; margin-bottom: 8px; }
    .filter-field { min-width: 200px; }
    table { width: 100%; }
    .loading-container { display: flex; justify-content: center; padding: 32px; }
    .error-message { color: var(--mat-form-field-error-text-color, #b71c1c); margin-top: 12px; }

    .voided { text-decoration: line-through; color: rgba(0, 0, 0, 0.4); }
    .void-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      background-color: #ffebee;
      color: #c62828;
      cursor: help;
    }
    .active-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      background-color: #e8f5e9;
      color: #2e7d32;
    }
    .desc-cell { max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mat-column-actions { width: 80px; }

    @media (max-width: 768px) {
      .profile-grid { grid-template-columns: 1fr; }
      .profile-field.full-width { grid-column: span 1; }
    }
  `],
})
export class AdminUserDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AdminUserDetailService);
  private translate = inject(TranslateService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private destroy$ = new Subject<void>();

  user = signal<UserDetail | null>(null);
  userLoading = signal(true);
  userError = signal<string | null>(null);

  entries = signal<UserEntry[]>([]);
  entriesLoading = signal(false);
  entriesTotalItems = signal(0);

  hasMissingHours = signal(false);
  showAddEntry = signal(false);
  addEntryLoading = signal(false);
  voidLoading = signal(false);

  userCircles = computed(() => this.user()?.circles ?? []);

  entryColumns = ['weekStartDate', 'circleName', 'hours', 'description', 'status', 'actions'];

  addEntryForm: FormGroup;
  private userId = '';
  private currentFilters: { circleId?: string; page?: number; pageSize?: number } = {};

  constructor() {
    this.addEntryForm = this.fb.group({
      circleId: ['', Validators.required],
      date: [new Date(), Validators.required],
      hours: [0, [Validators.required, Validators.min(0), Validators.max(99.99)]],
      description: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(2000)]],
      zeroHoursReason: [''],
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.router.navigate(['/admin/users']);
        return;
      }
      this.userId = id;
      this.loadUser();
      this.loadEntries();
    });

    this.setupZeroHoursValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUser(): void {
    this.userLoading.set(true);
    this.userError.set(null);
    this.service
      .getUser(this.userId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.userError.set(err.error?.message || 'Failed to load user');
          return of(null);
        }),
      )
      .subscribe((data) => {
        this.userLoading.set(false);
        this.user.set(data ?? null);
        if (data?.circles?.length) {
          this.addEntryForm.patchValue({ circleId: data.circles[0].id });
        }
      });
  }

  private loadEntries(): void {
    this.entriesLoading.set(true);
    this.service
      .getUserEntries(this.userId, this.currentFilters)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of({ entries: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } })),
      )
      .subscribe((data) => {
        this.entriesLoading.set(false);
        this.entries.set(data.entries);
        this.entriesTotalItems.set(data.pagination.totalItems);

        // Check for missing hours: if no active entries for the most recent week
        const activeEntries = data.entries.filter((e) => !e.voidedAt);
        this.hasMissingHours.set(activeEntries.length === 0 && data.pagination.totalItems === 0);
      });
  }

  private setupZeroHoursValidation(): void {
    this.addEntryForm.get('hours')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((hours) => {
        const ctrl = this.addEntryForm.get('zeroHoursReason')!;
        if (hours === 0) {
          ctrl.setValidators([Validators.required, Validators.minLength(1)]);
        } else {
          ctrl.clearValidators();
        }
        ctrl.updateValueAndValidity();
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

  getVoidTooltip(entry: UserEntry): string {
    const parts: string[] = [];
    if (entry.voidReason) parts.push(entry.voidReason);
    if (entry.voidedByName) parts.push(`${this.translate.instant('admin.userDetail.voidedBy')}: ${entry.voidedByName}`);
    if (entry.voidedAt) parts.push(`${this.translate.instant('admin.userDetail.voidedAt')}: ${this.formatDate(entry.voidedAt)}`);
    return parts.join('\n');
  }

  onCircleFilterChange(circleId: string): void {
    this.currentFilters = { ...this.currentFilters, circleId: circleId || undefined, page: 1 };
    this.loadEntries();
  }

  onPageChange(event: PageEvent): void {
    this.currentFilters = { ...this.currentFilters, page: event.pageIndex + 1, pageSize: event.pageSize };
    this.loadEntries();
  }

  onSubmitEntry(): void {
    if (this.addEntryForm.invalid || !this.userId) return;
    this.addEntryLoading.set(true);

    const val = this.addEntryForm.value;
    const date = val.date as Date;

    this.service
      .createEntryForUser({
        userId: this.userId,
        circleId: val.circleId,
        date: date.toISOString().split('T')[0],
        hours: val.hours,
        description: val.description,
        zeroHoursReason: val.hours === 0 ? val.zeroHoursReason : undefined,
      })
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.snackBar.open(
            err.error?.message || this.translate.instant('admin.userDetail.addEntryFailed'),
            this.translate.instant('common.close'),
            { duration: 5000 },
          );
          return of(null);
        }),
      )
      .subscribe((res) => {
        this.addEntryLoading.set(false);
        if (res !== null) {
          this.snackBar.open(
            this.translate.instant('admin.userDetail.addEntrySuccess'),
            this.translate.instant('common.close'),
            { duration: 3000 },
          );
          this.addEntryForm.patchValue({ hours: 0, description: '', zeroHoursReason: '' });
          this.loadEntries();
        }
      });
  }

  onVoidEntry(entry: UserEntry): void {
    const reason = prompt(this.translate.instant('admin.userDetail.voidReason'));
    if (!reason) return;

    this.voidLoading.set(true);
    this.service
      .voidEntry(entry.id, reason)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.snackBar.open(
            err.error?.message || this.translate.instant('admin.userDetail.voidFailed'),
            this.translate.instant('common.close'),
            { duration: 5000 },
          );
          return of(null);
        }),
      )
      .subscribe((res) => {
        this.voidLoading.set(false);
        if (res !== null) {
          this.snackBar.open(
            this.translate.instant('admin.userDetail.voidSuccess'),
            this.translate.instant('common.close'),
            { duration: 3000 },
          );
          this.loadEntries();
        }
      });
  }
}
