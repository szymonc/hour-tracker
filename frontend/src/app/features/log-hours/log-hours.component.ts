import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { filter, map } from 'rxjs/operators';

import { EntriesActions } from '../../store/entries/entries.actions';
import { CirclesActions } from '../../store/circles/circles.actions';
import { selectAllCircles } from '../../store/circles/circles.reducer';
import { entriesFeature } from '../../store/entries/entries.reducer';

@Component({
  selector: 'app-log-hours',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="log-hours-container page-container">
      <mat-card class="log-hours-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>add_circle</mat-icon>
            Log Hours
          </mat-card-title>
          <mat-card-subtitle>Record your contribution hours for the week</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="entryForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>Date</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="date" />
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
              <mat-hint>Select any date in the target week</mat-hint>
              @if (entryForm.get('date')?.hasError('required')) {
                <mat-error>Date is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>Circle</mat-label>
              <mat-select formControlName="circleId">
                @for (circle of circles$ | async; track circle.circleId) {
                  <mat-option [value]="circle.circleId">{{ circle.circleName }}</mat-option>
                }
              </mat-select>
              @if (entryForm.get('circleId')?.hasError('required')) {
                <mat-error>Circle is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>Hours</mat-label>
              <input
                matInput
                type="number"
                formControlName="hours"
                min="0"
                step="0.5"
              />
              <mat-hint>Use decimals for partial hours (e.g., 1.5)</mat-hint>
              @if (entryForm.get('hours')?.hasError('required')) {
                <mat-error>Hours is required</mat-error>
              }
              @if (entryForm.get('hours')?.hasError('min')) {
                <mat-error>Hours must be 0 or greater</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>Description</mat-label>
              <textarea
                matInput
                formControlName="description"
                rows="3"
                placeholder="What did you work on?"
              ></textarea>
              @if (entryForm.get('description')?.hasError('required')) {
                <mat-error>Description is required</mat-error>
              }
              @if (entryForm.get('description')?.hasError('maxlength')) {
                <mat-error>Description must be less than 2000 characters</mat-error>
              }
            </mat-form-field>

            @if (showReasonField) {
              <mat-form-field appearance="outline" class="form-field-full reason-field">
                <mat-label>Reason for 0 hours</mat-label>
                <textarea
                  matInput
                  formControlName="zeroHoursReason"
                  rows="2"
                  placeholder="Why are you logging 0 hours this week?"
                ></textarea>
                <mat-hint>Required when logging 0 hours</mat-hint>
                @if (entryForm.get('zeroHoursReason')?.hasError('required')) {
                  <mat-error>Reason is required when logging 0 hours</mat-error>
                }
              </mat-form-field>
            }

            <div class="form-actions">
              <button mat-button type="button" routerLink="/app/dashboard">Cancel</button>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="entryForm.invalid || (isLoading$ | async)"
              >
                @if (isLoading$ | async) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Log Hours
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .log-hours-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .log-hours-card {
      padding: 16px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        color: var(--color-forest);
      }
    }

    .form-field-full {
      width: 100%;
      margin-bottom: 8px;
    }

    .reason-field {
      background-color: #fff3e0;
      border-radius: 4px;
      padding: 8px;
      margin-bottom: 16px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
  `],
})
export class LogHoursComponent implements OnInit {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private snackBar = inject(MatSnackBar);

  circles$ = this.store.select(selectAllCircles);
  createStatus$ = this.store.select(entriesFeature.selectCreateStatus);
  isLoading$ = this.store.select(entriesFeature.selectCreateStatus).pipe(
    map(status => status === 'loading')
  );

  entryForm: FormGroup = this.fb.group({
    date: [new Date(), Validators.required],
    circleId: ['', Validators.required],
    hours: [null, [Validators.required, Validators.min(0)]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    zeroHoursReason: [''],
  });

  get showReasonField(): boolean {
    return this.entryForm.get('hours')?.value === 0;
  }

  ngOnInit(): void {
    this.store.dispatch(CirclesActions.loadUserCircles());

    // Watch for hours changes to toggle reason field requirement
    this.entryForm.get('hours')?.valueChanges.subscribe((hours) => {
      const reasonControl = this.entryForm.get('zeroHoursReason');
      if (hours === 0) {
        reasonControl?.setValidators([Validators.required, Validators.maxLength(500)]);
      } else {
        reasonControl?.clearValidators();
        reasonControl?.setValue('');
      }
      reasonControl?.updateValueAndValidity();
    });

    // Watch for success/error
    this.createStatus$.pipe(
      filter((status) => status === 'success' || status === 'error')
    ).subscribe((status) => {
      if (status === 'success') {
        this.snackBar.open('Hours logged successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.entryForm.reset({ date: new Date() });
        this.store.dispatch(EntriesActions.resetCreateStatus());
      }
    });
  }

  onSubmit(): void {
    if (this.entryForm.valid) {
      const { date, circleId, hours, description, zeroHoursReason } = this.entryForm.value;

      this.store.dispatch(
        EntriesActions.createEntry({
          entry: {
            date: date.toISOString().split('T')[0],
            circleId,
            hours: Number(hours),
            description,
            ...(hours === 0 && zeroHoursReason ? { zeroHoursReason } : {}),
          },
        })
      );
    }
  }
}
