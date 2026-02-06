import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthActions } from '../../../store/auth/auth.actions';
import { selectIsLoading, selectError } from '../../../store/auth/auth.selectors';

@Component({
  selector: 'app-first-time-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="profile-container">
      <mat-card class="profile-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>phone</mat-icon>
            Complete Your Profile
          </mat-card-title>
          <mat-card-subtitle>Please add your phone number to continue</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (error$ | async; as error) {
            <div class="error-message">{{ error }}</div>
          }

          <p class="info-text">
            Your phone number will be used for reminders about your weekly contribution hours.
          </p>

          <form [formGroup]="phoneForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>Phone Number</mat-label>
              <input
                matInput
                type="tel"
                formControlName="phoneNumber"
                placeholder="+34612345678"
              />
              <mat-hint>Use international format (e.g., +34612345678)</mat-hint>
              @if (phoneForm.get('phoneNumber')?.hasError('required')) {
                <mat-error>Phone number is required</mat-error>
              }
              @if (phoneForm.get('phoneNumber')?.hasError('pattern')) {
                <mat-error>Please use E.164 format (e.g., +34612345678)</mat-error>
              }
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="submit-button"
              [disabled]="phoneForm.invalid || (isLoading$ | async)"
            >
              @if (isLoading$ | async) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Continue
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .profile-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: linear-gradient(135deg, #e8f5e9 0%, #f3e5f5 100%);
    }

    .profile-card {
      max-width: 450px;
      width: 100%;
      padding: 24px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        color: var(--color-forest);
      }
    }

    .info-text {
      color: rgba(0, 0, 0, 0.7);
      margin-bottom: 24px;
    }

    .form-field-full {
      width: 100%;
    }

    .submit-button {
      width: 100%;
      height: 48px;
      font-size: 16px;
      margin-top: 16px;
    }

    .error-message {
      background-color: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
  `],
})
export class FirstTimeProfileComponent {
  private fb = inject(FormBuilder);
  private store = inject(Store);

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectError);

  phoneForm: FormGroup = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{1,14}$/)]],
  });

  onSubmit(): void {
    if (this.phoneForm.valid) {
      const { phoneNumber } = this.phoneForm.value;
      this.store.dispatch(AuthActions.updatePhone({ phoneNumber }));
    }
  }
}
