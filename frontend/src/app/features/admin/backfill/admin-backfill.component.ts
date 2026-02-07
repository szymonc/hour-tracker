import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, filter, map, startWith } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AdminActions } from '../../../store/admin/admin.actions';
import { selectBackfillStatus, selectBackfillError } from '../../../store/admin/admin.reducer';

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface CircleOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-admin-backfill',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <div class="backfill-container">
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>history</mat-icon>
          <mat-card-title>{{ 'admin.backfill.title' | translate }}</mat-card-title>
          <mat-card-subtitle>{{ 'admin.backfill.subtitle' | translate }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'admin.backfill.searchUser' | translate }}</mat-label>
              <input
                matInput
                formControlName="userSearch"
                [matAutocomplete]="userAuto"
                [placeholder]="'admin.backfill.searchPlaceholder' | translate"
              />
              <mat-autocomplete
                #userAuto="matAutocomplete"
                [displayWith]="displayUser"
                (optionSelected)="onUserSelected($event)"
              >
                @for (user of filteredUsers$ | async; track user.id) {
                  <mat-option [value]="user">
                    {{ user.name }} ({{ user.email }})
                  </mat-option>
                }
              </mat-autocomplete>
              @if (form.get('userSearch')?.hasError('required') && form.get('userSearch')?.touched) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
            </mat-form-field>

            @if (selectedUser) {
              <div class="selected-user">
                <mat-icon>person</mat-icon>
                <span>{{ selectedUser.name }} ({{ selectedUser.email }})</span>
                <button mat-icon-button type="button" (click)="clearUser()">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'admin.backfill.selectCircle' | translate }}</mat-label>
              <mat-select formControlName="circleId">
                @for (circle of userCircles; track circle.id) {
                  <mat-option [value]="circle.id">{{ circle.name }}</mat-option>
                }
              </mat-select>
              @if (form.get('circleId')?.hasError('required') && form.get('circleId')?.touched) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
              @if (!selectedUser) {
                <mat-hint>{{ 'admin.backfill.selectUserFirst' | translate }}</mat-hint>
              }
              @if (selectedUser && userCircles.length === 0) {
                <mat-hint class="warn">{{ 'admin.backfill.noCircles' | translate }}</mat-hint>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'admin.backfill.date' | translate }}</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="date" />
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
              @if (form.get('date')?.hasError('required') && form.get('date')?.touched) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'admin.backfill.hours' | translate }}</mat-label>
              <input matInput type="number" formControlName="hours" min="0" max="99.99" step="0.25" />
              @if (form.get('hours')?.hasError('required') && form.get('hours')?.touched) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
              @if (form.get('hours')?.hasError('min')) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
              @if (form.get('hours')?.hasError('max')) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'admin.backfill.description' | translate }}</mat-label>
              <textarea
                matInput
                formControlName="description"
                rows="3"
                [placeholder]="'admin.backfill.descriptionPlaceholder' | translate"
              ></textarea>
              @if (form.get('description')?.hasError('required') && form.get('description')?.touched) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
              @if (form.get('description')?.hasError('minlength')) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
              @if (form.get('description')?.hasError('maxlength')) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
            </mat-form-field>

            @if (form.get('hours')?.value === 0) {
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'admin.backfill.zeroHoursReason' | translate }}</mat-label>
                <textarea
                  matInput
                  formControlName="zeroHoursReason"
                  rows="2"
                  [placeholder]="'admin.backfill.zeroHoursReasonPlaceholder' | translate"
                ></textarea>
                @if (form.get('zeroHoursReason')?.hasError('required') && form.get('zeroHoursReason')?.touched) {
                  <mat-error>{{ 'validation.required' | translate }}</mat-error>
                }
              </mat-form-field>
            }

            <div class="actions">
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="form.invalid || !selectedUser || (backfillStatus$ | async) === 'loading'"
              >
                @if ((backfillStatus$ | async) === 'loading') {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>add</mat-icon>
                  {{ 'admin.backfill.createEntry' | translate }}
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .backfill-container {
      max-width: 600px;
      margin: 0 auto;
    }

    mat-card-header {
      margin-bottom: 24px;

      mat-icon[mat-card-avatar] {
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
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .selected-user {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background-color: #e3f2fd;
      border-radius: 4px;
      margin-bottom: 16px;

      mat-icon {
        color: #1976d2;
      }

      span {
        flex: 1;
      }
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;

      button {
        display: flex;
        align-items: center;
        gap: 8px;

        mat-spinner {
          margin-right: 8px;
        }
      }
    }

    .warn {
      color: #f57c00;
    }
  `],
})
export class AdminBackfillComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private store = inject(Store);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  form: FormGroup;
  filteredUsers$!: Observable<UserOption[]>;
  selectedUser: UserOption | null = null;
  userCircles: CircleOption[] = [];
  backfillStatus$ = this.store.select(selectBackfillStatus);
  preselectedCircleId: string | null = null;

  constructor() {
    this.form = this.fb.group({
      userSearch: ['', Validators.required],
      circleId: ['', Validators.required],
      date: [new Date(), Validators.required],
      hours: [0, [Validators.required, Validators.min(0), Validators.max(99.99)]],
      description: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(2000)]],
      zeroHoursReason: [''],
    });
  }

  ngOnInit(): void {
    this.setupUserSearch();
    this.setupZeroHoursValidation();
    this.setupStatusListener();
    this.checkQueryParams();
  }

  private checkQueryParams(): void {
    const params = this.route.snapshot.queryParams;
    if (params['userId'] && params['userName'] && params['userEmail']) {
      const user: UserOption = {
        id: params['userId'],
        name: params['userName'],
        email: params['userEmail'],
      };
      this.selectedUser = user;
      this.form.patchValue({ userSearch: user });

      // Store preselected circle to set after loading user circles
      if (params['circleId']) {
        this.preselectedCircleId = params['circleId'];
      }

      // Load user's circles
      this.loadUserCircles(user.id);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.store.dispatch(AdminActions.resetBackfillStatus());
  }

  private setupUserSearch(): void {
    this.filteredUsers$ = this.form.get('userSearch')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => {
        if (typeof value !== 'string' || value.length < 2) {
          return of([]);
        }
        return this.http.get<{ users: UserOption[] }>(
          `${environment.apiUrl}/admin/users?search=${encodeURIComponent(value)}`
        ).pipe(
          map((response) => response.users || [])
        );
      })
    );
  }

  private setupZeroHoursValidation(): void {
    this.form.get('hours')!.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe((hours) => {
      const zeroReasonControl = this.form.get('zeroHoursReason')!;
      if (hours === 0) {
        zeroReasonControl.setValidators([Validators.required, Validators.minLength(1)]);
      } else {
        zeroReasonControl.clearValidators();
      }
      zeroReasonControl.updateValueAndValidity();
    });
  }

  private setupStatusListener(): void {
    this.store.select(selectBackfillStatus).pipe(
      takeUntil(this.destroy$),
      filter((status) => status === 'success' || status === 'error')
    ).subscribe((status) => {
      if (status === 'success') {
        this.snackBar.open('Entry created successfully', 'Close', { duration: 3000 });
        this.resetForm();
      } else {
        this.store.select(selectBackfillError).pipe(
          takeUntil(this.destroy$)
        ).subscribe((error) => {
          if (error) {
            this.snackBar.open(error, 'Close', { duration: 5000 });
          }
        });
      }
    });
  }

  displayUser(user: UserOption): string {
    return user ? `${user.name} (${user.email})` : '';
  }

  onUserSelected(event: any): void {
    const user = event.option.value as UserOption;
    this.selectedUser = user;
    this.loadUserCircles(user.id);
  }

  clearUser(): void {
    this.selectedUser = null;
    this.userCircles = [];
    this.preselectedCircleId = null;
    this.form.patchValue({ userSearch: '', circleId: '' });
  }

  private loadUserCircles(userId: string): void {
    this.http.get<{ circles: CircleOption[] }>(
      `${environment.apiUrl}/admin/users/${userId}/circles`
    ).subscribe({
      next: (response) => {
        this.userCircles = response.circles || [];
        // If there's a preselected circle from query params, use it
        if (this.preselectedCircleId && this.userCircles.some(c => c.id === this.preselectedCircleId)) {
          this.form.patchValue({ circleId: this.preselectedCircleId });
          this.preselectedCircleId = null; // Clear after use
        } else if (this.userCircles.length === 1) {
          this.form.patchValue({ circleId: this.userCircles[0].id });
        }
      },
      error: () => {
        this.userCircles = [];
        this.snackBar.open('Failed to load user circles', 'Close', { duration: 3000 });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.selectedUser) {
      return;
    }

    const formValue = this.form.value;
    const date = formValue.date as Date;

    this.store.dispatch(AdminActions.backfillEntry({
      userId: this.selectedUser.id,
      circleId: formValue.circleId,
      date: date.toISOString().split('T')[0],
      hours: formValue.hours,
      description: formValue.description,
      zeroHoursReason: formValue.hours === 0 ? formValue.zeroHoursReason : undefined,
    }));
  }

  private resetForm(): void {
    this.selectedUser = null;
    this.userCircles = [];
    this.form.reset({
      userSearch: '',
      circleId: '',
      date: new Date(),
      hours: 0,
      description: '',
      zeroHoursReason: '',
    });
    this.store.dispatch(AdminActions.resetBackfillStatus());
  }
}
